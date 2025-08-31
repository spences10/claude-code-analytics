import fs from 'node:fs';
import { needs_onboarding, run_onboarding } from './cli/onboarding';
import { handle_cli } from './cli/router';
import {
	is_data_collection_enabled,
	is_performance_logging_enabled,
	load_config,
} from './config';
import {
	insert_hook_event,
	insert_or_update_session,
	type ClaudeCodeData,
} from './database';
import { handle_hook_event } from './hooks/handlers';
import { build_statusline_parts } from './statusline/builder';

const OUTPUT_CLAUDE_CODE_DATA = false;

async function main() {
	const start_time = performance.now();

	// Determine hook event type from command line args
	const hook_event_type = process.argv[2];

	try {
		// Route CLI commands first; if handled, exit before statusline logic
		const handled = await handle_cli(process.argv.slice(2));
		if (handled) return;

		// First-time onboarding for humans only (never for Claude hooks)
		if (process.stdin.isTTY && needs_onboarding()) {
			await run_onboarding();
			return;
		}

		// Legacy flags removed; CLI commands are handled by router above

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

		// Temporary: Log statusline data to see what we're missing
		if (!hook_event_type && OUTPUT_CLAUDE_CODE_DATA) {
			const log_data = {
				timestamp: new Date().toISOString(),
				data: data,
				argv: process.argv,
			};
			fs.appendFileSync(
				'statusline-data-log.json',
				JSON.stringify(log_data, null, 2) + '\n---\n',
			);
		}

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
			if (parts.length > 0) {
				// If using custom layout, parts are already formatted lines
				// If using default, parts are segments that need joining
				const config = load_config(data.workspace?.current_dir);
				if (config.display?.layout) {
					parts.forEach((line) => console.log(line));
				} else {
					console.log(parts.join(' | '));
				}
			} else {
				console.log('⚡ Claude Code');
			}
		}
	} catch (error) {
		// Only output error fallback when not running as a hook
		if (!hook_event_type) {
			console.log('⚡ Claude Code');
		}
	}
}

main();
