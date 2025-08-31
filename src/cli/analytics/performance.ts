import chalk from 'chalk';
import { get_database } from '../../database';
import { create_usage_table } from '../../utils/charts';
import { show_analytics_report } from './utils';

interface HookPerformanceRow {
	event_type: string;
	total_events: number;
	avg_execution_time: number;
	max_execution_time: number;
	total_time_spent: number;
}

interface ToolSuccessRow {
	tool_name: string;
	total_calls: number;
	successful: number;
	failed: number;
	unknown: number;
	success_rate: number;
	avg_execution_time: number;
}

export async function show_performance_analytics(days: number) {
	const query = `
		SELECT 
			event_type,
			COUNT(*) as total_events,
			AVG(execution_time_ms) as avg_execution_time,
			MAX(execution_time_ms) as max_execution_time,
			SUM(execution_time_ms) as total_time_spent
		FROM hook_events 
		WHERE timestamp >= datetime('now', '-${days} days')
		AND execution_time_ms > 0
		GROUP BY event_type
		ORDER BY avg_execution_time DESC
	`;

	show_analytics_report<HookPerformanceRow>({
		title: 'Hook Performance',
		query,
		days,
		table_headers: [
			'Hook Type',
			'Count',
			'Avg Time',
			'Max Time',
			'Total',
		],
		data_mapper: (hook) => [
			hook.event_type,
			hook.total_events.toString(),
			`${hook.avg_execution_time.toFixed(2)}ms`,
			`${hook.max_execution_time}ms`,
			`${hook.total_time_spent.toFixed(0)}ms`,
		],
	});
}

export async function show_tool_success_analytics(days: number) {
	const db = get_database();

	const tool_success = db
		.prepare(
			`
		SELECT 
			tc.tool_name,
			COUNT(*) as total_calls,
			SUM(CASE WHEN tc.success = 1 THEN 1 ELSE 0 END) as successful,
			SUM(CASE WHEN tc.success = 0 THEN 1 ELSE 0 END) as failed,
			SUM(CASE WHEN tc.success IS NULL THEN 1 ELSE 0 END) as unknown,
			ROUND(AVG(CASE WHEN tc.success = 1 THEN 100.0 ELSE 0.0 END), 1) as success_rate,
			AVG(tc.execution_time_ms) as avg_execution_time
		FROM tool_calls tc
		JOIN sessions s ON tc.session_id = s.session_id
		WHERE s.started_at >= datetime('now', '-${days} days')
		AND s.started_at IS NOT NULL
		GROUP BY tc.tool_name
		HAVING COUNT(*) >= 5
		ORDER BY failed DESC, total_calls DESC
		LIMIT 15
	`,
		)
		.all() as ToolSuccessRow[];

	if (tool_success.length === 0) {
		console.log(
			chalk.yellow(
				'\nNo tool success data found for the specified period.',
			),
		);
		return;
	}

	console.log(
		chalk.blue.bold(`\nTool Success Rates (Last ${days} Days)\n`),
	);

	const table_data = tool_success.map((tool) => {
		const name_cell =
			tool.tool_name.length > 20
				? '...' + tool.tool_name.slice(-17)
				: tool.tool_name;
		const failure_rate = 100 - (tool.success_rate || 0);
		const failed_cell =
			failure_rate > 10 || tool.failed >= 5
				? chalk.red(tool.failed.toString())
				: tool.failed.toString();
		const rate_color =
			(tool.success_rate || 0) >= 95
				? chalk.green
				: (tool.success_rate || 0) >= 85
					? chalk.yellow
					: chalk.red;
		const rate_cell = rate_color(`${tool.success_rate}%`);
		const avg_time_cell = tool.avg_execution_time
			? tool.avg_execution_time > 2000
				? chalk.yellow(`${tool.avg_execution_time.toFixed(0)}ms`)
				: `${tool.avg_execution_time.toFixed(0)}ms`
			: 'N/A';
		return [
			name_cell,
			tool.total_calls.toString(),
			tool.successful.toString(),
			failed_cell,
			rate_cell,
			avg_time_cell,
		];
	});

	const table = create_usage_table(
		['Tool', 'Total', 'Success', 'Failed', 'Rate', 'Avg Time'],
		table_data,
	);
	console.log(table);

	const total_failed = tool_success.reduce(
		(sum, t) => sum + t.failed,
		0,
	);
	const total_calls = tool_success.reduce(
		(sum, t) => sum + t.total_calls,
		0,
	);
	const overall_failure_rate = (
		(total_failed / total_calls) *
		100
	).toFixed(1);

	console.log(
		chalk.yellow(
			`\nOverall Failure Rate: ${overall_failure_rate}% (${total_failed}/${total_calls})`,
		),
	);
}
