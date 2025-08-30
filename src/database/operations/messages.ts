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
	cache_creation_input_tokens?: number,
	cache_read_input_tokens?: number,
	cache_5m_tokens?: number,
	cache_1h_tokens?: number,
	timestamp?: string,
): void {
	if (!session_id || message_index < 0) return;

	with_database((db) => {
		const stmt = db.prepare(`
			INSERT OR REPLACE INTO messages (
				session_id, message_index, role, content_preview, timestamp,
				token_count_input, token_count_output, cost_usd, has_tool_calls,
				cache_creation_input_tokens, cache_read_input_tokens, cache_5m_tokens, cache_1h_tokens
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`);

		stmt.run(
			session_id,
			message_index,
			role,
			content_preview,
			timestamp || new Date().toISOString(),
			token_count_input || null,
			token_count_output || null,
			cost_usd || null,
			has_tool_calls ? 1 : 0,
			cache_creation_input_tokens || null,
			cache_read_input_tokens || null,
			cache_5m_tokens || null,
			cache_1h_tokens || null,
		);
	}, 'record message');
}
