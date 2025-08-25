import fs from 'node:fs';
import { run_cli } from './cli';
import {
	is_data_collection_enabled,
	is_performance_logging_enabled,
} from './config';
import {
	end_session,
	end_tool_call_by_use_id,
	insert_hook_event,
	insert_or_update_session,
	record_file_operation,
	start_tool_call,
	update_session_metrics,
	type ClaudeCodeData,
} from './database';

// Global map to track active tool calls
const active_tool_calls = new Map<string, number>();

async function main() {
	const start_time = performance.now();

	// Determine hook event type from command line args
	const hook_event_type = process.argv[2];

	try {
		// Check for CLI mode first
		if (process.argv.includes('--config')) {
			await run_cli();
			return;
		}

		// Read JSON from stdin (Claude Code provides this)
		let input = '';

		// Check if there's data available on stdin
		if (process.stdin.isTTY) {
			// No stdin data, use command line arg for testing
			input = process.argv[3] || '{}';
		} else {
			// Read from stdin synchronously
			input = fs.readFileSync(process.stdin.fd, 'utf8').trim();
		}

		const data: ClaudeCodeData = JSON.parse(input);
		const execution_time = performance.now() - start_time;

		// Cache rich statusline data for hooks to use
		if (
			!hook_event_type &&
			data.session_id &&
			is_data_collection_enabled()
		) {
			// This is a statusline call with rich data - cache it
			insert_or_update_session(data);
		}

		// Hook event handling (if enabled)
		if (
			hook_event_type &&
			data.session_id &&
			is_data_collection_enabled()
		) {
			// Handle different hook event types
			switch (hook_event_type) {
				case 'session_start':
					// Just create basic session record, rich data comes from statusline
					insert_or_update_session(data);
					break;

				case 'session_end':
					end_session(data.session_id, data.end_reason);
					break;

				case 'user_prompt_submit':
					// User message handling
					update_session_metrics(data);
					// Could extract message content from data if needed
					break;

				case 'pre_tool_use':
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
					break;

				case 'post_tool_use':
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
						const tool_call_id = active_tool_calls.get(
							data.toolUseID,
						);
						if (tool_call_id) {
							active_tool_calls.delete(data.toolUseID);
						}

						// Check for file operations from common tool names
						if (
							data.tool_name &&
							data.tool_name.includes('Read') &&
							data.file_path
						) {
							record_file_operation(
								data.session_id,
								data.file_path,
								'read',
								0,
								tool_call_id,
							);
						} else if (
							data.tool_name &&
							(data.tool_name.includes('Write') ||
								data.tool_name.includes('Edit')) &&
							data.file_path
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
					update_session_metrics(data);
					break;

				default:
					// For any other event types, just update activity timestamp
					update_session_metrics(data);
					break;
			}

			// Performance logging (if enabled separately)
			if (is_performance_logging_enabled()) {
				insert_hook_event(
					data.session_id,
					hook_event_type,
					execution_time,
					data,
					data.tool_name,
				);
			}
		}

		// Simple output for now
		const parts = [];

		if (data.gitBranch) {
			parts.push(`🌿 ${data.gitBranch}`);
		}

		if (data.model?.display_name) {
			parts.push(`🤖 ${data.model.display_name}`);
		}

		if (data.cost?.total_cost_usd !== undefined) {
			parts.push(`💰 $${data.cost.total_cost_usd.toFixed(4)}`);
		}

		if (
			data.cost?.total_lines_added !== undefined ||
			data.cost?.total_lines_removed !== undefined
		) {
			const added = data.cost?.total_lines_added || 0;
			const removed = data.cost?.total_lines_removed || 0;
			parts.push(`📊 +${added}/-${removed}`);
		}

		// Only output statusline when not running as a hook
		if (!hook_event_type) {
			console.log(parts.join(' | ') || '⚡ Claude Code');
		}
	} catch (error) {
		// Only output error fallback when not running as a hook
		if (!hook_event_type) {
			console.log('⚡ Claude Code');
		}
	}
}

main();
