import { show_analytics_report } from './utils';

interface ModelRow {
	model_name: string;
	session_count: number;
	total_cost: number;
	avg_cost_per_session: number;
	total_lines: number;
	efficiency_score: number;
}

export async function show_models_analytics(days: number) {
	const query = `
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
	`;

	show_analytics_report<ModelRow>({
		title: 'Model Performance',
		query,
		days,
		table_headers: [
			'Model',
			'Sessions',
			'Total Cost',
			'Avg/Session',
			'Lines/$',
		],
		data_mapper: (model) => [
			model.model_name,
			model.session_count.toString(),
			`$${Number(model.total_cost || 0).toFixed(2)}`,
			`$${Number(model.avg_cost_per_session || 0).toFixed(3)}`,
			model.efficiency_score.toFixed(1),
		],
	});
}
