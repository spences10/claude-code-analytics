import chalk from 'chalk';

export function make_gauge(
	percent: number,
	opts?: {
		width?: number;
		ascii?: boolean;
		use_colors?: boolean;
		label?: string;
	},
): string {
	const width = Math.max(3, Math.min(40, opts?.width ?? 10));
	const ascii = opts?.ascii === true;
	const use_colors = opts?.use_colors !== false;

	const p = Math.max(0, Math.min(100, Math.round(percent)));
	const filled = Math.round((p / 100) * width);
	const empty = Math.max(0, width - filled);

	const full_char = ascii ? '=' : '█';
	const empty_char = ascii ? '.' : '░';

	let bar = `[${full_char.repeat(filled)}${empty_char.repeat(empty)}] ${p}%`;

	if (use_colors) {
		const color =
			p >= 80 ? chalk.green : p >= 50 ? chalk.yellow : chalk.red;
		bar = color(bar);
	}
	if (opts?.label) {
		return `${opts.label} ${bar}`;
	}
	return bar;
}

export function make_lines_bar(
	added: number,
	removed: number,
	opts?: { width?: number; ascii?: boolean; use_colors?: boolean },
): string {
	const total = Math.max(0, (added || 0) + (removed || 0));
	const width = Math.max(4, Math.min(40, opts?.width ?? 12));
	const ascii = opts?.ascii === true;
	const use_colors = opts?.use_colors !== false;

	if (total === 0) return ascii ? 'lines ---- (0/0)' : '± 0/0';

	const half = Math.floor(width / 2);
	const add_cells = Math.min(
		half,
		Math.round((added / total) * width),
	);
	const rem_cells = Math.min(
		half,
		Math.round((removed / total) * width),
	);

	const full_char = ascii ? '=' : '█';
	const add_bar_raw = full_char.repeat(add_cells);
	const rem_bar_raw = full_char.repeat(rem_cells);

	const add_bar = use_colors ? chalk.green(add_bar_raw) : add_bar_raw;
	const rem_bar = use_colors ? chalk.red(rem_bar_raw) : rem_bar_raw;

	const prefix = ascii ? 'lines' : '±';
	return `${prefix} +${add_bar} -${rem_bar} (+${added}/-${removed})`;
}

export function make_sparkline(
	values: number[],
	opts?: { width?: number; height?: number },
): string {
	// Lightweight sparkline using unicode blocks
	// Normalize values to 8 levels (0-7)
	if (!values || values.length === 0) return '';
	const width = Math.max(
		5,
		Math.min(60, opts?.width ?? values.length),
	);
	const height = Math.max(1, Math.min(6, opts?.height ?? 2));

	// Downsample or truncate to desired width
	const step = values.length / width;
	const sampled: number[] = [];
	for (let i = 0; i < width; i++) {
		const idx = Math.floor(i * step);
		sampled.push(values[Math.min(idx, values.length - 1)] || 0);
	}

	const min = Math.min(...sampled);
	const max = Math.max(...sampled);
	const span = max - min || 1;

	// Braille/blocks palette (height-insensitive simple spark)
	const blocks = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
	const scaled = sampled.map((v) => {
		const norm = (v - min) / span;
		const idx = Math.max(0, Math.min(7, Math.round(norm * 7)));
		return blocks[idx];
	});

	return scaled.join('');
}
