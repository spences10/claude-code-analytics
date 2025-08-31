import { confirm, isCancel, select, text } from '@clack/prompts';
import chalk from 'chalk';
import { get_database } from '../../database';
import { CostRow, ToolRow } from '../../types';
import {
	create_bar_chart,
	create_line_chart,
	create_summary_table,
	create_usage_table,
} from '../../utils/charts';
import { show_activity_analytics } from '../analytics/activity';
import { show_activity_condensed } from '../analytics/activity_condensed';
import { show_cache_efficiency } from '../analytics/cache';
import { show_cost_hotspots } from '../analytics/cost_hotspots';
import { show_error_trends } from '../analytics/error_trends';
import { show_files_analytics } from '../analytics/files';
import { show_latency_distributions } from '../analytics/latency';
import { show_models_analytics } from '../analytics/models';
import { show_overview_dashboard } from '../analytics/overview';
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
import { show_quick_stats } from '../analytics/summary';
import { show_token_usage } from '../analytics/tokens';

type AnalyticsHandler = (days: number) => Promise<void>;

const ANALYTICS: Record<
	string,
	{ label: string; hint?: string; run: AnalyticsHandler }
> = {
	overview: {
		label: 'Overview Dashboard',
		hint: 'Summary, cost trend, tools, 24h activity',
		run: show_overview_dashboard,
	},
	costs: {
		label: 'Cost Analytics',
		hint: 'Daily spend trends with ASCII line charts',
		run: show_costs_analytics,
	},
	tools: {
		label: 'Tool Usage',
		hint: 'Tool usage statistics with clean tables',
		run: show_tools_analytics,
	},
	activity: {
		label: 'Activity Patterns',
		hint: 'Activity heatmap with ASCII blocks',
		run: show_activity_analytics,
	},
	activity_condensed: {
		label: 'Activity (Condensed)',
		hint: '2-hour blocks heatmap for compact display',
		run: show_activity_condensed,
	},
	productivity: {
		label: 'Productivity Metrics',
		hint: 'Lines changed per session/dollar efficiency',
		run: show_productivity_analytics,
	},
	projects: {
		label: 'Project Intelligence',
		hint: 'Cross-project comparison and insights',
		run: show_projects_analytics,
	},
	files: {
		label: 'File Operations',
		hint: 'Most modified files and access patterns',
		run: show_files_analytics,
	},
	models: {
		label: 'Model Performance',
		hint: 'Model efficiency and cost comparison',
		run: show_models_analytics,
	},
	performance: {
		label: 'Hook Performance',
		hint: 'Hook execution times and overhead analysis',
		run: show_performance_analytics,
	},
	latency: {
		label: 'Tool Latency Distros',
		hint: 'p50/p95/p99 execution times per tool',
		run: show_latency_distributions,
	},
	success: {
		label: 'Tool Success Rates',
		hint: 'Tool reliability and failure analysis',
		run: show_tool_success_analytics,
	},
	error_trends: {
		label: 'Error Trend',
		hint: 'Failures per day and top offenders',
		run: show_error_trends,
	},
	quality: {
		label: 'Session Quality',
		hint: 'Session metrics and end reasons',
		run: show_session_quality_analytics,
	},
	errors: {
		label: 'Error Analysis',
		hint: 'Common errors and troubleshooting insights',
		run: show_error_analysis,
	},
	cache: {
		label: 'Cache Efficiency',
		hint: 'Cache reads, created tokens, hit rate',
		run: show_cache_efficiency,
	},
	tokens: {
		label: 'Token Usage',
		hint: 'Input/output tokens by model',
		run: show_token_usage,
	},
	cost_hotspots: {
		label: 'Cost Hotspots',
		hint: 'Top costly sessions and cost-by-hour',
		run: show_cost_hotspots,
	},
	quick: {
		label: 'Quick Stats',
		hint: '7-day summary at a glance',
		run: async (days: number) => {
			// ignore days parameter; quick stats shows last 7 days by default
			await show_quick_stats();
		},
	},
};
export { show_quick_stats } from '../analytics/summary';

export async function run_analytics_dashboard() {
	while (true) {
		const options = [
			...Object.entries(ANALYTICS).map(
				([value, { label, hint }]) => ({
					value,
					label,
					hint,
				}),
			),
			{ value: 'back', label: 'Back to Main Menu' },
		];

		const analytics_choice = await select({
			message: 'Choose analytics to view:',
			options,
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
			const handler = ANALYTICS[String(analytics_choice)]?.run;
			if (handler) {
				await handler(day_count);
			} else {
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
	// Bar chart visualization
	const bar_labels = tool_usage.map((t) =>
		t.tool_name.length > 8
			? '...' + t.tool_name.slice(-7)
			: t.tool_name,
	);
	const bar_data = tool_usage.map((t) => t.usage_count);
	console.log(
		create_bar_chart(bar_data, bar_labels, { height: 8, width: 2 }),
	);
	console.log();

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
