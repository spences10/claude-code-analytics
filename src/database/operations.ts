import path from 'node:path';
import { get_database } from './connection';
import type { ClaudeCodeData } from './types';

export function insert_hook_event(
	session_id: string,
	event_type: string,
	execution_time_ms: number,
	event_data: ClaudeCodeData,
	tool_name?: string,
): void {
	const db = get_database();

	try {
		const stmt = db.prepare(`
			INSERT INTO hook_events (session_id, event_type, timestamp, execution_time_ms, tool_name, event_data)
			VALUES (?, ?, ?, ?, ?, ?)
		`);

		stmt.run(
			session_id,
			event_type,
			new Date().toISOString(),
			execution_time_ms,
			tool_name || null,
			JSON.stringify(event_data),
		);
	} finally {
		db.close();
	}
}

export function insert_or_update_project(
	project_path: string,
	project_name: string,
): void {
	const db = get_database();

	try {
		const stmt = db.prepare(`
			INSERT OR IGNORE INTO projects (project_path, project_name)
			VALUES (?, ?)
		`);

		stmt.run(project_path, project_name);
	} finally {
		db.close();
	}
}

export function insert_or_update_session(data: ClaudeCodeData): void {
	if (!data.session_id || !data.cwd) return;

	const db = get_database();

	try {
		// Ensure project exists first
		const project_name = path.basename(data.cwd);
		insert_or_update_project(data.cwd, project_name);

		// Insert or update session
		const stmt = db.prepare(`
			INSERT OR REPLACE INTO sessions (
				session_id, project_id, transcript_path, model_id, model_display_name,
				claude_version, started_at, last_active_at, total_cost_usd,
				total_api_duration_ms, total_lines_added, total_lines_removed,
				exceeds_200k_tokens, session_source
			)
			SELECT ?, p.project_id, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
			FROM projects p WHERE p.project_path = ?
		`);

		stmt.run(
			data.session_id,
			data.transcript_path || '',
			data.model?.id || '',
			data.model?.display_name || '',
			data.version || '',
			new Date().toISOString(),
			new Date().toISOString(),
			data.cost?.total_cost_usd || 0,
			data.cost?.total_api_duration_ms || 0,
			data.cost?.total_lines_added || 0,
			data.cost?.total_lines_removed || 0,
			data.exceeds_200k_tokens || false,
			data.sessionSource || '',
			data.cwd,
		);
	} finally {
		db.close();
	}
}
