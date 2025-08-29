import { confirm, isCancel, select, text } from '@clack/prompts';
import chalk from 'chalk';
import { get_database } from '../../database';
import { CostRow, StatsRow, ToolRow } from '../../types';
import {
	create_line_chart,
	create_summary_table,
	create_usage_table,
} from '../../utils/charts';
import { show_activity_analytics } from '../analytics/activity';
import { show_files_analytics } from '../analytics/files';
import { show_models_analytics } from '../analytics/models';
import {
	show_performance_analytics,
	show_tool_success_analytics,
} from '../analytics/performance';
import { show_productivity_analytics } from '../analytics/productivity';
import { show_projects_analytics } from '../analytics/projects';
import {
	show_error_analysis,
	show_session_quality_analytics,
} from '../analytics/quality';

export async function show_quick_stats() {
	const db = get_database();

	const stats = db
		.prepare(
			`
		SELECT 
			COUNT(DISTINCT s.session_id) as total_sessions,
			SUM(s.total_cost_usd) as total_cost,
			COUNT(DISTINCT p.project_id) as total_projects,
			COUNT(tc.tool_call_id) as total_tools
		FROM sessions s
		LEFT JOIN projects p ON s.project_id = p.project_id
		LEFT JOIN tool_calls tc ON s.session_id = tc.session_id
		WHERE s.started_at >= datetime('now', '-7 days')
	`,
		)
		.get() as StatsRow;

	console.log(chalk.cyan('\n📈 Last 7 Days Summary:'));
	console.log(`  Sessions: ${stats.total_sessions}`);
	console.log(
		`  Cost: $${Number(String(stats.total_cost || 0)).toFixed(2)}`,
	);
	console.log(`  Projects: ${stats.total_projects}`);
	console.log(`  Tool Calls: ${stats.total_tools}`);
}

export async function run_analytics_dashboard() {
	while (true) {
		const analytics_choice = await select({
			message: 'Choose analytics to view:',
			options: [
				{
					value: 'costs',
					label: 'Cost Analytics',
					hint: 'Daily spend trends with ASCII line charts',
				},
				{
					value: 'tools',
					label: 'Tool Usage',
					hint: 'Tool usage statistics with clean tables',
				},
				{
					value: 'activity',
					label: 'Activity Patterns',
					hint: 'Activity heatmap with ASCII blocks',
				},
				{
					value: 'productivity',
					label: 'Productivity Metrics',
					hint: 'Lines changed per session/dollar efficiency',
				},
				{
					value: 'projects',
					label: 'Project Intelligence',
					hint: 'Cross-project comparison and insights',
				},
				{
					value: 'files',
					label: 'File Operations',
					hint: 'Most modified files and access patterns',
				},
				{
					value: 'models',
					label: 'Model Performance',
					hint: 'Model efficiency and cost comparison',
				},
				{
					value: 'performance',
					label: 'Hook Performance',
					hint: 'Hook execution times and overhead analysis',
				},
				{
					value: 'success',
					label: 'Tool Success Rates',
					hint: 'Tool reliability and failure analysis',
				},
				{
					value: 'quality',
					label: 'Session Quality',
					hint: 'Session metrics and end reasons',
				},
				{
					value: 'errors',
					label: 'Error Analysis',
					hint: 'Common errors and troubleshooting insights',
				},
				{
					value: 'back',
					label: 'Back to Main Menu',
				},
			],
		});

		if (isCancel(analytics_choice) || analytics_choice === 'back') {
			break;
		}

		const days = await text({
			message: 'How many days to analyze?',
			placeholder: '7',
			defaultValue: '7',
			validate(value) {
				const num = parseInt(value);
				if (isNaN(num) || num < 1 || num > 365) {
					return 'Please enter a number between 1 and 365';
				}
			},
		});

		if (isCancel(days)) continue;

		const day_count = parseInt(days as string);

		try {
			switch (analytics_choice) {
				case 'costs':
					await show_costs_analytics(day_count);
					break;
				case 'tools':
					await show_tools_analytics(day_count);
					break;
				case 'activity':
					await show_activity_analytics(day_count);
					break;
				case 'productivity':
					await show_productivity_analytics(day_count);
					break;
				case 'projects':
					await show_projects_analytics(day_count);
					break;
				case 'files':
					await show_files_analytics(day_count);
					break;
				case 'models':
					await show_models_analytics(day_count);
					break;
				case 'performance':
					await show_performance_analytics(day_count);
					break;
				case 'success':
					await show_tool_success_analytics(day_count);
					break;
				case 'quality':
					await show_session_quality_analytics(day_count);
					break;
				case 'errors':
					await show_error_analysis(day_count);
					break;
				default:
					console.log(
						chalk.red('Unknown analytics option:', analytics_choice),
					);
			}
		} catch (error) {
			console.error(chalk.red('Error running analytics:'), error);
			console.log(
				chalk.yellow(
					'Please try again or select a different option.',
				),
			);
		}

		const continue_choice = await confirm({
			message: 'View more analytics?',
		});

		if (isCancel(continue_choice) || !continue_choice) {
			break;
		}
	}
}

async function show_costs_analytics(days: number) {
	const db = get_database();

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
			chalk.yellow('\nNo cost data found for the specified period.'),
		);
		return;
	}

	console.log(chalk.blue.bold(`\nCost Trend (Last ${days} Days)\n`));

	if (daily_costs.length > 1) {
		const costs = daily_costs.map((d) => Number(d.daily_cost));
		const chart = create_line_chart(costs, {
			height: 8,
			format: (x) => '$' + x.toFixed(2),
		});
		console.log(chart);
		console.log();
	}

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

	console.log(create_summary_table(summary_data));
}

async function show_tools_analytics(days: number) {
	const db = get_database();

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
			   ), 0) as percentage
		FROM tool_calls tc
		JOIN sessions s ON tc.session_id = s.session_id
		WHERE s.started_at >= datetime('now', '-${days} days')
		GROUP BY tc.tool_name
		ORDER BY usage_count DESC
		LIMIT 10
	`,
		)
		.all() as ToolRow[];

	if (tool_usage.length === 0) {
		console.log(
			chalk.yellow(
				'\nNo tool usage data found for the specified period.',
			),
		);
		return;
	}

	console.log(chalk.blue.bold(`\nTop Tools (Last ${days} Days)\n`));

	const table_data = tool_usage.map((tool) => [
		tool.tool_name,
		tool.usage_count.toString(),
		`${tool.percentage}%`,
	]);

	const table = create_usage_table(
		['Tool', 'Count', '% of Total'],
		table_data,
	);
	console.log(table);
}
