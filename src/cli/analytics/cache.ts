import chalk from 'chalk';
import { get_database } from '../../database';
import {
	create_summary_table,
	create_usage_table,
} from '../../utils/charts';

export async function show_cache_efficiency(days: number) {
	const db = get_database();

	const totals = db
		.prepare(
			`
      SELECT 
        SUM(m.cache_read_input_tokens) as cache_read,
        SUM(m.cache_creation_input_tokens) as cache_created,
        SUM(m.token_count_input) as input_tokens,
        COUNT(DISTINCT m.session_id) as sessions
      FROM messages m
      JOIN sessions s ON s.session_id = m.session_id
      WHERE s.started_at >= datetime('now', '-${days} days')
    `,
		)
		.get() as {
		cache_read: number | null;
		cache_created: number | null;
		input_tokens: number | null;
		sessions: number;
	};

	const cache_read = Number(totals.cache_read || 0);
	const cache_created = Number(totals.cache_created || 0);
	const input_tokens = Number(totals.input_tokens || 0);
	const sessions = totals.sessions || 0;
	const hit_rate =
		input_tokens > 0 ? (cache_read / input_tokens) * 100 : 0;

	console.log(
		chalk.blue.bold(`\nCache Efficiency (Last ${days} Days)\n`),
	);

	console.log(
		create_summary_table([
			['Sessions', sessions.toString()],
			['Input Tokens', input_tokens.toLocaleString()],
			['Cache Read Tokens', cache_read.toLocaleString()],
			['Cache Created Tokens', cache_created.toLocaleString()],
			['Cache Hit Rate', `${hit_rate.toFixed(1)}%`],
		]),
	);

	const by_model = db
		.prepare(
			`
      SELECT 
        COALESCE(s.model_display_name, 'Unknown') as model,
        SUM(m.cache_read_input_tokens) as cache_read,
        SUM(m.token_count_input) as input_tokens
      FROM messages m
      JOIN sessions s ON s.session_id = m.session_id
      WHERE s.started_at >= datetime('now', '-${days} days')
      GROUP BY s.model_display_name
      HAVING SUM(m.token_count_input) > 0
      ORDER BY cache_read DESC
      LIMIT 10
    `,
		)
		.all() as {
		model: string;
		cache_read: number;
		input_tokens: number;
	}[];

	if (by_model.length) {
		const table = create_usage_table(
			['Model', 'Cache Read', 'Input', 'Hit %'],
			by_model.map((r) => [
				r.model,
				Number(r.cache_read || 0).toLocaleString(),
				Number(r.input_tokens || 0).toLocaleString(),
				(
					(Number(r.cache_read || 0) /
						Math.max(1, Number(r.input_tokens || 0))) *
					100
				).toFixed(1),
			]),
		);
		console.log('\n' + table);
	}
}
