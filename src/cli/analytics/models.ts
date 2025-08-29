import chalk from 'chalk';
import { get_database } from '../../database';
import { create_usage_table } from '../../utils/charts';

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

	const models_data = db
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

	if (models_data.length === 0) {
		console.log(
			chalk.yellow('\nNo model data found for the specified period.'),
		);
		return;
	}

	console.log(
		chalk.blue.bold(`\nModel Performance (Last ${days} Days)\n`),
	);

	const table_data = models_data.map((model) => [
		model.model_name,
		model.session_count.toString(),
		`$${Number(model.total_cost || 0).toFixed(2)}`,
		`$${Number(model.avg_cost_per_session || 0).toFixed(3)}`,
		model.efficiency_score.toFixed(1),
	]);

	const table = create_usage_table(
		['Model', 'Sessions', 'Total Cost', 'Avg/Session', 'Lines/$'],
		table_data,
	);
	console.log(table);
}
