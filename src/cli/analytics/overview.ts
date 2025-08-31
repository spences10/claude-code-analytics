import chalk from 'chalk';
import { get_database } from '../../database';
import {
	create_activity_heatmap,
	create_bar_chart,
	create_dashboard_box,
	create_line_chart,
} from '../../utils/charts';

interface StatsRow {
	total_sessions: number;
	total_cost: number;
	total_projects: number;
	total_tools: number;
}

function get_stats_for_range(where_clause: string): StatsRow {
	const db = get_database();
	const stats = db
		.prepare(
			`
SELECT
  (SELECT COUNT(DISTINCT session_id) FROM sessions WHERE ${where_clause}) AS total_sessions,
  (SELECT SUM(total_cost_usd) FROM sessions WHERE ${where_clause}) AS total_cost,
  (SELECT COUNT(DISTINCT project_id) FROM sessions WHERE ${where_clause}) AS total_projects,
  (SELECT COUNT(*) FROM tool_calls tc JOIN sessions s2 ON s2.session_id = tc.session_id WHERE ${where_clause.replace(
		/started_at/g,
		's2.started_at',
	)}) AS total_tools
`,
		)
		.get() as StatsRow;
	return stats;
}

function format_delta(current: number, previous: number): string {
	const curr = Number(current || 0);
	const prev = Number(previous || 0);
	if (!isFinite(curr) || !isFinite(prev)) return chalk.dim('(n/a)');
	if (prev === 0 && curr === 0) return chalk.dim('(0%)');
	if (prev === 0) return chalk.green('(new)');
	const change = ((curr - prev) / prev) * 100;
	const arrow = change >= 0 ? '^' : 'v';
	const color = change >= 0 ? chalk.green : chalk.red;
	return color(`${arrow} ${Math.abs(change).toFixed(1)}%`);
}

export async function show_overview_dashboard(days: number) {
	const db = get_database();

	// Summary box with deltas
	const current = get_stats_for_range(
		`started_at >= datetime('now', '-${days} days')`,
	);
	const previous = get_stats_for_range(
		`started_at < datetime('now', '-${days} days') AND started_at >= datetime('now', '-${days * 2} days')`,
	);

	const summary_lines = [
		`Sessions: ${current.total_sessions}  ${format_delta(
			current.total_sessions,
			previous.total_sessions,
		)}`,
		`Cost:    $${Number(current.total_cost || 0).toFixed(2)}  ${format_delta(
			Number(current.total_cost || 0),
			Number(previous.total_cost || 0),
		)}`,
		`Projects: ${current.total_projects}  ${format_delta(
			current.total_projects,
			previous.total_projects,
		)}`,
		`Tool Calls: ${current.total_tools}  ${format_delta(
			current.total_tools,
			previous.total_tools,
		)}`,
	];

	console.log(
		create_dashboard_box(
			`Overview (Last ${days} Days)`,
			summary_lines,
		),
	);
	console.log();

	// Cost trend box
	const daily_costs = db
		.prepare(
			`
      SELECT DATE(started_at) as date, SUM(total_cost_usd) as daily_cost
      FROM sessions
      WHERE started_at >= datetime('now', '-${days} days') AND started_at IS NOT NULL
      GROUP BY DATE(started_at)
      ORDER BY date
    `,
		)
		.all() as { date: string; daily_cost: number }[];

	if (daily_costs.length > 0) {
		const costs = daily_costs.map((d) => Number(d.daily_cost || 0));
		const chart = create_line_chart(costs, {
			height: 6,
			format: (x) => '$' + x.toFixed(2),
		});
		console.log(
			create_dashboard_box('Cost Trend', chart.split('\n')),
		);
		console.log();
	}

	// Top tools bar chart box
	const tool_usage = db
		.prepare(
			`
      SELECT tc.tool_name, COUNT(*) as usage_count
      FROM tool_calls tc
      JOIN sessions s ON tc.session_id = s.session_id
      WHERE s.started_at >= datetime('now', '-${days} days')
      GROUP BY tc.tool_name
      ORDER BY usage_count DESC
      LIMIT 8
    `,
		)
		.all() as { tool_name: string; usage_count: number }[];

	if (tool_usage.length > 0) {
		const tool_labels = tool_usage.map((t) =>
			t.tool_name.length > 8
				? '...' + t.tool_name.slice(-7)
				: t.tool_name,
		);
		const tool_data = tool_usage.map((t) => t.usage_count);
		const bars = create_bar_chart(tool_data, tool_labels, {
			height: 6,
			width: 2,
		});
		console.log(create_dashboard_box('Top Tools', bars.split('\n')));
		console.log();
	}

	// 24h activity heat strip
	const hourly_activity = db
		.prepare(
			`
      SELECT strftime('%H', started_at) as hour, COUNT(*) as session_count
      FROM sessions
      WHERE started_at >= datetime('now', '-1 day')
      GROUP BY strftime('%H', started_at)
      ORDER BY hour
    `,
		)
		.all() as { hour: string; session_count: number }[];

	const activity_strip: number[] = new Array(24).fill(0);
	hourly_activity.forEach((r) => {
		const h = parseInt(r.hour, 10);
		if (!Number.isNaN(h)) activity_strip[h] = r.session_count;
	});
	const heat = create_activity_heatmap([activity_strip], {
		days: ['24h'],
		hours: Array.from({ length: 24 }, (_, i) =>
			i.toString().padStart(2, '0'),
		),
	});
	console.log(
		create_dashboard_box('Activity (Last 24h)', heat.split('\n')),
	);
}
