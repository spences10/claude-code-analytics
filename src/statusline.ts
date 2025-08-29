import fs from 'node:fs';
import { run_cli } from './cli';
import {
	is_data_collection_enabled,
	is_performance_logging_enabled,
} from './config';
import {
	insert_hook_event,
	insert_or_update_session,
	type ClaudeCodeData,
} from './database';
import { handle_hook_event } from './hooks/handlers';
import {
	process_all_pending_transcripts,
	process_jsonl_transcript,
} from './parsers/jsonl-parser';
import { build_statusline_parts } from './statusline/builder';

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

		// Check for JSONL processing commands
		if (process.argv.includes('--process-transcripts')) {
			console.log('Processing all pending JSONL transcripts...');
			await process_all_pending_transcripts();
			console.log('Transcript processing completed.');
			return;
		}

		if (process.argv.includes('--process-transcript')) {
			const transcript_path =
				process.argv[
					process.argv.indexOf('--process-transcript') + 1
				];
			const session_id =
				process.argv[
					process.argv.indexOf('--process-transcript') + 2
				];

			if (!transcript_path || !session_id) {
				console.error(
					'Usage: --process-transcript <transcript_path> <session_id>',
				);
				return;
			}

			console.log(
				`Processing JSONL transcript: ${transcript_path} for session ${session_id}`,
			);
			await process_jsonl_transcript(
				transcript_path,
				session_id,
				true,
			); // force reprocess
			console.log('Transcript processing completed.');
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
			await handle_hook_event(hook_event_type, data);

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

		// Enhanced statusline output
		const parts = build_statusline_parts(data);

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
