import chalk from 'chalk';
import { Command } from 'commander';
import { get_database } from '../../database';
import { CostRow } from '../../types';
import {
	create_line_chart,
	create_summary_table,
} from '../../utils/charts.js';

export function create_costs_command(): Command {
	const cmd = new Command('costs');

	cmd
		.description('Show cost analytics with visual charts')
		.option('-d, --days <number>', 'Number of days to analyze', '7')
		.option('--raw', 'Show raw data without charts')
		.action(async (options) => {
			const db = get_database();
			const days = parseInt(options.days);

			console.log(
				chalk.blue.bold(`\n💰 Cost Analytics (Last ${days} days)\n`),
			);

			// Daily cost trend
			const daily_costs = db
				.prepare(
					`
        SELECT DATE(started_at) as date,
               SUM(total_cost_usd) as daily_cost,
               COUNT(*) as session_count
        FROM sessions 
        WHERE started_at >= datetime('now', '-${days} days')
        AND started_at IS NOT NULL 
        GROUP BY DATE(started_at)
        ORDER BY date
      `,
				)
				.all() as CostRow[];

			if (daily_costs.length === 0) {
				console.log(
					chalk.yellow(
						'No cost data found for the specified period.',
					),
				);
				return;
			}

			if (!options.raw && daily_costs.length > 1) {
				console.log(chalk.yellow.bold('📈 Daily Cost Trend:'));
				const costs = daily_costs.map((d) => Number(d.daily_cost));
				const dates = daily_costs.map((d) => d.date.substring(5)); // MM-DD

				const chart = create_line_chart(costs, {
					height: 8,
					format: (x) => '$' + x.toFixed(2),
				});
				console.log(chart);
				console.log();
			}

			// Summary table
			const total_cost = daily_costs.reduce(
				(sum, d) => sum + Number(d.daily_cost),
				0,
			);
			const total_sessions = daily_costs.reduce(
				(sum, d) => sum + d.session_count,
				0,
			);
			const avg_cost_per_session =
				total_sessions > 0 ? total_cost / total_sessions : 0;

			const summary_data = [
				['Total Cost', `$${total_cost.toFixed(2)}`],
				['Total Sessions', total_sessions.toString()],
				['Avg Cost/Session', `$${avg_cost_per_session.toFixed(2)}`],
				['Daily Average', `$${(total_cost / days).toFixed(2)}`],
			];

			console.log(chalk.green.bold('📊 Summary:'));
			console.log(create_summary_table(summary_data));

			if (options.raw) {
				console.log(chalk.gray.bold('\n📋 Raw Data:'));
				daily_costs.forEach((day: CostRow) => {
					console.log(
						`${day.date}: $${Number(String(day.daily_cost)).toFixed(2)} (${day.session_count} sessions)`,
					);
				});
			}
		});

	return cmd;
}
