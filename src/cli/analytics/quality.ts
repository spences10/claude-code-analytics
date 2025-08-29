import chalk from 'chalk';
import { get_database } from '../../database';
import { create_summary_table, create_usage_table } from '../../utils/charts';

interface SessionQualityRow {
	session_id: string;
	duration_minutes: number;
	total_cost: number;
	lines_changed: number;
	tool_calls: number;
	success_rate: number;
	end_reason: string;
}

interface ErrorAnalysisRow {
	tool_name: string;
	error_count: number;
	common_error: string;
	last_error_date: string;
}

export async function show_session_quality_analytics(days: number) {
	const db = get_database();

	const session_quality = db
		.prepare(
			`
		SELECT 
			s.session_id,
			ROUND(s.duration_ms / 1000.0 / 60.0, 1) as duration_minutes,
			s.total_cost_usd as total_cost,
			(s.total_lines_added + s.total_lines_removed) as lines_changed,
			COUNT(tc.tool_call_id) as tool_calls,
			ROUND(AVG(CASE WHEN tc.success = 1 THEN 100.0 ELSE 0.0 END), 1) as success_rate,
			COALESCE(s.end_reason, 'ongoing') as end_reason
		FROM sessions s
		LEFT JOIN tool_calls tc ON s.session_id = tc.session_id
		WHERE s.started_at >= datetime('now', '-${days} days')
		AND s.started_at IS NOT NULL
		GROUP BY s.session_id
		ORDER BY s.started_at DESC
		LIMIT 10
	`,
		)
		.all() as SessionQualityRow[];

	if (session_quality.length === 0) {
		console.log(
			chalk.yellow('\nNo session quality data found for the specified period.'),
		);
		return;
	}

	console.log(chalk.blue.bold(`\nSession Quality (Last ${days} Days)\n`));

	const table_data = session_quality.map((session) => [
		session.session_id.slice(-8),
		`${session.duration_minutes}min`,
		`$${Number(session.total_cost || 0).toFixed(2)}`,
		session.lines_changed.toString(),
		session.tool_calls.toString(),
		`${session.success_rate || 0}%`,
		session.end_reason,
	]);

	const table = create_usage_table(
		['Session', 'Duration', 'Cost', 'Lines', 'Tools', 'Success', 'End'],
		table_data,
	);
	console.log(table);

	const avg_duration = session_quality.reduce((sum, s) => sum + s.duration_minutes, 0) / session_quality.length;
	const avg_success_rate = session_quality.reduce((sum, s) => sum + (s.success_rate || 0), 0) / session_quality.length;

	console.log(chalk.cyan(`\nAvg Session: ${avg_duration.toFixed(1)}min, ${avg_success_rate.toFixed(1)}% success rate`));
}

export async function show_error_analysis(days: number) {
	const db = get_database();

	const error_analysis = db
		.prepare(
			`
		SELECT 
			tc.tool_name,
			COUNT(*) as error_count,
			tc.error_message as common_error,
			DATE(MAX(tc.completed_at)) as last_error_date
		FROM tool_calls tc
		JOIN sessions s ON tc.session_id = s.session_id
		WHERE tc.success = 0
		AND s.started_at >= datetime('now', '-${days} days')
		AND tc.error_message IS NOT NULL
		GROUP BY tc.tool_name, tc.error_message
		ORDER BY error_count DESC
		LIMIT 10
	`,
		)
		.all() as ErrorAnalysisRow[];

	if (error_analysis.length === 0) {
		console.log(
			chalk.yellow('\nNo error data found for the specified period.'),
		);
		return;
	}

	console.log(chalk.blue.bold(`\nError Analysis (Last ${days} Days)\n`));

	const table_data = error_analysis.map((error) => [
		error.tool_name,
		error.error_count.toString(),
		error.common_error.length > 30
			? error.common_error.slice(0, 27) + '...'
			: error.common_error,
		error.last_error_date || 'N/A',
	]);

	const table = create_usage_table(
		['Tool', 'Count', 'Error Message', 'Last Seen'],
		table_data,
	);
	console.log(table);

	const total_errors = error_analysis.reduce((sum, e) => sum + e.error_count, 0);
	console.log(chalk.red(`\nTotal Errors Analyzed: ${total_errors}`));
}