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
import {
	ActivityRow,
	CostRow,
	SessionRow,
	StatsRow,
	ToolRow,
} from '../types';
import {
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
					hint: 'Daily spend trends and cost breakdown',
				},
				{
					value: 'tools',
					label: '🔧 Tool Usage',
					hint: 'Most used tools and efficiency metrics',
				},
				{
					value: 'activity',
					label: '📈 Activity Patterns',
					hint: 'Session timing and activity heatmaps',
				},
				{
					value: 'sessions',
					label: '⚡ Session Productivity',
					hint: 'Duration, lines changed, efficiency',
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
			case 'sessions':
				await show_sessions_analytics(day_count);
				break;
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

	console.log(
		chalk.blue.bold(`\n💰 Cost Analytics (Last ${days} days)\n`),
	);

	if (daily_costs.length > 1) {
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
			   ), 1) as percentage,
			   ROUND(AVG(tc.execution_time_ms), 0) as avg_execution_ms,
			   SUM(CASE WHEN tc.success = 0 THEN 1 ELSE 0 END) as error_count
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

	console.log(
		chalk.blue.bold(
			`\n🔧 Tool Usage Analytics (Last ${days} days)\n`,
		),
	);

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
}

async function show_activity_analytics(days: number) {
	const s = spinner();
	s.start(`Analyzing ${days} days of activity patterns...`);

	const db = get_database();

	const daily_activity = db
		.prepare(
			`
		SELECT 
		  DATE(started_at) as date,
		  COUNT(*) as session_count,
		  SUM(duration_ms) / 1000.0 / 60.0 as total_minutes
		FROM sessions s
		WHERE s.started_at >= datetime('now', '-${days} days')
		AND s.started_at IS NOT NULL
		GROUP BY DATE(started_at)
		ORDER BY date DESC
	`,
		)
		.all() as ActivityRow[];

	s.stop('Activity analysis complete!');

	if (daily_activity.length === 0) {
		console.log(
			chalk.yellow(
				'\nNo activity data found for the specified period.',
			),
		);
		return;
	}

	console.log(
		chalk.blue.bold(`\n📈 Activity Analytics (Last ${days} days)\n`),
	);

	console.log(chalk.green.bold('📊 Daily Activity:'));
	daily_activity.forEach((day) => {
		const minutes = Number(day.total_minutes) || 0;
		console.log(
			`${chalk.cyan(day.date)}: ${day.session_count} sessions, ${minutes.toFixed(1)} min`,
		);
	});

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
		['Total Active Time', `${(total_minutes / 60).toFixed(1)} hours`],
		['Avg Sessions/Day', avg_sessions_per_day.toFixed(1)],
		['Active Days', daily_activity.length.toString()],
	];

	console.log(chalk.magenta.bold('\n📋 Summary:'));
	console.log(create_summary_table(summary_data));
}

async function show_sessions_analytics(days: number) {
	const s = spinner();
	s.start(`Analyzing ${days} days of session data...`);

	const db = get_database();

	const session_metrics = db
		.prepare(
			`
		SELECT 
		  s.started_at,
		  s.duration_ms / 1000.0 / 60.0 as duration_minutes,
		  s.total_cost_usd,
		  s.total_lines_added + s.total_lines_removed as lines_changed,
		  COUNT(tc.tool_call_id) as tool_calls,
		  p.project_name
		FROM sessions s
		LEFT JOIN tool_calls tc ON s.session_id = tc.session_id
		LEFT JOIN projects p ON s.project_id = p.project_id
		WHERE s.started_at >= datetime('now', '-${days} days')
		AND s.started_at IS NOT NULL
		GROUP BY s.session_id
		ORDER BY s.started_at DESC
		LIMIT 10
	`,
		)
		.all() as SessionRow[];

	s.stop('Session analysis complete!');

	if (session_metrics.length === 0) {
		console.log(
			chalk.yellow(
				'\nNo session data found for the specified period.',
			),
		);
		return;
	}

	console.log(
		chalk.blue.bold(`\n⚡ Session Analytics (Last ${days} days)\n`),
	);

	console.log(chalk.green.bold('🚀 Recent Sessions:'));
	const session_table_data = session_metrics.map((session) => {
		const duration = Number(session.duration_minutes) || 0;
		const cost = Number(session.total_cost_usd) || 0;
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
		];
	});

	const session_table = create_usage_table(
		['Date', 'Project', 'Duration', 'Cost', 'Lines', 'Efficiency'],
		session_table_data,
	);
	console.log(session_table);

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

	const productivity_data = [
		['Avg Duration', `${avg_duration.toFixed(1)} minutes`],
		['Avg Cost/Session', `$${avg_cost.toFixed(2)}`],
		['Lines per $1', lines_per_dollar.toFixed(0)],
		['Total Productivity', `${total_lines} lines changed`],
	];

	console.log(chalk.magenta.bold('\n🎯 Productivity Metrics:'));
	console.log(create_summary_table(productivity_data));
}
