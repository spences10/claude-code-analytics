import chalk from 'chalk';
import { show_analytics_report } from './utils';

interface ProjectRow {
	project_name: string;
	session_count: number;
	total_cost: number;
	total_lines: number;
	avg_cost_per_session: number;
	productivity_score: number;
}

export async function show_projects_analytics(days: number) {
	const query = `
		SELECT 
			p.project_name,
			COUNT(DISTINCT s.session_id) as session_count,
			SUM(s.total_cost_usd) as total_cost,
			SUM(s.total_lines_added + s.total_lines_removed) as total_lines,
			AVG(s.total_cost_usd) as avg_cost_per_session,
			CASE 
				WHEN SUM(s.total_lines_added + s.total_lines_removed) > 0 AND SUM(s.total_cost_usd) > 0
				THEN (SUM(s.total_lines_added + s.total_lines_removed) * 1.0) / SUM(s.total_cost_usd)
				ELSE 0 
			END as productivity_score
		FROM projects p
		JOIN sessions s ON p.project_id = s.project_id
		WHERE s.started_at >= datetime('now', '-${days} days')
		AND s.started_at IS NOT NULL
		GROUP BY p.project_id, p.project_name
		ORDER BY session_count DESC
	`;

	show_analytics_report<ProjectRow>({
		title: 'Project Intelligence',
		query,
		days,
		table_headers: [
			'Project',
			'Sessions',
			'Cost',
			'Lines',
			'Prod Score',
		],
		data_mapper: (project) => [
			project.project_name.length > 25
				? '...' + project.project_name.slice(-22)
				: project.project_name,
			project.session_count.toString(),
			`${Number(project.total_cost || 0).toFixed(2)}`,
			project.total_lines.toString(),
			project.productivity_score.toFixed(1),
		],
	});

	console.log(
		chalk.dim('\nProd Score = Lines changed per dollar spent'),
	);
}
