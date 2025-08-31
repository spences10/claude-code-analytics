import chalk from 'chalk';
import { get_database } from '../../database';
import {
	create_line_chart,
	create_usage_table,
} from '../../utils/charts';

export async function show_error_trends(days: number) {
	const db = get_database();

	const daily = db
		.prepare(
			`
      SELECT DATE(tc.completed_at) as day, COUNT(*) as errors
      FROM tool_calls tc
      JOIN sessions s ON s.session_id = tc.session_id
      WHERE s.started_at >= datetime('now', '-${days} days') AND tc.success = 0 AND tc.completed_at IS NOT NULL
      GROUP BY DATE(tc.completed_at)
      ORDER BY day
    `,
		)
		.all() as { day: string; errors: number }[];

	if (!daily.length) {
		console.log(
			chalk.yellow(
				'\nNo tool error trend data for the selected period.',
			),
		);
		return;
	}

	console.log(
		chalk.blue.bold(`\nTool Error Trend (Last ${days} Days)\n`),
	);
	const series = daily.map((d) => d.errors);
	const chart = create_line_chart(series, {
		height: 6,
		format: (x) => x.toFixed(0),
	});
	console.log(chart + '\n');

	const top_errors = db
		.prepare(
			`
      SELECT tc.tool_name, COUNT(*) as error_count
      FROM tool_calls tc
      JOIN sessions s ON s.session_id = tc.session_id
      WHERE s.started_at >= datetime('now', '-${days} days') AND tc.success = 0
      GROUP BY tc.tool_name
      ORDER BY error_count DESC
      LIMIT 10
    `,
		)
		.all() as { tool_name: string; error_count: number }[];

	const table = create_usage_table(
		['Tool', 'Errors'],
		top_errors.map((e) => [e.tool_name, e.error_count.toString()]),
	);
	console.log(table);
}
