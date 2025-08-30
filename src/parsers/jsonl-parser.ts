import fs from 'node:fs';
import readline from 'node:readline';
import { record_file_operation } from '../database/operations/files';
import { record_message } from '../database/operations/messages';
import {
	get_pending_transcripts,
	get_processing_position,
	update_processing_position,
	update_processing_status,
} from '../database/operations/processing-state';
import {
	end_tool_call_by_use_id,
	start_tool_call,
} from '../database/operations/tool-calls';

interface ConversationMessage {
	type: 'user' | 'assistant' | 'system';
	message?: {
		role: 'user' | 'assistant';
		content?:
			| string
			| Array<{
					type: string;
					text?: string;
					name?: string;
					id?: string;
					tool_use_id?: string;
					input?: any;
					content?: any;
			  }>;
		usage?: {
			input_tokens?: number;
			output_tokens?: number;
			cache_creation_input_tokens?: number;
			cache_read_input_tokens?: number;
			cache_creation?: {
				ephemeral_5m_input_tokens?: number;
				ephemeral_1h_input_tokens?: number;
			};
		};
	};
	content?: string;
	uuid: string;
	timestamp?: string;
}

const BATCH_SIZE = 100;

export async function process_jsonl_transcript(
	transcript_path: string,
	session_id: string,
	force_reprocess: boolean = false,
): Promise<void> {
	if (!fs.existsSync(transcript_path)) {
		console.warn(`Transcript file not found: ${transcript_path}`);
		return;
	}

	try {
		const position_record = get_processing_position(transcript_path);
		if (!position_record) {
			console.error(
				`Could not get processing position for ${transcript_path}`,
			);
			return;
		}
		const start_position = force_reprocess
			? 0
			: position_record.last_processed_position;

		update_processing_status(transcript_path, 'processing');

		const file_stats = fs.statSync(transcript_path);
		if (start_position >= file_stats.size && !force_reprocess) {
			console.log(`Transcript already processed: ${transcript_path}`);
			return;
		}

		let current_position = start_position;
		let processed_count = 0;
		let message_index = 0;
		let conversation_message_index = 0;

		const file_stream = fs.createReadStream(transcript_path, {
			start: start_position,
			encoding: 'utf8',
		});

		const rl = readline.createInterface({
			input: file_stream,
			crlfDelay: Infinity,
		});

		for await (const line of rl) {
			try {
				if (!line.trim()) {
					current_position += line.length + 1;
					continue;
				}

				const message: ConversationMessage = JSON.parse(line);

				// Only increment conversation_message_index for non-system messages
				const should_record =
					message.type !== 'system' ||
					(message.content && message.content.trim());
				if (should_record) {
					await process_single_message(
						session_id,
						message,
						conversation_message_index++,
					);
				}

				message_index++; // Always increment for position tracking

				current_position += line.length + 1;
				processed_count++;

				// Update position periodically and yield control
				if (processed_count % BATCH_SIZE === 0) {
					update_processing_position(
						transcript_path,
						current_position,
					);
					await new Promise((resolve) => setImmediate(resolve));
				}
			} catch (parse_error) {
				console.error(`Failed to parse JSONL line: ${parse_error}`);
				current_position += line.length + 1;
				continue;
			}
		}

		update_processing_position(transcript_path, current_position);
		update_processing_status(transcript_path, 'completed');

		console.log(
			`Completed processing ${processed_count} messages from ${transcript_path}`,
		);
	} catch (error) {
		console.error(
			`Failed to process JSONL transcript ${transcript_path}:`,
			error,
		);
		update_processing_status(transcript_path, 'error');
	}
}

async function process_single_message(
	session_id: string,
	message: ConversationMessage,
	message_index: number,
): Promise<void> {
	let content_preview = '';
	let has_tool_calls = false;
	let tool_call_ids: number[] = [];

	// Extract content based on message structure
	if (message.message?.content) {
		if (typeof message.message.content === 'string') {
			content_preview = message.message.content.substring(0, 500);
		} else if (Array.isArray(message.message.content)) {
			for (const content_item of message.message.content) {
				if (content_item.type === 'text' && content_item.text) {
					content_preview += content_item.text.substring(0, 500);
				} else if (
					content_item.type === 'tool_use' &&
					content_item.name
				) {
					has_tool_calls = true;
					const tool_call_id = start_tool_call(
						session_id,
						content_item.name,
						content_item.id, // Pass the tool_use_id
					);
					if (tool_call_id) {
						tool_call_ids.push(tool_call_id);
					}

					// Track file operations based on tool name
					if (content_item.input?.file_path) {
						const operation_type = get_operation_type(
							content_item.name,
						);
						if (operation_type) {
							record_file_operation(
								session_id,
								content_item.input.file_path,
								operation_type,
								0, // We don't know lines changed yet
								tool_call_id || undefined,
							);
						}
					}
				} else if (
					content_item.type === 'tool_result' &&
					content_item.tool_use_id
				) {
					// End the tool call
					end_tool_call_by_use_id(
						session_id,
						content_item.tool_use_id,
						!content_item.content?.includes('error'), // Simple error detection
					);
				}
			}
		}
	} else if (message.content && typeof message.content === 'string') {
		content_preview = message.content.substring(0, 500);
	}

	if (!content_preview.trim() && !has_tool_calls) {
		return;
	}

	const role = message.type === 'system' ? 'system' : message.type;

	// Extract token usage data from assistant messages
	const usage = message.message?.usage;
	const token_count_input = usage?.input_tokens;
	const token_count_output = usage?.output_tokens;
	const cache_creation_input_tokens =
		usage?.cache_creation_input_tokens;
	const cache_read_input_tokens = usage?.cache_read_input_tokens;
	const cache_5m_tokens =
		usage?.cache_creation?.ephemeral_5m_input_tokens;
	const cache_1h_tokens =
		usage?.cache_creation?.ephemeral_1h_input_tokens;

	record_message(
		session_id,
		message_index,
		role,
		content_preview,
		token_count_input,
		token_count_output,
		undefined, // cost_usd - may be calculated elsewhere
		has_tool_calls,
		cache_creation_input_tokens,
		cache_read_input_tokens,
		cache_5m_tokens,
		cache_1h_tokens,
		message.timestamp,
	);
}

// Helper function to determine operation type from tool name
function get_operation_type(
	tool_name: string,
): 'read' | 'write' | 'edit' | null {
	const tool_lower = tool_name.toLowerCase();
	if (tool_lower === 'read') return 'read';
	if (tool_lower === 'write') return 'write';
	if (tool_lower === 'edit' || tool_lower === 'multiedit')
		return 'edit';
	return null;
}

export async function process_all_pending_transcripts(): Promise<void> {
	const pending_transcripts = get_pending_transcripts();

	for (const record of pending_transcripts) {
		if (fs.existsSync(record.transcript_path)) {
			console.log(
				`Processing pending transcript: ${record.transcript_path}`,
			);
			await process_jsonl_transcript(
				record.transcript_path,
				record.session_id,
			);
		}
	}
}
