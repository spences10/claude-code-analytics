import chalk from 'chalk';
import { get_database } from '../../database';
import { create_usage_table } from '../../utils/charts';

interface FileRow {
	file_path: string;
	total_lines_changed: number;
	read_ops: number;
	write_ops: number;
	last_accessed: string;
}

export async function show_files_analytics(days: number) {
	const db = get_database();

	const files_data = db
		.prepare(
			`
		SELECT 
			f.file_path,
			f.total_lines_changed,
			f.total_read_operations as read_ops,
			f.total_write_operations as write_ops,
			datetime(f.last_accessed_at) as last_accessed
		FROM files f
		JOIN file_operations fo ON f.file_id = fo.file_id
		JOIN sessions s ON fo.session_id = s.session_id
		WHERE s.started_at >= datetime('now', '-${days} days')
		AND s.started_at IS NOT NULL
		GROUP BY f.file_id
		ORDER BY f.total_write_operations DESC
		LIMIT 15
	`,
		)
		.all() as FileRow[];

	if (files_data.length === 0) {
		console.log(
			chalk.yellow(
				'\nNo file operation data found for the specified period.',
			),
		);
		return;
	}

	console.log(
		chalk.blue.bold(`\nFile Operations (Last ${days} Days)\n`),
	);

	const table_data = files_data.map((file) => [
		file.file_path.length > 30
			? '...' + file.file_path.slice(-27)
			: file.file_path,
		file.read_ops.toString(),
		file.write_ops.toString(),
		file.last_accessed ? file.last_accessed.split(' ')[0] : 'N/A',
	]);

	const table = create_usage_table(
		['File Path', 'Reads', 'Writes', 'Last Access'],
		table_data,
	);
	console.log(table);
}
