import chalk from 'chalk';
import { get_database } from '../../database';
import { StatsRow } from '../../types';

export function get_quick_stats(days: number = 7): StatsRow {
	const db = get_database();

	// Avoid cost inflation by not joining tool_calls when summing costs
	const stats = db
		.prepare(
			`
SELECT
  (SELECT COUNT(DISTINCT session_id)
     FROM sessions
     WHERE started_at >= datetime('now', '-${days} days')) AS total_sessions,
  (SELECT SUM(total_cost_usd)
     FROM sessions
     WHERE started_at >= datetime('now', '-${days} days')) AS total_cost,
  (SELECT COUNT(DISTINCT project_id)
     FROM sessions
     WHERE started_at >= datetime('now', '-${days} days')) AS total_projects,
  (SELECT COUNT(*)
     FROM tool_calls tc
     JOIN sessions s2 ON s2.session_id = tc.session_id
     WHERE s2.started_at >= datetime('now', '-${days} days')) AS total_tools
      `,
		)
		.get() as StatsRow;

	return stats;
}

export async function show_quick_stats(days: number = 7) {
	const stats = get_quick_stats(days);
	console.log(chalk.cyan('\n📈 Last 7 Days Summary:'));
	console.log(`  Sessions: ${stats.total_sessions}`);
	console.log(
		`  Cost: $${Number(String(stats.total_cost || 0)).toFixed(2)}`,
	);
	console.log(`  Projects: ${stats.total_projects}`);
	console.log(`  Tool Calls: ${stats.total_tools}`);
}
