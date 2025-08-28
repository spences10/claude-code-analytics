import chalk from 'chalk';
import { Command } from 'commander';
import { get_database } from '../../database';
import { ActivityRow } from '../../types';
import {
	create_activity_heatmap,
	create_summary_table,
} from '../../utils/charts';

export function create_activity_command(): Command {
	const cmd = new Command('activity');

	cmd
		.description('Show activity patterns and heatmaps')
		.option('-d, --days <number>', 'Number of days to analyze', '7')
		.option('--hourly', 'Show hourly activity breakdown')
		.action(async (options) => {
			const db = get_database();
			const days = parseInt(options.days);

			console.log(
				chalk.blue.bold(
					`\n📈 Activity Analytics (Last ${days} days)\n`,
				),
			);

			if (options.hourly) {
				// Hourly heatmap
				console.log(chalk.yellow.bold('🕐 Activity Heatmap:'));

				const hourly_data = db
					.prepare(
						`
          SELECT 
            strftime('%w', started_at) as day_of_week,
            strftime('%H', started_at) as hour,
            COUNT(*) as session_count
          FROM sessions
          WHERE started_at >= datetime('now', '-${days} days')
          AND started_at IS NOT NULL
          GROUP BY day_of_week, hour
          ORDER BY day_of_week, hour
        `,
					)
					.all() as Array<{
					day_of_week: string;
					hour: string;
					session_count: number;
				}>;

				// Create 7x24 matrix (days x hours)
				const heatmap_data: number[][] = [];
				const day_labels = [
					'Sun',
					'Mon',
					'Tue',
					'Wed',
					'Thu',
					'Fri',
					'Sat',
				];
				const hour_labels = Array.from({ length: 6 }, (_, i) =>
					(i * 4).toString().padStart(2, '0'),
				);

				// Initialize matrix
				for (let day = 0; day < 7; day++) {
					heatmap_data[day] = new Array(6).fill(0); // 6 4-hour blocks
				}

				// Populate with data
				hourly_data.forEach((row) => {
					const day = parseInt(row.day_of_week);
					const hour = parseInt(row.hour);
					const block = Math.floor(hour / 4); // Group into 4-hour blocks
					heatmap_data[day][block] += row.session_count;
				});

				const heatmap = create_activity_heatmap(heatmap_data, {
					days: day_labels,
					hours: hour_labels,
				});
				console.log(heatmap);
				console.log();
			}

			// Daily activity summary
			const daily_activity = db
				.prepare(
					`
        SELECT 
          DATE(started_at) as date,
          COUNT(*) as session_count,
          SUM(duration_ms) / 1000.0 / 60.0 as total_minutes,
          COUNT(DISTINCT tool_name) as unique_tools
        FROM sessions s
        LEFT JOIN tool_calls tc ON s.session_id = tc.session_id
        WHERE s.started_at >= datetime('now', '-${days} days')
        AND s.started_at IS NOT NULL
        GROUP BY DATE(started_at)
        ORDER BY date DESC
      `,
				)
				.all() as Array<ActivityRow & { unique_tools: number }>;

			if (daily_activity.length === 0) {
				console.log(
					chalk.yellow(
						'No activity data found for the specified period.',
					),
				);
				return;
			}

			console.log(chalk.green.bold('📊 Daily Activity:'));
			daily_activity.forEach((day) => {
				const minutes = Number(String(day.total_minutes)) || 0;
				const tools = day.unique_tools || 0;
				console.log(
					`${chalk.cyan(day.date)}: ${day.session_count} sessions, ${minutes.toFixed(1)} min, ${tools} tools`,
				);
			});

			// Summary stats
			const total_sessions = daily_activity.reduce(
				(sum, d) => sum + d.session_count,
				0,
			);
			const total_minutes = daily_activity.reduce(
				(sum, d) => sum + (Number(d.total_minutes) || 0),
				0,
			);
			const avg_sessions_per_day =
				daily_activity.length > 0
					? total_sessions / daily_activity.length
					: 0;

			const summary_data = [
				['Total Sessions', total_sessions.toString()],
				[
					'Total Active Time',
					`${(total_minutes / 60).toFixed(1)} hours`,
				],
				['Avg Sessions/Day', avg_sessions_per_day.toFixed(1)],
				['Active Days', daily_activity.length.toString()],
			];

			console.log(chalk.magenta.bold('\n📋 Summary:'));
			console.log(create_summary_table(summary_data));
		});

	return cmd;
}
