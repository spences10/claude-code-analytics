import chalk from 'chalk';
import { get_database } from '../../database';
import { create_usage_table } from '../../utils/charts';

function percentile(values: number[], p: number): number {
	if (!values.length) return 0;
	const sorted = [...values].sort((a, b) => a - b);
	const idx = Math.min(
		sorted.length - 1,
		Math.max(0, Math.round(p * (sorted.length - 1))),
	);
	return sorted[idx];
}

export async function show_latency_distributions(days: number) {
	const db = get_database();

	const tool_durations = db
		.prepare(
			`
      SELECT tc.tool_name, tc.execution_time_ms as ms
      FROM tool_calls tc
      JOIN sessions s ON s.session_id = tc.session_id
      WHERE s.started_at >= datetime('now', '-${days} days') AND tc.execution_time_ms IS NOT NULL
    `,
		)
		.all() as { tool_name: string; ms: number }[];

	if (!tool_durations.length) {
		console.log(
			chalk.yellow('\nNo latency data for the selected period.'),
		);
		return;
	}

	const by_tool = new Map<string, number[]>();
	tool_durations.forEach(({ tool_name, ms }) => {
		const arr = by_tool.get(tool_name) || [];
		arr.push(ms);
		by_tool.set(tool_name, arr);
	});

	console.log(
		chalk.blue.bold(`\nTool Latency (ms) (Last ${days} Days)\n`),
	);
	const rows: string[][] = [];
	for (const [tool, arr] of [...by_tool.entries()]
		.sort((a, b) => b[1].length - a[1].length)
		.slice(0, 12)) {
		rows.push([
			tool,
			arr.length.toString(),
			percentile(arr, 0.5).toFixed(0),
			percentile(arr, 0.95).toFixed(0),
			percentile(arr, 0.99).toFixed(0),
		]);
	}
	const table = create_usage_table(
		['Tool', 'Count', 'p50', 'p95', 'p99'],
		rows,
	);
	console.log(table);
}
