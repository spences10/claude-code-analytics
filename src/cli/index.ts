import {
	cancel,
	confirm,
	intro,
	isCancel,
	outro,
	select,
	spinner,
	text,
} from '@clack/prompts';
import chalk from 'chalk';
import { save_global_config } from '../config';
import { get_database } from '../database';
import { CostRow, StatsRow, ToolRow } from '../types';
import {
	create_activity_heatmap,
	create_line_chart,
	create_summary_table,
	create_usage_table,
} from '../utils/charts.js';

export async function run_cli() {
	intro('🌟 Claude Code Analytics & Configuration');

	const main_action = await select({
		message: 'What would you like to do?',
		options: [
			{
				value: 'analytics',
				label: '📊 View Analytics Dashboard',
				hint: 'Interactive data exploration',
			},
			{
				value: 'configure',
				label: '⚙️  Configure Statusline',
				hint: 'Setup hooks and data collection',
			},
			{
				value: 'quick_stats',
				label: '⚡ Quick Stats',
				hint: 'Brief overview of recent activity',
			},
		],
	});

	if (isCancel(main_action)) {
		cancel('Operation cancelled.');
		return;
	}

	if (main_action === 'quick_stats') {
		await show_quick_stats();
		return;
	}

	if (main_action === 'analytics') {
		await run_analytics_dashboard();
		return;
	}

	if (main_action === 'configure') {
		const name = await text({
			message: 'What would you like to call this configuration?',
			placeholder: 'My Statusline Config',
			validate(value) {
				if (value.length === 0)
					return `Configuration name is required!`;
			},
		});

		if (isCancel(name)) {
			cancel('Configuration cancelled.');
			return;
		}

		const data_collection = await select({
			message: 'Enable core data collection (sessions, projects)?',
			options: [
				{
					value: true,
					label:
						'Enabled - Collect session and project data (default)',
				},
				{
					value: false,
					label: 'Disabled - No data collection (package disabled)',
				},
			],
		});

		if (isCancel(data_collection)) {
			cancel('Configuration cancelled.');
			return;
		}

		const performance_logging = await select({
			message: 'Enable performance logging for debugging?',
			options: [
				{
					value: false,
					label: 'Disabled - No performance logging (default)',
				},
				{
					value: true,
					label: 'Enabled - Log hook execution times for debugging',
				},
			],
		});

		if (isCancel(performance_logging)) {
			cancel('Configuration cancelled.');
			return;
		}

		// Save configuration to ~/.claude/statusline-config.json
		save_global_config({
			name: name as string,
			data_collection: data_collection as boolean,
			performance_logging: performance_logging as boolean,
		});

		outro(
			`Configuration "${name}" saved!\nData collection: ${data_collection}\nPerformance logging: ${performance_logging}`,
		);
	} else {
		outro('No configuration changes made.');
	}
}

async function show_quick_stats() {
	const s = spinner();
	s.start('Loading your Claude Code stats...');

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

	s.stop('Stats loaded!');

	console.log(chalk.cyan('\n📈 Last 7 Days Summary:'));
	console.log(`  Sessions: ${stats.total_sessions}`);
	console.log(
		`  Cost: $${Number(String(stats.total_cost || 0)).toFixed(2)}`,
	);
	console.log(`  Projects: ${stats.total_projects}`);
	console.log(`  Tool Calls: ${stats.total_tools}`);

	outro(
		'Quick stats complete! Use Analytics Dashboard for detailed views.',
	);
}

async function run_analytics_dashboard() {
	while (true) {
		const analytics_choice = await select({
			message: 'Choose analytics to view:',
			options: [
				{
					value: 'costs',
					label: '💰 Cost Analytics',
					hint: 'Daily spend trends with ASCII line charts',
				},
				{
					value: 'tools',
					label: '🔧 Tool Usage',
					hint: 'Tool usage statistics with clean tables',
				},
				{
					value: 'activity',
					label: '📈 Activity Patterns',
					hint: 'Activity heatmap with ASCII blocks',
				},
				{
					value: 'back',
					label: '← Back to Main Menu',
				},
			],
		});

		if (isCancel(analytics_choice) || analytics_choice === 'back') {
			break;
		}

		// Ask for days for analytics
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

	outro('Analytics session complete!');
}

async function show_costs_analytics(days: number) {
	const s = spinner();
	s.start(`Analyzing ${days} days of cost data...`);

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

	s.stop('Cost analysis complete!');

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
	const s = spinner();
	s.start(`Analyzing ${days} days of tool usage...`);

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

	s.stop('Tool analysis complete!');

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

async function show_activity_analytics(days: number) {
	const s = spinner();
	s.start(`Analyzing ${days} days of activity patterns...`);

	const db = get_database();

	// Get hourly activity data for heatmap
	const hourly_activity = db
		.prepare(
			`
		SELECT 
			strftime('%w', started_at) as day_of_week,
			strftime('%H', started_at) as hour,
			COUNT(*) as session_count
		FROM sessions s
		WHERE s.started_at >= datetime('now', '-${Math.min(days, 7)} days')
		AND s.started_at IS NOT NULL
		GROUP BY strftime('%w', started_at), strftime('%H', started_at)
	`,
		)
		.all() as {
		day_of_week: string;
		hour: string;
		session_count: number;
	}[];

	s.stop('Activity analysis complete!');

	if (hourly_activity.length === 0) {
		console.log(
			chalk.yellow(
				'\nNo activity data found for the specified period.',
			),
		);
		return;
	}

	console.log(
		chalk.blue.bold(
			`\nActivity Heatmap (Last ${Math.min(days, 7)} Days)\n`,
		),
	);

	// Create 2D activity grid: [day][hour]
	const activity_grid: number[][] = [];
	const day_labels = [
		'Sun',
		'Mon',
		'Tue',
		'Wed',
		'Thu',
		'Fri',
		'Sat',
	];
	const hour_labels = ['0', '4', '8', '12', '16', '20', '24'];

	// Initialize grid with zeros
	for (let day = 0; day < 7; day++) {
		activity_grid[day] = new Array(24).fill(0);
	}

	// Fill grid with actual data
	hourly_activity.forEach((row) => {
		const day = parseInt(row.day_of_week);
		const hour = parseInt(row.hour);
		activity_grid[day][hour] = row.session_count;
	});

	// Sample every 4 hours for display (0, 4, 8, 12, 16, 20)
	const sampled_grid = activity_grid.map((day_row) =>
		[0, 4, 8, 12, 16, 20].map((hour) => day_row[hour]),
	);

	const heatmap = create_activity_heatmap(sampled_grid, {
		days: day_labels,
		hours: hour_labels.slice(0, 6), // Remove the last '24'
	});

	console.log(heatmap);
}

// Clean implementations following CONSOLE-GRAPHS.md specification will be added here
