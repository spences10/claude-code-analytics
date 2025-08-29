import { with_database } from '../connection';

export function record_message(
	session_id: string,
	message_index: number,
	role: 'user' | 'assistant' | 'system',
	content_preview: string,
	token_count_input?: number,
	token_count_output?: number,
	cost_usd?: number,
	has_tool_calls: boolean = false,
): void {
	if (!session_id || message_index < 0) return;

	with_database((db) => {
		const stmt = db.prepare(`
			INSERT OR REPLACE INTO messages (
				session_id, message_index, role, content_preview, timestamp,
				token_count_input, token_count_output, cost_usd, has_tool_calls
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
		`);

		stmt.run(
			session_id,
			message_index,
			role,
			content_preview,
			new Date().toISOString(),
			token_count_input || null,
			token_count_output || null,
			cost_usd || null,
			has_tool_calls ? 1 : 0,
		);
	}, 'record message');
}
