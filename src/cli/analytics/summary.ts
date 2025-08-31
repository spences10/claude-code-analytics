import chalk from 'chalk';
import { get_database } from '../../database';
import { StatsRow } from '../../types';

function get_stats_for_range(where_clause: string): StatsRow {
	const db = get_database();

	// Avoid cost inflation by not joining tool_calls when summing costs
	const stats = db
		.prepare(
			`
SELECT
  (SELECT COUNT(DISTINCT session_id)
     FROM sessions
     WHERE ${where_clause}) AS total_sessions,
  (SELECT SUM(total_cost_usd)
     FROM sessions
     WHERE ${where_clause}) AS total_cost,
  (SELECT COUNT(DISTINCT project_id)
     FROM sessions
     WHERE ${where_clause}) AS total_projects,
  (SELECT COUNT(*)
     FROM tool_calls tc
     JOIN sessions s2 ON s2.session_id = tc.session_id
     WHERE ${where_clause.replace(/started_at/g, 's2.started_at')}) AS total_tools
      `,
		)
		.get() as StatsRow;

	return stats;
}

export function get_quick_stats(days: number = 7): StatsRow {
	return get_stats_for_range(
		`started_at >= datetime('now', '-${days} days')`,
	);
}

function format_delta(
	current: number,
	previous: number,
	suffix = '',
): string {
	const curr = Number(current || 0);
	const prev = Number(previous || 0);
	if (!isFinite(curr) || !isFinite(prev)) return chalk.dim(' (n/a)');
	if (prev === 0 && curr === 0) return chalk.dim(' (0%)');
	if (prev === 0) return chalk.green(' (new)');
	const change = ((curr - prev) / prev) * 100;
	const arrow = change >= 0 ? '^' : 'v';
	const color = change >= 0 ? chalk.green : chalk.red;
	return color(` ${arrow} ${Math.abs(change).toFixed(1)}%${suffix}`);
}

export async function show_quick_stats(days: number = 7) {
	const current = get_stats_for_range(
		`started_at >= datetime('now', '-${days} days')`,
	);
	const previous = get_stats_for_range(
		`started_at < datetime('now', '-${days} days') AND started_at >= datetime('now', '-${days * 2} days')`,
	);

	console.log(chalk.cyan(`\n📈 Last ${days} Days Summary:`));
	console.log(
		`  Sessions: ${current.total_sessions}` +
			format_delta(current.total_sessions, previous.total_sessions),
	);
	const cost_str = `$${Number(String(current.total_cost || 0)).toFixed(2)}`;
	console.log(
		`  Cost: ${cost_str}` +
			format_delta(
				Number(current.total_cost || 0),
				Number(previous.total_cost || 0),
			),
	);
	console.log(
		`  Projects: ${current.total_projects}` +
			format_delta(current.total_projects, previous.total_projects),
	);
	console.log(
		`  Tool Calls: ${current.total_tools}` +
			format_delta(current.total_tools, previous.total_tools),
	);
}
