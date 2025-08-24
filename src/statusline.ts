import Database from 'better-sqlite3';
import path from 'node:path';
import { run_cli } from './cli/index.js';

interface ClaudeCodeData {
	session_id?: string;
	transcript_path?: string;
	cwd?: string;
	model?: {
		id: string;
		display_name: string;
	};
	workspace?: {
		current_dir: string;
		project_dir: string;
	};
	version?: string;
	cost?: {
		total_cost_usd: number;
		total_duration_ms: number;
		total_api_duration_ms: number;
		total_lines_added: number;
		total_lines_removed: number;
	};
	exceeds_200k_tokens?: boolean;
	[key: string]: any;
}

function get_db_path(): string {
	return path.join(
		process.env.HOME || '',
		'.claude',
		'claude-code-statusline.db',
	);
}

function write_to_database(
	hook_event_type: string,
	data: ClaudeCodeData,
	execution_time_ms: number,
): void {
	const db = new Database(get_db_path());

	try {
		// Insert hook event first (no foreign key constraint)
		if (data.session_id) {
			const insert_hook = db.prepare(`
				INSERT INTO hook_events (session_id, event_type, timestamp, execution_time_ms, event_data)
				VALUES (?, ?, ?, ?, ?)
			`);
			insert_hook.run(
				data.session_id,
				hook_event_type,
				new Date().toISOString(),
				execution_time_ms,
				JSON.stringify(data),
			);
		}

		// Handle session_start specifically
		if (hook_event_type === 'session_start' && data.session_id) {
			// Ensure project exists
			if (data.cwd) {
				const project_name = path.basename(data.cwd);
				const insert_project = db.prepare(`
					INSERT OR IGNORE INTO projects (project_path, project_name)
					VALUES (?, ?)
				`);
				insert_project.run(data.cwd, project_name);
			}

			// Insert or update session
			const insert_session = db.prepare(`
				INSERT OR REPLACE INTO sessions (
					session_id, project_id, transcript_path, model_id, model_display_name,
					claude_version, started_at, last_active_at, total_cost_usd,
					total_api_duration_ms, total_lines_added, total_lines_removed,
					exceeds_200k_tokens, session_source
				)
				SELECT ?, p.project_id, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
				FROM projects p WHERE p.project_path = ?
			`);
			insert_session.run(
				data.session_id,
				data.transcript_path || '',
				data.model?.id || '',
				data.model?.display_name || '',
				data.claude_version || '',
				new Date().toISOString(),
				new Date().toISOString(),
				data.cost?.total_cost_usd || 0,
				data.cost?.total_api_duration_ms || 0,
				data.cost?.total_lines_added || 0,
				data.cost?.total_lines_removed || 0,
				data.exceeds_200k_tokens || false,
				data.sessionSource || '',
				data.cwd || '',
			);
		}
	} finally {
		db.close();
	}
}

async function main() {
	const start_time = performance.now();

	try {
		// Check for CLI mode first
		if (process.argv.includes('--config')) {
			await run_cli();
			return;
		}

		// Determine hook event type from command line args
		const hook_event_type = process.argv[2];

		// Read JSON from stdin (Claude Code provides this)
		let input = '';

		// Check if there's data available on stdin
		if (process.stdin.isTTY) {
			// No stdin data, use command line arg for testing
			input = process.argv[3] || '{}';
		} else {
			// Read from stdin synchronously
			const fs = require('fs');
			input = fs.readFileSync(process.stdin.fd, 'utf8').trim();
		}

		const data: ClaudeCodeData = JSON.parse(input);
		const execution_time = performance.now() - start_time;

		// Write to database
		if (hook_event_type) {
			write_to_database(hook_event_type, data, execution_time);
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

		console.log(parts.join(' | ') || '⚡ Claude Code');
	} catch (error) {
		console.log('⚡ Claude Code');
	}
}

main();
