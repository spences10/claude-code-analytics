import chalk from 'chalk';
import { get_database } from '../../database/connection';
import { make_lines_bar, make_sparkline } from '../visuals';
import { type SegmentRenderer } from './types';

export const lines_bar: SegmentRenderer = (
	data,
	_insights,
	config,
) => {
	let added = data.cost?.total_lines_added || 0;
	let removed = data.cost?.total_lines_removed || 0;
	if (added === 0 && removed === 0) {
		try {
			const db = get_database();
			const row = db
				.prepare(
					`SELECT total_lines_added as a, total_lines_removed as r
					FROM sessions
					WHERE (total_lines_added IS NOT NULL OR total_lines_removed IS NOT NULL)
					ORDER BY started_at DESC
					LIMIT 1`,
				)
				.get() as any;
			added = Number(row?.a || 0);
			removed = Number(row?.r || 0);
		} catch {}
	}
	if (added === 0 && removed === 0) return null;
	const width = (config.display?.bar_width ?? 12) as number;
	const ascii =
		config.display?.theme === 'ascii' ||
		config.display?.icons === false;
	const use_colors = (config.display as any)?.colors !== false;
	return make_lines_bar(added, removed, {
		width,
		ascii,
		use_colors,
	});
};

export const cost_sparkline: SegmentRenderer = (
	_data,
	_insights,
	config,
) => {
	try {
		const db = get_database();
		const points = Math.max(
			5,
			Math.min(60, (config.display as any)?.sparkline?.points ?? 20),
		);
		const rows = db
			.prepare(
				`SELECT total_cost_usd as c FROM sessions 
					WHERE total_cost_usd IS NOT NULL 
					ORDER BY started_at ASC 
					LIMIT ?`,
			)
			.all(points) as { c: number }[];
		const values = rows.map((r) => Number(r.c || 0));
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
	} catch {
		return null;
	}
};

export const cache_reads_sparkline: SegmentRenderer = (
	_data,
	_insights,
	config,
) => {
	try {
		const db = get_database();
		const points = Math.max(
			5,
			Math.min(60, (config.display as any)?.sparkline?.points ?? 20),
		);
		const rows = db
			.prepare(
				`
				SELECT
					s.session_id,
					SUM(COALESCE(m.cache_read_input_tokens, 0)) as r
				FROM
					sessions s
					JOIN messages m ON m.session_id = s.session_id
				WHERE
					m.role = 'assistant'
				GROUP BY
					s.session_id
				ORDER BY
					s.started_at ASC
				LIMIT
					?
				`,
			)
			.all(points) as { r: number }[];
		const values = rows.map((r) => Number(r.r || 0));
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
	} catch {
		return null;
	}
};

export const activity_strip: SegmentRenderer = (
	_data,
	_insights,
	config,
) => {
	try {
		const db = get_database();
		const rows = db
			.prepare(
				`
				SELECT strftime('%H', started_at) as h, COUNT(*) as c
				FROM sessions
				WHERE started_at >= datetime('now','-1 day')
				GROUP BY strftime('%H', started_at)
				ORDER BY h
				`,
			)
			.all() as { h: string; c: number }[];
		const buckets = new Array(24).fill(0);
		rows.forEach((r) => {
			const idx = parseInt(r.h, 10);
			if (!Number.isNaN(idx)) buckets[idx] = Number(r.c || 0);
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
	} catch {
		return null;
	}
};

export const streak_bar: SegmentRenderer = (
	_data,
	_insights,
	config,
) => {
	try {
		const days = 7;
		const db = get_database();
		const rows = db
			.prepare(
				`
				SELECT DATE(started_at) as d, COUNT(*) as c
				FROM sessions
				WHERE started_at >= DATE('now','-${days} days')
				GROUP BY DATE(started_at)
				ORDER BY d
				`,
			)
			.all() as { d: string; c: number }[];
		// Create a map of date -> count
		const counts = new Map<string, number>();
		rows.forEach((r) => counts.set(r.d, r.c));
		const max_count = rows.length
			? Math.max(...rows.map((r) => r.c))
			: 0;

		const use_colors = (config.display as any)?.colors !== false;
		const ascii =
			config.display?.theme === 'ascii' ||
			config.display?.icons === false;
		let out = 'Streak ';
		for (let i = days - 1; i >= 0; i--) {
			const d = new Date();
			d.setDate(d.getDate() - i);
			const iso = d.toISOString().slice(0, 10);
			const count = counts.get(iso) || 0;

			let ch: string;
			if (count === 0) {
				ch = ascii ? '.' : '░';
			} else if (ascii) {
				// ASCII: use different chars for intensity
				if (count === 1) ch = '▪';
				else if (count <= 3) ch = '▫';
				else if (count <= 10) ch = '■';
				else ch = '█';
			} else {
				// Unicode: use block intensities
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
	} catch {
		return null;
	}
};

export const model_mix: SegmentRenderer = (
	_data,
	_insights,
	config,
) => {
	try {
		const db = get_database();
		const rows = db
			.prepare(
				`
				SELECT COALESCE(model_display_name,'Unknown') as name, COUNT(*) as c
				FROM sessions
				WHERE started_at >= datetime('now','-30 days')
				GROUP BY model_display_name
				ORDER BY c DESC
				LIMIT 3
				`,
			)
			.all() as { name: string; c: number }[];
		if (!rows.length) return null;
		const total = rows.reduce((s, r) => s + Number(r.c || 0), 0);
		const ascii =
			config.display?.theme === 'ascii' ||
			config.display?.icons === false;
		const use_colors = (config.display as any)?.colors !== false;
		const parts: string[] = [];
		rows.forEach((r, idx) => {
			const ratio = total > 0 ? r.c / total : 0;
			const cells = Math.max(1, Math.round(ratio * 6));
			const bar_raw = (ascii ? '=' : '█').repeat(cells);
			const color =
				idx === 0
					? chalk.cyan
					: idx === 1
						? chalk.green
						: chalk.yellow;
			const bar = use_colors ? color(bar_raw) : bar_raw;
			const label = r.name.split(' ')[0].slice(0, 6);
			parts.push(`[${label} ${bar}]`);
		});
		return parts.join(' ');
	} catch {
		return null;
	}
};
