import fs from 'node:fs';
import readline from 'node:readline';
import { record_message } from '../database/operations/messages';
import {
	get_pending_transcripts,
	get_processing_position,
	update_processing_position,
	update_processing_status,
} from '../database/operations/processing-state';
import { start_tool_call } from '../database/operations/tool-calls';

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
					input?: any;
			  }>;
	};
	content?: string; // For system messages
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
				await process_single_message(
					session_id,
					message,
					message_index++,
				);

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

	// Extract content based on message structure
	if (message.message?.content) {
		if (typeof message.message.content === 'string') {
			content_preview = message.message.content.substring(0, 500);
		} else if (Array.isArray(message.message.content)) {
			for (const content_item of message.message.content) {
				if (content_item.type === 'text' && content_item.text) {
					content_preview += content_item.text.substring(0, 500);
					break;
				} else if (
					content_item.type === 'tool_use' &&
					content_item.name
				) {
					has_tool_calls = true;
					start_tool_call(session_id, content_item.name);
				}
			}
		}
	} else if (message.content && typeof message.content === 'string') {
		content_preview = message.content.substring(0, 500);
	}

	if (!content_preview.trim()) {
		return;
	}

	const role = message.type === 'system' ? 'system' : message.type;

	record_message(
		session_id,
		message_index,
		role,
		content_preview,
		undefined,
		undefined,
		undefined,
		has_tool_calls,
	);
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
