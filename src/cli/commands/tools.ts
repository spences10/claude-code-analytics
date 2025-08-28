import chalk from 'chalk';
import { Command } from 'commander';
import { get_database } from '../../database';
import { ToolRow } from '../../types';
import {
	create_bar_chart,
	create_usage_table,
} from '../../utils/charts';

export function create_tools_command(): Command {
	const cmd = new Command('tools');

	cmd
		.description('Show tool usage analytics')
		.option('-d, --days <number>', 'Number of days to analyze', '7')
		.option(
			'-l, --limit <number>',
			'Limit number of tools shown',
			'10',
		)
		.option('--chart', 'Show bar chart visualization')
		.action(async (options) => {
			const db = get_database();
			const days = parseInt(options.days);
			const limit = parseInt(options.limit);

			console.log(
				chalk.blue.bold(
					`\n🔧 Tool Usage Analytics (Last ${days} days)\n`,
				),
			);

			// Tool usage data
			const tool_usage = db
				.prepare(
					`
        SELECT tc.tool_name,
               COUNT(*) as usage_count,
               ROUND(COUNT(*) * 100.0 / (
                 SELECT COUNT(*) 
                 FROM tool_calls tc2 
                 JOIN sessions s2 ON tc2.session_id = s2.session_id
                 WHERE s2.started_at >= datetime('now', '-${days} days')
               ), 1) as percentage,
               ROUND(AVG(tc.execution_time_ms), 0) as avg_execution_ms,
               SUM(CASE WHEN tc.success = 0 THEN 1 ELSE 0 END) as error_count
        FROM tool_calls tc
        JOIN sessions s ON tc.session_id = s.session_id
        WHERE s.started_at >= datetime('now', '-${days} days')
        GROUP BY tc.tool_name
        ORDER BY usage_count DESC
        LIMIT ${limit}
      `,
				)
				.all() as ToolRow[];

			if (tool_usage.length === 0) {
				console.log(
					chalk.yellow(
						'No tool usage data found for the specified period.',
					),
				);
				return;
			}

			// Show chart if requested
			if (options.chart && tool_usage.length > 1) {
				console.log(chalk.yellow.bold('📊 Usage Distribution:'));
				const counts = tool_usage.map((t) => t.usage_count);
				const labels = tool_usage.map((t) =>
					t.tool_name.substring(0, 12),
				); // Truncate for display

				const chart = create_bar_chart(counts, labels);
				console.log(chart);
				console.log();
			}

			// Usage table
			console.log(chalk.green.bold('🏆 Top Tools:'));
			const table_data = tool_usage.map((tool) => [
				tool.tool_name,
				tool.usage_count.toString(),
				`${tool.percentage}%`,
				tool.avg_execution_ms ? `${tool.avg_execution_ms}ms` : 'N/A',
				tool.error_count > 0
					? chalk.red(tool.error_count.toString())
					: chalk.green('0'),
			]);

			const table = create_usage_table(
				['Tool', 'Count', '% Total', 'Avg Time', 'Errors'],
				table_data,
			);
			console.log(table);

			// Quick stats
			const total_calls = tool_usage.reduce(
				(sum, t) => sum + t.usage_count,
				0,
			);
			const total_errors = tool_usage.reduce(
				(sum, t) => sum + t.error_count,
				0,
			);
			const error_rate =
				total_calls > 0
					? ((total_errors / total_calls) * 100).toFixed(1)
					: '0';

			console.log(
				chalk.cyan(
					`\n📈 Total tool calls: ${total_calls} | Error rate: ${error_rate}%`,
				),
			);
		});

	return cmd;
}
