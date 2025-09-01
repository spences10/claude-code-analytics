import { get_productivity_insights } from '../analytics/productivity';
import { get_database } from '../database/connection';

/**
 * Hook processor that updates pre-computed summary tables
 * This runs during Claude Code natural pauses (PostToolUse, UserPromptSubmit)
 * to keep statusline queries blazingly fast
 */

export function update_session_summary(session_id: string): void {
	try {
		const db = get_database();

		// Get productivity insights (expensive operation)
		const insights = get_productivity_insights(session_id);

		// Get session totals
		const session_totals = db
			.prepare(
				`SELECT 
					SUM(COALESCE(token_count_input, 0)) as input_tokens,
					SUM(COALESCE(token_count_output, 0)) as output_tokens,
					SUM(COALESCE(cache_read_input_tokens, 0)) as cache_reads,
					SUM(COALESCE(cache_creation_input_tokens, 0)) as cache_creates
				FROM messages 
				WHERE session_id = ? AND role = 'assistant'`,
			)
			.get(session_id) as any;

		// Get current context (latest assistant message only)
		const latest_context = db
			.prepare(
				`SELECT 
					COALESCE(token_count_input, 0) as input_tokens,
					COALESCE(cache_read_input_tokens, 0) as cache_reads
				FROM messages 
				WHERE session_id = ? AND role = 'assistant'
				ORDER BY message_index DESC LIMIT 1`,
			)
			.get(session_id) as any;

		const tool_stats = db
			.prepare(
				`SELECT 
					COUNT(*) as total_tools,
					SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_tools
				FROM tool_calls 
				WHERE session_id = ?`,
			)
			.get(session_id) as any;

		// Calculate derived metrics
		const total_input = Number(session_totals?.input_tokens || 0);
		const total_output = Number(session_totals?.output_tokens || 0);
		const total_cache_reads = Number(
			session_totals?.cache_reads || 0,
		);
		const total_cache_creates = Number(
			session_totals?.cache_creates || 0,
		);
		const current_context =
			Number(latest_context?.input_tokens || 0) +
			Number(latest_context?.cache_reads || 0); // Current context window state

		const total_tools = Number(tool_stats?.total_tools || 0);
		const successful_tools = Number(
			tool_stats?.successful_tools || 0,
		);
		const tool_success_rate =
			total_tools > 0
				? (successful_tools / total_tools) * 100
				: undefined;

		const cache_total = total_cache_reads + total_cache_creates;
		const cache_efficiency =
			cache_total > 0
				? (total_cache_reads / cache_total) * 100
				: undefined;

		// Upsert summary record
		db.prepare(
			`INSERT OR REPLACE INTO session_summary (
				session_id,
				efficiency_score,
				session_rank,
				cost_efficiency,
				lines_per_dollar,
				tool_success_rate,
				tool_count,
				cache_efficiency,
				cache_savings_tokens,
				total_cache_reads,
				total_cache_creates,
				total_input_tokens,
				total_output_tokens,
				total_context_tokens,
				last_updated
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
		).run(
			session_id,
			insights.current_session_efficiency,
			insights.session_rank,
			null, // cost_efficiency - not available in current insights
			null, // lines_per_dollar - not available in current insights
			tool_success_rate,
			total_tools,
			cache_efficiency,
			insights.cache_savings_tokens,
			total_cache_reads,
			total_cache_creates,
			total_input,
			total_output,
			current_context,
		);
	} catch (error) {
		// Silent failure - don't interrupt Claude Code
		console.error(
			`Failed to update session summary for ${session_id}:`,
			error,
		);
	}
}

export function update_global_summary(): void {
	try {
		const db = get_database();

		// Calculate 7-day averages
		const tool_avg = db
			.prepare(
				`SELECT AVG(tool_success_rate) as avg_rate
				FROM session_summary ss
				JOIN sessions s ON s.session_id = ss.session_id
				WHERE s.started_at >= datetime('now', '-7 days')
					AND ss.tool_success_rate IS NOT NULL`,
			)
			.get() as any;

		const cache_avg = db
			.prepare(
				`SELECT AVG(cache_efficiency) as avg_eff
				FROM session_summary ss
				JOIN sessions s ON s.session_id = ss.session_id
				WHERE s.started_at >= datetime('now', '-7 days')
					AND ss.cache_efficiency IS NOT NULL`,
			)
			.get() as any;

		const cost_avg = db
			.prepare(
				`SELECT AVG(total_cost_usd) as avg_cost
				FROM sessions
				WHERE started_at >= datetime('now', '-7 days')
					AND total_cost_usd IS NOT NULL`,
			)
			.get() as any;

		const session_counts = db
			.prepare(
				`SELECT 
					SUM(CASE WHEN DATE(started_at) = DATE('now') THEN 1 ELSE 0 END) as today,
					SUM(CASE WHEN started_at >= datetime('now', '-7 days') THEN 1 ELSE 0 END) as week
				FROM sessions`,
			)
			.get() as any;

		// Update global metrics
		const updates = [
			['avg_tool_success_rate_7d', Number(tool_avg?.avg_rate || 0)],
			['avg_cache_efficiency_7d', Number(cache_avg?.avg_eff || 0)],
			['avg_cost_per_session_7d', Number(cost_avg?.avg_cost || 0)],
			['total_sessions_today', Number(session_counts?.today || 0)],
			['total_sessions_7d', Number(session_counts?.week || 0)],
		];

		const stmt = db.prepare(
			`INSERT OR REPLACE INTO global_summary (metric_key, metric_value, last_updated) 
			VALUES (?, ?, CURRENT_TIMESTAMP)`,
		);

		for (const [key, value] of updates) {
			stmt.run(key, value);
		}
	} catch (error) {
		console.error('Failed to update global summary:', error);
	}
}

export function update_sparkline_cache(): void {
	try {
		const db = get_database();

		// Cost sparkline (last 20 sessions)
		const cost_data = db
			.prepare(
				`SELECT total_cost_usd as c 
				FROM sessions 
				WHERE total_cost_usd IS NOT NULL 
				ORDER BY started_at ASC 
				LIMIT 20`,
			)
			.all() as { c: number }[];

		// Cache efficiency sparkline (last 20 sessions)
		const cache_data = db
			.prepare(
				`SELECT 
					s.session_id,
					SUM(COALESCE(cache_read_input_tokens, 0)) as reads,
					SUM(COALESCE(cache_creation_input_tokens, 0)) as creates,
					CASE 
						WHEN (SUM(COALESCE(cache_read_input_tokens, 0)) + SUM(COALESCE(cache_creation_input_tokens, 0))) > 0 
						THEN (SUM(COALESCE(cache_read_input_tokens, 0)) * 100.0) / (SUM(COALESCE(cache_read_input_tokens, 0)) + SUM(COALESCE(cache_creation_input_tokens, 0)))
						ELSE 0 
					END as efficiency
				FROM sessions s
				JOIN messages m ON m.session_id = s.session_id
				WHERE m.role = 'assistant'
					AND (m.cache_read_input_tokens > 0 OR m.cache_creation_input_tokens > 0)
				GROUP BY s.session_id
				ORDER BY s.started_at DESC
				LIMIT 20`,
			)
			.all() as { efficiency: number }[];

		// Activity strip (24h by hour)
		const activity_data = db
			.prepare(
				`SELECT strftime('%H', started_at) as h, COUNT(*) as c
				FROM sessions
				WHERE started_at >= datetime('now', '-1 day')
				GROUP BY strftime('%H', started_at)
				ORDER BY h`,
			)
			.all() as { h: string; c: number }[];

		// Streak data (7 days)
		const streak_data = db
			.prepare(
				`SELECT DATE(started_at) as d, COUNT(*) as c
				FROM sessions
				WHERE started_at >= DATE('now', '-7 days')
				GROUP BY DATE(started_at)
				ORDER BY d`,
			)
			.all() as { d: string; c: number }[];

		// Update sparkline cache
		const updates = [
			[
				'cost_sparkline_20',
				JSON.stringify(cost_data.map((r) => Number(r.c || 0))),
			],
			[
				'cache_sparkline_20',
				JSON.stringify(
					cache_data.map((r) => Number(r.efficiency || 0)),
				),
			],
			['activity_hourly_24h', JSON.stringify(activity_data)],
			['streak_daily_7d', JSON.stringify(streak_data)],
		];

		const stmt = db.prepare(
			`INSERT OR REPLACE INTO sparkline_cache (cache_key, data_points, last_updated) 
			VALUES (?, ?, CURRENT_TIMESTAMP)`,
		);

		for (const [key, data] of updates) {
			stmt.run(key, data);
		}
	} catch (error) {
		console.error('Failed to update sparkline cache:', error);
	}
}
