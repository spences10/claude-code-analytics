import fs from 'node:fs';
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

async function main() {
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
			input = process.argv[2] || '{}';
		} else {
			// Read from stdin synchronously
			const fs = require('fs');
			input = fs.readFileSync(process.stdin.fd, 'utf8').trim();
		}

		const data: ClaudeCodeData = JSON.parse(input);

		// Log raw data to file
		const log_path = path.join(
			__dirname,
			'..',
			'logs',
			'claude-code-data.log',
		);

		// Ensure logs directory exists
		const logs_dir = path.dirname(log_path);
		if (!fs.existsSync(logs_dir)) {
			fs.mkdirSync(logs_dir, { recursive: true });
		}

		fs.appendFileSync(log_path, input + '\n');

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
		// Log errors
		try {
			const logPath = path.join(
				__dirname,
				'..',
				'logs',
				'claude-code-data.log',
			);
			const logsDir = path.dirname(logPath);
			if (!fs.existsSync(logsDir)) {
				fs.mkdirSync(logsDir, { recursive: true });
			}
			fs.appendFileSync(logPath, `ERROR: ${error}\n`);
		} catch {
			// Ignore logging errors
		}

		console.log('⚡ Claude Code');
	}
}

main();
