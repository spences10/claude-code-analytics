import { plot } from 'asciichart';
import chalk from 'chalk';
import Table from 'cli-table3';

export interface LineChartOptions {
	height?: number;
	format?: (value: number) => string;
	padding?: string;
	offset?: number;
	width?: number;
}

export interface BarChartOptions {
	height?: number;
	width?: number;
	padding?: string;
}

function interpolate_data(
	data: number[],
	target_width: number,
): number[] {
	if (data.length >= target_width) return data;
	if (data.length < 2) return data;

	const result: number[] = [];
	const step = (data.length - 1) / (target_width - 1);

	for (let i = 0; i < target_width; i++) {
		const position = i * step;
		const index = Math.floor(position);
		const fraction = position - index;

		if (index >= data.length - 1) {
			result.push(data[data.length - 1]);
		} else {
			// Linear interpolation between two points
			const value =
				data[index] + (data[index + 1] - data[index]) * fraction;
			result.push(value);
		}
	}

	return result;
}

export function create_line_chart(
	data: number[],
	options: LineChartOptions = {},
): string {
	// Use the actual format function passed in, or default
	const user_format = options.format || ((x: number) => x.toFixed(2));

	// Calculate target chart width (terminal width minus y-axis space)
	const terminal_width = process.stdout.columns || 80;
	const max_value = Math.max(...data);
	const min_value = Math.min(...data);
	const max_label_length = Math.max(
		user_format(max_value).length,
		user_format(min_value).length,
	);
	const y_axis_space = max_label_length + 3;
	const target_chart_width = Math.min(
		options.width || terminal_width - y_axis_space - 5, // -5 for safety margin
		60, // Max reasonable width
	);

	// Only interpolate if we have multiple data points and need more width
	const chart_data =
		data.length >= 2 && data.length < target_chart_width
			? interpolate_data(
					data,
					Math.max(target_chart_width, data.length),
				)
			: data;

	// Create padding function for consistent right-alignment
	const format_with_padding = (x: number) => {
		const label = user_format(x);
		const padding = ' '.repeat(max_label_length);
		return (padding + label).slice(-max_label_length);
	};

	const dynamic_offset = Math.max(3, max_label_length + 3);

	return plot(chart_data, {
		height: options.height || 8,
		format: format_with_padding,
		offset: dynamic_offset,
	});
}

export function create_bar_chart(
	data: number[],
	labels?: string[],
	options: BarChartOptions = {},
): string {
	const max_value = Math.max(...data);
	const height = options.height || 10;
	const width = options.width || 3;

	let result = '';

	// Create horizontal bars
	for (let i = height; i > 0; i--) {
		const threshold = (max_value / height) * i;
		let line = '';

		data.forEach((value, index) => {
			if (value >= threshold) {
				line += '█'.repeat(width);
			} else {
				line += ' '.repeat(width);
			}
			line += ' ';
		});

		result += `${threshold.toFixed(0).padStart(4)} ┤${line}\n`;
	}

	// Add bottom line with labels if provided
	if (labels) {
		const bottom_line =
			'     └' + '─'.repeat(data.length * (width + 1));
		result += bottom_line + '\n';

		let label_line = '      ';
		labels.forEach((label) => {
			label_line += label.substring(0, width).padEnd(width + 1);
		});
		result += label_line;
	}

	return result;
}

export function create_summary_table(data: string[][]): string {
	const table = new Table({
		chars: {
			top: '',
			'top-mid': '',
			'top-left': '',
			'top-right': '',
			bottom: '',
			'bottom-mid': '',
			'bottom-left': '',
			'bottom-right': '',
			left: '',
			'left-mid': '',
			mid: '',
			'mid-mid': '',
			right: '',
			'right-mid': '',
			middle: '│',
		},
		style: {
			head: [],
			border: [],
			'padding-left': 0,
			'padding-right': 2,
		},
	});

	data.forEach(([key, value]) => {
		table.push([chalk.cyan(key), chalk.white(value)]);
	});

	return table.toString();
}

export function create_usage_table(
	headers: string[],
	data: string[][],
): string {
	const table = new Table({
		head: headers.map((h) => chalk.cyan(h)),
		style: {
			head: [],
			border: [],
		},
	});

	data.forEach((row) => {
		table.push(row);
	});

	return table.toString();
}

export function create_activity_heatmap(
	data: number[][],
	labels?: { days: string[]; hours: string[] },
): string {
	const chars = ['░░', '▓▓', '██']; // Low, medium, high activity
	const max_value = Math.max(...data.flat());

	let result = '';

	// Header with hours
	if (labels?.hours) {
		result += '     ' + labels.hours.join('  ') + '\n';
	}

	// Heatmap rows
	data.forEach((row, dayIndex) => {
		const day_label = labels?.days?.[dayIndex] || `Day ${dayIndex}`;
		let line = day_label.padEnd(5);

		row.forEach((value) => {
			const intensity =
				max_value > 0
					? Math.floor((value / max_value) * (chars.length - 1))
					: 0;
			line += chars[intensity] + ' ';
		});

		result += line + '\n';
	});

	// Legend
	result += '\n██ High Activity  ▓▓ Medium  ░░ Low';

	return result;
}
