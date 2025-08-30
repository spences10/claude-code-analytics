import { is_data_collection_enabled } from '../config';
import { get_database } from '../database/connection';

export interface productivity_insights {
	current_session_efficiency?: number;
	average_session_cost?: number;
	session_rank?: 'high' | 'normal' | 'low';
	tool_success_rate?: number;
	cache_efficiency?: number;
	cache_savings_tokens?: number;
}

export function get_productivity_insights(
	session_id?: string,
): productivity_insights {
	if (!session_id || !is_data_collection_enabled()) {
		return {};
	}

	try {
		const db = get_database();
		if (!db) return {};

		// Get current session stats
		const current_session = db
			.prepare(
				`
			SELECT total_cost_usd, duration_ms, total_lines_added, total_lines_removed 
			FROM sessions 
			WHERE session_id = ?
		`,
			)
			.get(session_id) as any;

		if (!current_session) return {};

		// Get average session metrics for comparison
		const avg_metrics = db
			.prepare(
				`
			SELECT 
				AVG(total_cost_usd) as avg_cost,
				AVG(duration_ms) as avg_duration,
				AVG(total_lines_added + total_lines_removed) as avg_lines_changed
			FROM sessions 
			WHERE total_cost_usd > 0 AND duration_ms > 0
		`,
			)
			.get() as any;

		// Calculate current session efficiency (lines changed per dollar)
		const current_lines =
			(current_session.total_lines_added || 0) +
			(current_session.total_lines_removed || 0);
		const current_efficiency =
			current_session.total_cost_usd > 0
				? current_lines / current_session.total_cost_usd
				: 0;

		// Determine session ranking
		let session_rank: 'high' | 'normal' | 'low' = 'normal';
		if (
			current_session.total_cost_usd <
			avg_metrics?.avg_cost * 0.8
		) {
			session_rank = 'high'; // Below average cost = more efficient
		} else if (
			current_session.total_cost_usd >
			avg_metrics?.avg_cost * 1.2
		) {
			session_rank = 'low'; // Above average cost = less efficient
		}

		// Get tool success rate for current session
		const tool_stats = db
			.prepare(
				`
			SELECT 
				COUNT(*) as total_tools,
				COUNT(CASE WHEN success = 1 THEN 1 END) as successful_tools
			FROM tool_calls 
			WHERE session_id = ?
		`,
			)
			.get(session_id) as any;

		const tool_success_rate =
			tool_stats?.total_tools > 0
				? (tool_stats.successful_tools / tool_stats.total_tools) * 100
				: undefined;

		// Calculate cache efficiency for current session
		const cache_stats = db
			.prepare(
				`
			SELECT 
				SUM(cache_read_input_tokens) as total_cache_reads,
				SUM(cache_creation_input_tokens) as total_cache_creation,
				SUM(token_count_input) as total_input_tokens
			FROM messages 
			WHERE session_id = ? AND role = 'assistant'
		`,
			)
			.get(session_id) as any;

		let cache_efficiency: number | undefined;
		let cache_savings_tokens: number | undefined;

		if (cache_stats?.total_cache_reads > 0) {
			const total_cache_tokens =
				(cache_stats.total_cache_reads || 0) +
				(cache_stats.total_cache_creation || 0);
			cache_efficiency =
				total_cache_tokens > 0
					? (cache_stats.total_cache_reads / total_cache_tokens) * 100
					: undefined;
			cache_savings_tokens = cache_stats.total_cache_reads;
		}

		return {
			current_session_efficiency: current_efficiency,
			average_session_cost: avg_metrics?.avg_cost,
			session_rank,
			tool_success_rate,
			cache_efficiency,
			cache_savings_tokens,
		};
	} catch {
		return {};
	}
}
