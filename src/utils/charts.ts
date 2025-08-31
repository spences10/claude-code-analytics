import { plot } from 'asciichart';
import chalk from 'chalk';
import Table from 'cli-table3';

// Helper: visible length ignoring ANSI color codes
const ANSI_REGEX = /\x1B\[[0-?]*[ -\/]*[@-~]/g;
function visible_length(str: string): number {
	return str.replace(ANSI_REGEX, '').length;
}

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
	const chars = [
		chalk.gray('░░'), // No/Low activity - gray
		chalk.yellow('▓▓'), // Medium activity - yellow
		chalk.green('██'), // High activity - green
	];

	const flat_data = data.flat().filter((v) => v > 0); // Only non-zero values
	if (flat_data.length === 0) {
		// All zeros, show as low activity
		let result = '';

		if (labels?.hours) {
			let header_line = '    ';
			labels.hours.forEach((hour, index) => {
				header_line += hour;
				if (index < labels.hours.length - 1) {
					header_line += ' ';
				}
			});
			result += header_line + '\n';
		}

		data.forEach((row, dayIndex) => {
			const day_label = labels?.days?.[dayIndex] || `Day ${dayIndex}`;
			let line = day_label.padEnd(3) + ' ';
			row.forEach((_, index) => {
				line += chars[0]; // All gray
				if (index < row.length - 1) {
					line += ' ';
				}
			});
			result += line + '\n';
		});

		result +=
			'\n' +
			chalk.green('██') +
			' High  ' +
			chalk.yellow('▓▓') +
			' Medium  ' +
			chalk.gray('░░') +
			' Low/None';
		return result;
	}

	const max_value = Math.max(...flat_data);
	const min_value = Math.min(...flat_data);

	// Better intensity calculation with thresholds
	const get_intensity = (value: number): number => {
		if (value === 0) return 0; // Gray for zero
		if (max_value === min_value) return 1; // All same non-zero value = medium

		// Create better thresholds - ensure non-zero values are always visible
		const range = max_value - min_value;
		const high_threshold = min_value + range * 0.66;

		if (value >= high_threshold) return 2; // Green for high
		if (value > 0) return 1; // Yellow for any non-zero activity
		return 0; // Gray for zero only
	};

	let result = '';

	// Header with hours - properly spaced double-digit hours
	if (labels?.hours) {
		let header_line = '    ';
		labels.hours.forEach((hour, index) => {
			header_line += hour;
			if (index < labels.hours.length - 1) {
				header_line += ' ';
			}
		});
		result += header_line + '\n';
	}

	// Heatmap rows
	data.forEach((row, dayIndex) => {
		const day_label = labels?.days?.[dayIndex] || `Day ${dayIndex}`;
		let line = day_label.padEnd(3) + ' ';

		row.forEach((value, index) => {
			const intensity = get_intensity(value);
			line += chars[intensity];
			if (index < row.length - 1) {
				line += ' ';
			}
		});

		result += line + '\n';
	});

	// Legend with colors and value info
	result +=
		'\n' +
		chalk.green('██') +
		` High (${Math.ceil(max_value * 0.66)}+)  ` +
		chalk.yellow('▓▓') +
		` Medium (${Math.ceil(max_value * 0.33)}-${Math.ceil(max_value * 0.66)})  ` +
		chalk.gray('░░') +
		' Low (0-' +
		Math.ceil(max_value * 0.33) +
		')';

	return result;
}

export function create_dashboard_box(
	title: string,
	content: string[],
): string {
	const min_width = 40;
	const content_max = content.length
		? Math.max(...content.map((line) => visible_length(line)))
		: 0;
	const width = Math.max(min_width, content_max + 4);
	const title_len = visible_length(title);
	const top_line =
		'┌─ ' +
		title +
		' ' +
		'─'.repeat(Math.max(0, width - title_len - 4)) +
		'┐';
	const bottom_line = '└' + '─'.repeat(width - 2) + '┘';

	let result = chalk.cyan(top_line) + '\n';
	content.forEach((line) => {
		const pad_len = Math.max(0, width - visible_length(line) - 3);
		const padding = ' '.repeat(pad_len);
		result +=
			chalk.cyan('│') + ' ' + line + padding + chalk.cyan('│') + '\n';
	});
	result += chalk.cyan(bottom_line);

	return result;
}
