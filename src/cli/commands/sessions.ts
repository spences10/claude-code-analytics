import chalk from 'chalk';
import { Command } from 'commander';
import { get_database } from '../../database';
import { SessionRow } from '../../types';
import {
	create_line_chart,
	create_summary_table,
	create_usage_table,
} from '../../utils/charts';

export function create_sessions_command(): Command {
	const cmd = new Command('sessions');

	cmd
		.description('Show session analytics and productivity metrics')
		.option('-d, --days <number>', 'Number of days to analyze', '7')
		.option(
			'-l, --limit <number>',
			'Limit number of sessions shown',
			'10',
		)
		.option('--detailed', 'Show detailed session information')
		.action(async (options) => {
			const db = get_database();
			const days = parseInt(options.days);
			const limit = parseInt(options.limit);

			console.log(
				chalk.blue.bold(
					`\n⚡ Session Analytics (Last ${days} days)\n`,
				),
			);

			// Session productivity metrics
			const session_metrics = db
				.prepare(
					`
        SELECT 
          s.session_id,
          s.started_at,
          s.duration_ms / 1000.0 / 60.0 as duration_minutes,
          s.total_cost_usd,
          s.total_lines_added + s.total_lines_removed as lines_changed,
          COUNT(tc.tool_call_id) as tool_calls,
          COUNT(DISTINCT tc.tool_name) as unique_tools,
          p.project_name
        FROM sessions s
        LEFT JOIN tool_calls tc ON s.session_id = tc.session_id
        LEFT JOIN projects p ON s.project_id = p.project_id
        WHERE s.started_at >= datetime('now', '-${days} days')
        AND s.started_at IS NOT NULL
        GROUP BY s.session_id
        ORDER BY s.started_at DESC
        LIMIT ${limit}
      `,
				)
				.all() as Array<SessionRow & { unique_tools: number }>;

			if (session_metrics.length === 0) {
				console.log(
					chalk.yellow(
						'No session data found for the specified period.',
					),
				);
				return;
			}

			// Recent sessions table
			console.log(chalk.green.bold('🚀 Recent Sessions:'));
			const session_table_data = session_metrics.map((session) => {
				const duration =
					Number(String(session.duration_minutes)) || 0;
				const cost = Number(String(session.total_cost_usd)) || 0;
				const lines = session.lines_changed || 0;
				const efficiency =
					duration > 0 ? (lines / duration).toFixed(1) : '0';

				return [
					new Date(session.started_at).toLocaleDateString(),
					session.project_name || 'Unknown',
					`${duration.toFixed(1)}m`,
					`$${cost.toFixed(2)}`,
					lines.toString(),
					`${efficiency} l/m`,
					session.tool_calls.toString(),
				];
			});

			const session_table = create_usage_table(
				[
					'Date',
					'Project',
					'Duration',
					'Cost',
					'Lines',
					'Efficiency',
					'Tools',
				],
				session_table_data,
			);
			console.log(session_table);

			// Productivity trend
			if (session_metrics.length > 3) {
				console.log(
					chalk.yellow.bold(
						'\n📈 Productivity Trend (Lines Changed):',
					),
				);
				const lines_data = session_metrics
					.reverse()
					.map((s) => s.lines_changed || 0);
				const chart = create_line_chart(lines_data, { height: 6 });
				console.log(chart);
				console.log(
					'   ' +
						session_metrics.map((_, i) => `S${i + 1}`).join('    '),
				);
				console.log();
			}

			// Session quality analysis
			const total_duration = session_metrics.reduce(
				(sum, s) => sum + (Number(s.duration_minutes) || 0),
				0,
			);
			const total_cost = session_metrics.reduce(
				(sum, s) => sum + (Number(s.total_cost_usd) || 0),
				0,
			);
			const total_lines = session_metrics.reduce(
				(sum, s) => sum + (s.lines_changed || 0),
				0,
			);
			const total_tools = session_metrics.reduce(
				(sum, s) => sum + s.tool_calls,
				0,
			);

			const avg_duration =
				session_metrics.length > 0
					? total_duration / session_metrics.length
					: 0;
			const avg_cost =
				session_metrics.length > 0
					? total_cost / session_metrics.length
					: 0;
			const lines_per_dollar =
				total_cost > 0 ? total_lines / total_cost : 0;
			const tools_per_session =
				session_metrics.length > 0
					? total_tools / session_metrics.length
					: 0;

			const productivity_data = [
				['Avg Duration', `${avg_duration.toFixed(1)} minutes`],
				['Avg Cost/Session', `$${avg_cost.toFixed(2)}`],
				['Lines per $1', lines_per_dollar.toFixed(0)],
				['Avg Tools/Session', tools_per_session.toFixed(1)],
				['Total Productivity', `${total_lines} lines changed`],
			];

			console.log(chalk.magenta.bold('🎯 Productivity Metrics:'));
			console.log(create_summary_table(productivity_data));

			if (options.detailed) {
				console.log(chalk.gray.bold('\n📋 Detailed Session Info:'));
				session_metrics.reverse().forEach((session, index) => {
					const duration = Number(session.duration_minutes) || 0;
					const cost = Number(session.total_cost_usd) || 0;
					console.log(
						`${index + 1}. ${chalk.cyan(session.session_id.substring(0, 8))}: ${duration.toFixed(1)}m, $${cost.toFixed(2)}, ${session.lines_changed || 0} lines`,
					);
				});
			}
		});

	return cmd;
}
