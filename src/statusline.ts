import fs from 'node:fs';
import { run_cli } from './cli/index';
import {
	is_data_collection_enabled,
	is_performance_logging_enabled,
} from './config/index';
import {
	insert_hook_event,
	insert_or_update_session,
	type ClaudeCodeData,
} from './database/index';

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

		// Core data collection (if enabled)
		if (
			hook_event_type &&
			data.session_id &&
			is_data_collection_enabled()
		) {
			// Handle session_start specifically
			if (hook_event_type === 'session_start') {
				insert_or_update_session(data);
			}

			// Performance logging (if enabled separately)
			if (is_performance_logging_enabled()) {
				insert_hook_event(
					data.session_id,
					hook_event_type,
					execution_time,
					data,
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
