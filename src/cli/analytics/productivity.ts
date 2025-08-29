import chalk from 'chalk';
import { get_database } from '../../database';
import { create_summary_table } from '../../utils/charts';

interface ProductivityRow {
	total_sessions: number;
	total_cost: number;
	total_lines_changed: number;
	avg_lines_per_session: number;
	avg_cost_per_line: number;
	avg_session_duration: number;
}

export async function show_productivity_analytics(days: number) {
	const db = get_database();

	const productivity_data = db
		.prepare(
			`
		SELECT 
			COUNT(*) as total_sessions,
			SUM(total_cost_usd) as total_cost,
			SUM(total_lines_added + total_lines_removed) as total_lines_changed,
			AVG(total_lines_added + total_lines_removed) as avg_lines_per_session,
			CASE 
				WHEN SUM(total_lines_added + total_lines_removed) > 0 
				THEN SUM(total_cost_usd) / SUM(total_lines_added + total_lines_removed)
				ELSE 0 
			END as avg_cost_per_line,
			AVG(duration_ms / 1000.0 / 60.0) as avg_session_duration
		FROM sessions 
		WHERE started_at >= datetime('now', '-${days} days')
		AND started_at IS NOT NULL
	`,
		)
		.get() as ProductivityRow;

	if (productivity_data.total_sessions === 0) {
		console.log(
			chalk.yellow(
				'\nNo productivity data found for the specified period.',
			),
		);
		return;
	}

	console.log(
		chalk.blue.bold(`\nProductivity Metrics (Last ${days} Days)\n`),
	);

	const summary_data = [
		['Total Sessions', productivity_data.total_sessions.toString()],
		[
			'Total Cost',
			`$${Number(productivity_data.total_cost || 0).toFixed(2)}`,
		],
		[
			'Lines Changed',
			productivity_data.total_lines_changed.toString(),
		],
		[
			'Avg Lines/Session',
			Math.round(
				productivity_data.avg_lines_per_session || 0,
			).toString(),
		],
		[
			'Cost per Line',
			`$${(productivity_data.avg_cost_per_line || 0).toFixed(4)}`,
		],
		[
			'Avg Session Duration',
			`${Math.round(productivity_data.avg_session_duration || 0)} min`,
		],
	];

	console.log(create_summary_table(summary_data));

	const efficiency_score =
		productivity_data.avg_lines_per_session /
		(productivity_data.avg_cost_per_line * 100);
	console.log(
		chalk.cyan(
			`\nEfficiency Score: ${efficiency_score.toFixed(2)} (lines per cent)`,
		),
	);
}
