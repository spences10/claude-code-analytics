import fs from 'node:fs';
import {
	end_session,
	end_tool_call_by_use_id,
	insert_or_update_session,
	record_file_operation,
	start_tool_call,
	update_session_metrics,
	type ClaudeCodeData,
} from '../database';
import {
	process_all_pending_transcripts,
	process_jsonl_transcript,
} from '../parsers/jsonl-parser';
import { hook_error } from '../utils/logger';

// Global map to track active tool calls
const active_tool_calls = new Map<string, number>();

// Hook event handlers
export const hook_event_handlers: Record<
	string,
	(data: ClaudeCodeData) => Promise<void>
> = {
	session_start: async (data: ClaudeCodeData) => {
		if (!data.session_id) return;

		// Just create basic session record, rich data comes from statusline
		insert_or_update_session(data);

		// Trigger JSONL processing for this session's transcript
		if (data.transcript_path && fs.existsSync(data.transcript_path)) {
			// Process in background to avoid blocking the hook
			process_jsonl_transcript(
				data.transcript_path,
				data.session_id,
			).catch((error) => {
				hook_error('Background JSONL processing failed:', error);
			});
		}
	},

	session_end: async (data: ClaudeCodeData) => {
		if (!data.session_id) return;

		end_session(data.session_id, data.end_reason);

		// Final JSONL processing to ensure all messages are captured
		if (data.transcript_path && fs.existsSync(data.transcript_path)) {
			// Process synchronously on session end to ensure completion
			await process_jsonl_transcript(
				data.transcript_path,
				data.session_id,
			).catch((error) => {
				hook_error('Final JSONL processing failed:', error);
			});
		}
	},

	session_stop: async (data: ClaudeCodeData) => {
		// Handle Claude Code session termination
		// This is called when Claude Code process stops
		if (data.session_id) {
			end_session(data.session_id, 'stopped');
		}

		// Clear any active tool call tracking
		active_tool_calls.clear();

		// Final cleanup - ensure any remaining transcript data is processed
		if (data.transcript_path && fs.existsSync(data.transcript_path)) {
			await process_jsonl_transcript(
				data.transcript_path,
				data.session_id || 'unknown',
			).catch((error) => {
				hook_error('Stop hook JSONL processing failed:', error);
			});
		}

		// Process any other pending transcripts
		await process_all_pending_transcripts().catch((error) => {
			hook_error(
				'Stop hook pending transcripts processing failed:',
				error,
			);
		});
	},

	user_prompt_submit: async (data: ClaudeCodeData) => {
		if (!data.session_id) return;

		// User message handling
		update_session_metrics(data);
		// Could extract message content from data if needed
	},

	pre_tool_use: async (data: ClaudeCodeData) => {
		if (!data.session_id) return;

		// Tool call start
		if (data.tool_name) {
			const tool_call_id = start_tool_call(
				data.session_id,
				data.tool_name,
				data.toolUseID,
			);
			if (tool_call_id && data.toolUseID) {
				active_tool_calls.set(data.toolUseID, tool_call_id);
			}
		}
		update_session_metrics(data);
	},

	post_tool_use: async (data: ClaudeCodeData) => {
		if (!data.session_id) return;

		// Tool call end
		if (data.toolUseID) {
			// Use the new function to end by tool_use_id
			end_tool_call_by_use_id(
				data.session_id,
				data.toolUseID,
				!data.error_message,
				data.error_message,
			);

			// Clean up the tracking map
			const tool_call_id = active_tool_calls.get(data.toolUseID);
			if (tool_call_id) {
				active_tool_calls.delete(data.toolUseID);
			}

			// Check for file operations from common tool names
			handle_file_operation(data, tool_call_id);
		}
		update_session_metrics(data);

		// Incremental JSONL processing after tool use
		if (data.transcript_path && fs.existsSync(data.transcript_path)) {
			// Process in background to avoid blocking the hook
			process_jsonl_transcript(
				data.transcript_path,
				data.session_id,
			).catch((error) => {
				hook_error('Incremental JSONL processing failed:', error);
			});
		}
	},

	default: async (data: ClaudeCodeData) => {
		if (!data.session_id) return;

		// For any other event types, just update activity timestamp
		update_session_metrics(data);
	},
};

export async function handle_hook_event(
	hook_event_type: string,
	data: ClaudeCodeData,
): Promise<void> {
	const handler =
		hook_event_handlers[hook_event_type] ||
		hook_event_handlers.default;
	await handler(data);
}

function handle_file_operation(
	data: ClaudeCodeData,
	tool_call_id?: number,
): void {
	if (!data.session_id || !data.tool_name || !data.file_path) return;

	if (data.tool_name.includes('Read')) {
		record_file_operation(
			data.session_id,
			data.file_path,
			'read',
			0,
			tool_call_id,
		);
	} else if (
		data.tool_name.includes('Write') ||
		data.tool_name.includes('Edit')
	) {
		record_file_operation(
			data.session_id,
			data.file_path,
			data.tool_name.includes('Edit') ? 'edit' : 'write',
			data.lines_changed || 0,
			tool_call_id,
		);
	}
}

// Export clear function for session cleanup
export function clear_active_tool_calls(): void {
	active_tool_calls.clear();
}
