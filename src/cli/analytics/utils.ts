import chalk from 'chalk';
import { get_database } from '../../database';
import { create_usage_table } from '../../utils/charts';

export interface AnalyticsReportOptions<T> {
	title: string;
	query: string;
	table_headers: string[];
	data_mapper: (row: T) => string[];
	days: number;
}

export function show_analytics_report<T>(
	options: AnalyticsReportOptions<T>,
): void {
	const { title, query, table_headers, data_mapper, days } = options;

	const db = get_database();

	const data = db.prepare(query).all() as T[];

	if (data.length === 0) {
		console.log(
			chalk.yellow(`
No data found for ${title.toLowerCase()} in the specified period.`),
		);
		return;
	}

	console.log(
		chalk.blue.bold(`
${title} (Last ${days} Days)
`),
	);

	const table_data = data.map(data_mapper);

	const table = create_usage_table(table_headers, table_data);
	console.log(table);
}
