import path from 'node:path';
import { get_database } from '../connection';
import type { ClaudeCodeData } from '../types';

export function insert_hook_event(
	session_id: string,
	event_type: string,
	execution_time_ms: number,
	event_data: ClaudeCodeData,
	tool_name?: string,
): void {
	try {
		const db = get_database();

		// Create lightweight performance-focused event data
		const performance_data = {
			execution_time_ms,
			tool_name: tool_name || null,
			success: !event_data.error_message,
			error_message: event_data.error_message || null,
			// Only include essential context, not full conversation data
			file_path: event_data.file_path || null,
			lines_changed: event_data.lines_changed || null,
		};

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
			JSON.stringify(performance_data),
		);

		db.close();
	} catch (error) {
		// Graceful fallback - log error but don't crash
		console.error('Failed to insert hook event:', error);
	}
}

export function insert_or_update_project(
	project_path: string,
	project_name: string,
): void {
	try {
		const db = get_database();

		const stmt = db.prepare(`
			INSERT OR IGNORE INTO projects (project_path, project_name)
			VALUES (?, ?)
		`);

		stmt.run(project_path, project_name);
		db.close();
	} catch (error) {
		console.error('Failed to insert/update project:', error);
	}
}

export function insert_or_update_session(data: ClaudeCodeData): void {
	if (!data.session_id || !data.cwd) return;

	try {
		const db = get_database();

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

		const params = [
			data.session_id,
			data.transcript_path || '',
			data.model?.id || '',
			data.model?.display_name || '',
			data.version || '',
			new Date().toISOString(),
			new Date().toISOString(),
			Number(data.cost?.total_cost_usd || 0),
			Number(data.cost?.total_api_duration_ms || 0),
			Number(data.cost?.total_lines_added || 0),
			Number(data.cost?.total_lines_removed || 0),
			data.exceeds_200k_tokens ? 1 : 0,
			String(data.sessionSource || data.session_source || ''),
			data.cwd,
		];

		stmt.run(...params);

		db.close();
	} catch (error) {
		console.error('Failed to insert/update session:', error);
	}
}

export function update_session_metrics(data: ClaudeCodeData): void {
	if (!data.session_id) return;

	try {
		const db = get_database();

		const stmt = db.prepare(`
			UPDATE sessions 
			SET last_active_at = ?, 
				total_cost_usd = COALESCE(?, total_cost_usd),
				total_api_duration_ms = COALESCE(?, total_api_duration_ms),
				total_lines_added = COALESCE(?, total_lines_added),
				total_lines_removed = COALESCE(?, total_lines_removed),
				exceeds_200k_tokens = COALESCE(?, exceeds_200k_tokens)
			WHERE session_id = ?
		`);

		stmt.run(
			new Date().toISOString(),
			data.cost?.total_cost_usd,
			data.cost?.total_api_duration_ms,
			data.cost?.total_lines_added,
			data.cost?.total_lines_removed,
			data.exceeds_200k_tokens,
			data.session_id,
		);

		db.close();
	} catch (error) {
		console.error('Failed to update session metrics:', error);
	}
}

export function end_session(
	session_id: string,
	end_reason?: string,
): void {
	if (!session_id) return;

	try {
		const db = get_database();

		// Calculate final duration based on started_at and current time
		const stmt = db.prepare(`
			UPDATE sessions 
			SET ended_at = ?,
				end_reason = ?,
				duration_ms = CAST((julianday(?) - julianday(started_at)) * 24 * 60 * 60 * 1000 AS INTEGER)
			WHERE session_id = ? AND ended_at IS NULL
		`);

		const now = new Date().toISOString();
		stmt.run(now, end_reason || 'normal', now, session_id);

		db.close();
	} catch (error) {
		console.error('Failed to end session:', error);
	}
}
