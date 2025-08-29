import chalk from 'chalk';
import { get_database } from '../../database';
import { create_usage_table } from '../../utils/charts';

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
	const db = get_database();

	const hook_performance = db
		.prepare(
			`
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
	`,
		)
		.all() as HookPerformanceRow[];

	if (hook_performance.length === 0) {
		console.log(
			chalk.yellow(
				'\nNo hook performance data found for the specified period.',
			),
		);
		return;
	}

	console.log(
		chalk.blue.bold(`\nHook Performance (Last ${days} Days)\n`),
	);

	const table_data = hook_performance.map((hook) => [
		hook.event_type,
		hook.total_events.toString(),
		`${hook.avg_execution_time.toFixed(2)}ms`,
		`${hook.max_execution_time}ms`,
		`${hook.total_time_spent.toFixed(0)}ms`,
	]);

	const table = create_usage_table(
		['Hook Type', 'Count', 'Avg Time', 'Max Time', 'Total'],
		table_data,
	);
	console.log(table);

	const total_hook_time = hook_performance.reduce(
		(sum, h) => sum + h.total_time_spent,
		0,
	);
	console.log(
		chalk.cyan(
			`\nTotal Hook Overhead: ${total_hook_time.toFixed(0)}ms`,
		),
	);
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

	const table_data = tool_success.map((tool) => [
		tool.tool_name.length > 20
			? '...' + tool.tool_name.slice(-17)
			: tool.tool_name,
		tool.total_calls.toString(),
		tool.successful.toString(),
		tool.failed.toString(),
		`${tool.success_rate}%`,
		tool.avg_execution_time
			? `${tool.avg_execution_time.toFixed(0)}ms`
			: 'N/A',
	]);

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
