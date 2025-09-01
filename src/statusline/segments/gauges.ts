import { get_database } from '../../database/connection';
import { make_gauge } from '../visuals';
import { type SegmentRenderer } from './types';

export const tool_gauge: SegmentRenderer = (
	_data,
	insights,
	config,
) => {
	let pct = insights.tool_success_rate;
	if (pct === undefined) {
		try {
			const db = get_database();
			const row = db
				.prepare(
					`SELECT COUNT(*) as total,
					SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as ok
					FROM tool_calls tc
					JOIN sessions s ON s.session_id = tc.session_id
					WHERE s.started_at >= datetime('now','-7 days')`,
				)
				.get() as any;
			pct =
				row && row.total > 0 ? (row.ok / row.total) * 100 : undefined;
		} catch {}
	}
	if (pct === undefined) return null;
	const width = (config.display?.bar_width ?? 10) as number;
	const ascii =
		config.display?.theme === 'ascii' ||
		config.display?.icons === false;
	const use_colors = (config.display as any)?.colors !== false;
	return make_gauge(pct, {
		width,
		ascii,
		use_colors,
		label: 'Tools',
	});
};

export const cache_gauge: SegmentRenderer = (
	_data,
	insights,
	config,
) => {
	let pct = insights.cache_efficiency;
	if (pct === undefined) {
		try {
			const db = get_database();
			const row = db
				.prepare(
					`SELECT SUM(cache_read_input_tokens) as reads,
					SUM(cache_creation_input_tokens) as creates
					FROM messages m
					JOIN sessions s ON s.session_id = m.session_id
					WHERE m.role = 'assistant'
						AND s.started_at >= datetime('now','-7 days')`,
				)
				.get() as any;
			const reads = Number(row?.reads || 0);
			const creates = Number(row?.creates || 0);
			const total = reads + creates;
			pct = total > 0 ? (reads / total) * 100 : undefined;
		} catch {}
	}
	if (pct === undefined) return null;
	const width = (config.display?.bar_width ?? 10) as number;
	const ascii =
		config.display?.theme === 'ascii' ||
		config.display?.icons === false;
	const use_colors = (config.display as any)?.colors !== false;
	return make_gauge(pct, {
		width,
		ascii,
		use_colors,
		label: 'Cache',
	});
};

export const context_gauge: SegmentRenderer = (
	data,
	_insights,
	config,
) => {
	try {
		const db = get_database();
		const token_limit =
			(config.display as any)?.context?.token_limit ?? 200000;
		const mode: 'latest' | 'session_total' | 'recent_n' =
			(config.display as any)?.context?.mode || 'latest';
		const recent_n = (config.display as any)?.context?.recent_n ?? 5;

		let used_tokens = 0;

		if (mode === 'session_total' && data.session_id) {
			const row = db
				.prepare(
					`SELECT 
					SUM(COALESCE(token_count_input,0)) as tin,
					SUM(COALESCE(token_count_output,0)) as tout
				FROM messages WHERE session_id = ?`,
				)
				.get(data.session_id) as any;
			used_tokens = Number(row?.tin || 0) + Number(row?.tout || 0);
		} else if (mode === 'recent_n' && data.session_id) {
			const rows = db
				.prepare(
					`SELECT token_count_input as tin 
					FROM messages 
					WHERE session_id = ? AND role = 'assistant'
					ORDER BY message_index DESC LIMIT ?`,
				)
				.all(data.session_id, recent_n) as any[];
			used_tokens = rows.reduce(
				(sum, r) => sum + Number(r?.tin || 0),
				0,
			);
		} else {
			// latest assistant turn overall
			const row = db
				.prepare(
					`SELECT token_count_input as tin 
					FROM messages 
					WHERE role = 'assistant'
					ORDER BY timestamp DESC LIMIT 1`,
				)
				.get() as any;
			used_tokens = Number(row?.tin || 0);
		}

		if (token_limit <= 0) return null;
		const pct = Math.max(
			0,
			Math.min(100, Math.round((used_tokens / token_limit) * 100)),
		);
		const width = (config.display?.bar_width ?? 12) as number;
		const ascii =
			config.display?.theme === 'ascii' ||
			config.display?.icons === false;
		const use_colors = (config.display as any)?.colors !== false;

		const gauge = make_gauge(pct, {
			width,
			ascii,
			use_colors,
			label: 'Context',
		});
		const used_k = Math.round(used_tokens / 1000);
		const limit_k = Math.round(token_limit / 1000);
		return `${gauge} ${used_k}K/${limit_k}K`;
	} catch {
		return null;
	}
};
