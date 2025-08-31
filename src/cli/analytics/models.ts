import chalk from 'chalk';
import { get_database } from '../../database';
import {
	create_bar_chart,
	create_usage_table,
} from '../../utils/charts';

interface ModelRow {
	model_name: string;
	session_count: number;
	total_cost: number;
	avg_cost_per_session: number;
	total_lines: number;
	efficiency_score: number;
}

export async function show_models_analytics(days: number) {
	const db = get_database();
	const rows = db
		.prepare(
			`
        SELECT 
            COALESCE(model_display_name, 'Unknown') as model_name,
            COUNT(*) as session_count,
            SUM(total_cost_usd) as total_cost,
            AVG(total_cost_usd) as avg_cost_per_session,
            SUM(total_lines_added + total_lines_removed) as total_lines,
            CASE 
                WHEN SUM(total_cost_usd) > 0 
                THEN SUM(total_lines_added + total_lines_removed) / SUM(total_cost_usd)
                ELSE 0 
            END as efficiency_score
        FROM sessions 
        WHERE started_at >= datetime('now', '-${days} days')
        AND started_at IS NOT NULL
        GROUP BY model_display_name
        ORDER BY session_count DESC
    `,
		)
		.all() as ModelRow[];

	if (rows.length === 0) {
		console.log(
			chalk.yellow('\nNo model data found for the specified period.'),
		);
		return;
	}

	console.log(
		chalk.blue.bold(`\nModel Performance (Last ${days} Days)\n`),
	);

	// Bar chart by sessions per model
	const labels = rows.map((r) =>
		r.model_name.length > 10
			? '…' + r.model_name.slice(-9)
			: r.model_name,
	);
	const data = rows.map((r) => r.session_count);
	console.log(
		create_bar_chart(data, labels, { height: 8, width: 2 }),
	);
	console.log();

	const table = create_usage_table(
		['Model', 'Sessions', 'Total Cost', 'Avg/Session', 'Lines/$'],
		rows.map((model) => [
			model.model_name,
			model.session_count.toString(),
			`$${Number(model.total_cost || 0).toFixed(2)}`,
			`$${Number(model.avg_cost_per_session || 0).toFixed(3)}`,
			model.efficiency_score.toFixed(1),
		]),
	);
	console.log(table);
}
