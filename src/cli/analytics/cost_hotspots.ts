import chalk from 'chalk';
import { get_database } from '../../database';
import {
	create_activity_heatmap,
	create_bar_chart,
	create_usage_table,
} from '../../utils/charts';

export async function show_cost_hotspots(days: number) {
	const db = get_database();

	console.log(
		chalk.blue.bold(`\nCost Hotspots (Last ${days} Days)\n`),
	);

	// Top sessions by cost
	const top_sessions = db
		.prepare(
			`
      SELECT s.session_id, s.total_cost_usd as cost
      FROM sessions s
      WHERE s.started_at >= datetime('now', '-${days} days') AND s.total_cost_usd IS NOT NULL
      ORDER BY s.total_cost_usd DESC
      LIMIT 10
    `,
		)
		.all() as { session_id: string; cost: number }[];

	if (top_sessions.length) {
		const labels = top_sessions.map(
			(s) => '…' + s.session_id.slice(-7),
		);
		const data = top_sessions.map((s) => Number(s.cost || 0));
		console.log(
			create_bar_chart(data, labels, { height: 6, width: 2 }),
		);
		console.log();
		const table = create_usage_table(
			['Session', 'Cost'],
			top_sessions.map((s) => [
				'…' + s.session_id.slice(-8),
				`$${Number(s.cost || 0).toFixed(2)}`,
			]),
		);
		console.log(table + '\n');
	} else {
		console.log(
			chalk.dim('No costly sessions in the selected period.') + '\n',
		);
	}

	// Cost by hour heatmap (sum of session cost by started_at hour)
	const by_hour = db
		.prepare(
			`
      SELECT strftime('%w', started_at) as day_of_week, strftime('%H', started_at) as hour, SUM(total_cost_usd) as cost
      FROM sessions
      WHERE started_at >= datetime('now', '-${days} days')
      GROUP BY strftime('%w', started_at), strftime('%H', started_at)
    `,
		)
		.all() as {
		day_of_week: string;
		hour: string;
		cost: number | null;
	}[];

	if (by_hour.length) {
		const grid: number[][] = Array.from({ length: 7 }, () =>
			new Array(24).fill(0),
		);
		by_hour.forEach((r) => {
			const d = parseInt(r.day_of_week, 10);
			const h = parseInt(r.hour, 10);
			grid[d][h] = Number(r.cost || 0);
		});
		const day_labels = [
			'Mon',
			'Tue',
			'Wed',
			'Thu',
			'Fri',
			'Sat',
			'Sun',
		];
		const hour_labels = Array.from({ length: 24 }, (_, i) =>
			i.toString().padStart(2, '0'),
		);
		console.log(
			create_activity_heatmap(grid, {
				days: day_labels,
				hours: hour_labels,
			}),
		);
	}
}
