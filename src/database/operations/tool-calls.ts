import { get_database } from '../connection';

export function start_tool_call(
	session_id: string,
	tool_name: string,
	tool_use_id?: string,
): number | null {
	if (!session_id || !tool_name) return null;

	try {
		const db = get_database();

		// Check if this tool call is already tracked by tool_use_id
		if (tool_use_id) {
			const existing = db
				.prepare(
					'SELECT tool_call_id FROM tool_calls WHERE session_id = ? AND tool_use_id = ?',
				)
				.get(session_id, tool_use_id) as
				| { tool_call_id: number }
				| undefined;

			if (existing) {
				db.close();
				return existing.tool_call_id;
			}
		}

		const stmt = db.prepare(`
			INSERT INTO tool_calls (session_id, tool_name, tool_use_id, started_at)
			VALUES (?, ?, ?, ?)
		`);

		const result = stmt.run(
			session_id,
			tool_name,
			tool_use_id || null,
			new Date().toISOString(),
		);

		db.close();
		return result.lastInsertRowid as number;
	} catch (error) {
		console.error('Failed to start tool call:', error);
		return null;
	}
}

export function end_tool_call(
	tool_call_id: number,
	success: boolean = true,
	error_message?: string,
): void {
	if (!tool_call_id) return;

	try {
		const db = get_database();

		const stmt = db.prepare(`
			UPDATE tool_calls 
			SET completed_at = ?,
				execution_time_ms = CAST((julianday(?) - julianday(started_at)) * 24 * 60 * 60 * 1000 AS INTEGER),
				success = ?,
				error_message = ?
			WHERE tool_call_id = ? AND completed_at IS NULL
		`);

		const now = new Date().toISOString();
		stmt.run(now, now, success, error_message || null, tool_call_id);

		db.close();
	} catch (error) {
		console.error('Failed to end tool call:', error);
	}
}

export function end_tool_call_by_use_id(
	session_id: string,
	tool_use_id: string,
	success: boolean = true,
	error_message?: string,
): void {
	if (!session_id || !tool_use_id) return;

	try {
		const db = get_database();

		const stmt = db.prepare(`
			UPDATE tool_calls 
			SET completed_at = ?,
				execution_time_ms = CAST((julianday(?) - julianday(started_at)) * 24 * 60 * 60 * 1000 AS INTEGER),
				success = ?,
				error_message = ?
			WHERE session_id = ? AND tool_use_id = ? AND completed_at IS NULL
		`);

		const now = new Date().toISOString();
		stmt.run(
			now,
			now,
			success ? 1 : 0,
			error_message || null,
			session_id,
			tool_use_id,
		);

		db.close();
	} catch (error) {
		console.error('Failed to end tool call by use_id:', error);
	}
}
