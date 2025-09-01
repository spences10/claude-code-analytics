import chalk from 'chalk';
import { make_sparkline } from '../visuals';
import { get_sparkline_data } from './helpers';
import { type SegmentRenderer } from './types';

/**
 * Sparkline segments for trending data visualization
 * Uses pre-computed cache data for fast rendering
 */

export const fast_cost_sparkline: SegmentRenderer = (
	_data,
	_insights,
	config,
) => {
	const values = get_sparkline_data('cost_sparkline_20');
	if (values.length === 0) return null;

	const width = Math.max(
		5,
		Math.min(60, (config.display as any)?.sparkline?.width ?? 20),
	);
	const height = Math.max(
		1,
		Math.min(6, (config.display as any)?.sparkline?.height ?? 2),
	);
	const spark = make_sparkline(values, { width, height });

	return `Cost ${spark}`;
};

export const fast_cache_sparkline: SegmentRenderer = (
	_data,
	_insights,
	config,
) => {
	const values = get_sparkline_data('cache_sparkline_20');
	if (values.length === 0) return null;

	const width = Math.max(
		5,
		Math.min(60, (config.display as any)?.sparkline?.width ?? 20),
	);
	const height = Math.max(
		1,
		Math.min(6, (config.display as any)?.sparkline?.height ?? 2),
	);
	const spark = make_sparkline(values, { width, height });

	return `Cache ${spark}`;
};

export const fast_activity_strip: SegmentRenderer = (
	_data,
	_insights,
	config,
) => {
	const activity_data = get_sparkline_data(
		'activity_hourly_24h',
	) as any[];
	if (!activity_data.length) return null;

	// Convert to 24-hour buckets
	const buckets = new Array(24).fill(0);
	activity_data.forEach((item: any) => {
		const hour = parseInt(item.h, 10);
		if (!Number.isNaN(hour)) buckets[hour] = Number(item.c || 0);
	});

	const values = buckets.filter((v) => v > 0);
	const max = values.length ? Math.max(...values) : 0;
	const use_colors = (config.display as any)?.colors !== false;
	const ascii =
		config.display?.theme === 'ascii' ||
		config.display?.icons === false;

	let out = 'Act ';
	for (let i = 0; i < 24; i++) {
		const v = buckets[i];
		let ch = ascii ? '.' : '░';
		if (v > 0 && max > 0) {
			if (v >= max * 0.66) ch = ascii ? '#' : '██';
			else ch = ascii ? '*' : '▓▓';
		} else {
			ch = ascii ? '.' : '░░';
		}
		if (use_colors && !ascii) {
			if (v >= max * 0.66) ch = chalk.green(ch);
			else if (v > 0) ch = chalk.yellow(ch);
			else ch = chalk.gray(ch);
		}
		out += ch + (ascii ? '' : '');
	}
	return out.trimEnd();
};

export const fast_streak_bar: SegmentRenderer = (
	_data,
	_insights,
	config,
) => {
	const streak_data = get_sparkline_data('streak_daily_7d') as any[];
	if (!streak_data.length) return null;

	// Create map of date -> count
	const counts = new Map<string, number>();
	streak_data.forEach((item: any) => counts.set(item.d, item.c));
	const max_count = streak_data.length
		? Math.max(...streak_data.map((r: any) => r.c))
		: 0;

	const use_colors = (config.display as any)?.colors !== false;
	const ascii =
		config.display?.theme === 'ascii' ||
		config.display?.icons === false;
	let out = 'Streak ';

	for (let i = 6; i >= 0; i--) {
		const d = new Date();
		d.setDate(d.getDate() - i);
		const iso = d.toISOString().slice(0, 10);
		const count = counts.get(iso) || 0;

		let ch: string;
		if (count === 0) {
			ch = ascii ? '.' : '░';
		} else if (ascii) {
			if (count === 1) ch = '▪';
			else if (count <= 3) ch = '▫';
			else if (count <= 10) ch = '■';
			else ch = '█';
		} else {
			if (count === 1) ch = '▁';
			else if (count <= 3) ch = '▃';
			else if (count <= 10) ch = '▆';
			else ch = '█';
		}

		if (use_colors && !ascii && count > 0) {
			if (count >= max_count * 0.8) ch = chalk.green(ch);
			else if (count >= max_count * 0.4) ch = chalk.yellow(ch);
			else ch = chalk.cyan(ch);
		} else if (use_colors && !ascii) {
			ch = chalk.gray(ch);
		}
		out += ch;
	}
	return out;
};
