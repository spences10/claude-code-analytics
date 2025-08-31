import chalk from 'chalk';
import { get_database } from '../../database';
import { create_activity_heatmap } from '../../utils/charts';

export async function show_activity_condensed(days: number) {
	const db = get_database();
	// Aggregate by 2-hour blocks to reduce width
	const rows = db
		.prepare(
			`
      SELECT 
        strftime('%w', started_at) as day_of_week,
        (CAST(strftime('%H', started_at) AS INTEGER) / 2) as block,
        COUNT(*) as sessions
      FROM sessions
      WHERE started_at >= datetime('now', '-${days} days') AND started_at IS NOT NULL
      GROUP BY strftime('%w', started_at), block
    `,
		)
		.all() as {
		day_of_week: string;
		block: number;
		sessions: number;
	}[];

	if (!rows.length) {
		console.log(
			chalk.yellow(
				'\nNo activity data found for the specified period.',
			),
		);
		return;
	}

	const grid: number[][] = Array.from({ length: 7 }, () =>
		new Array(12).fill(0),
	);
	rows.forEach((r) => {
		const d = parseInt(r.day_of_week, 10);
		grid[d][r.block] = r.sessions;
	});
	const day_labels = [
		'Sun',
		'Mon',
		'Tue',
		'Wed',
		'Thu',
		'Fri',
		'Sat',
	];
	const hour_labels = Array.from({ length: 12 }, (_, i) =>
		String(i * 2).padStart(2, '0'),
	);

	console.log(
		chalk.blue.bold(
			`\nActivity (Condensed 2h Blocks, Last ${days} Days)\n`,
		),
	);
	console.log(
		create_activity_heatmap(grid, {
			days: day_labels,
			hours: hour_labels,
		}),
	);
}
