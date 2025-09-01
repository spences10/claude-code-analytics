import chalk from 'chalk';
import { get_productivity_insights } from '../analytics/productivity';
import { load_config, type StatuslineConfig } from '../config';
import { type ClaudeCodeData } from '../database';
import { get_database } from '../database/connection';
import { format_cost, format_duration } from '../utils/formatters';
import { build_git_status } from '../utils/git';
import { get_ui_icon } from '../utils/symbols';
import {
	make_gauge,
	make_lines_bar,
	make_sparkline,
} from './visuals';

type Insights = ReturnType<typeof get_productivity_insights>;
type SegmentRenderer = (
	data: ClaudeCodeData,
	insights: Insights,
	config: StatuslineConfig,
) => string | null;

function make_segments(): Record<string, SegmentRenderer> {
	return {
		git: (data, _insights, config) =>
			build_git_status(data.gitBranch, config) || null,
		model: (data, _insights, config) => {
			if (!data.model?.display_name) return null;
			const icon = get_ui_icon('model', config);
			return `${icon ? icon + ' ' : ''}${data.model.display_name}`;
		},
		cost: (data, insights, config) => {
			const formatted_cost = format_cost(data.cost?.total_cost_usd);
			if (!formatted_cost) return null;
			let icon = get_ui_icon('cost', config);
			if (icon === '$' && formatted_cost.trim().startsWith('$')) {
				icon = '';
			}
			let cost_display = `${icon ? icon + ' ' : ''}${formatted_cost}`;
			if (insights.session_rank === 'high') {
				cost_display +=
					config.display?.theme === 'emoji' ? ' ⭐' : ' ↑';
			} else if (insights.session_rank === 'low') {
				cost_display +=
					config.display?.theme === 'emoji' ? ' ⚠️' : ' !';
			}
			return cost_display;
		},
		duration: (data, _insights, config) => {
			const duration = format_duration(data.cost?.total_duration_ms);
			if (!duration) return null;
			const icon = get_ui_icon('duration', config);
			return `${icon ? icon + ' ' : ''}${duration}`;
		},
		lines_changed: (data, _insights, config) => {
			const added = data.cost?.total_lines_added || 0;
			const removed = data.cost?.total_lines_removed || 0;
			if (!(added > 0 || removed > 0)) return null;
			const icon = get_ui_icon('lines', config);
			return `${icon ? icon + ' ' : ''}+${added}/-${removed}`;
		},
		tool_performance: (_data, insights, config) => {
			if (insights.tool_success_rate === undefined) return null;
			const success_rate = Math.round(insights.tool_success_rate);
			const icon = get_ui_icon('tools', config);
			let tool_indicator = `${icon ? icon + ' ' : ''}${success_rate}%`;
			if (success_rate < 50) {
				tool_indicator +=
					config.display?.theme === 'emoji' ? ' ❌' : ' !';
			} else if (success_rate > 80) {
				tool_indicator +=
					config.display?.theme === 'emoji' ? ' ✅' : ' +';
			}
			return tool_indicator;
		},
		working_directory: (data, _insights, config) => {
			const cwd = data.workspace?.current_dir || process.cwd();
			if (!cwd) return null;
			const dir_name = cwd.split('/').pop() || '';
			if (!dir_name || dir_name === '.') return null;
			const icon = get_ui_icon('folder', config);
			return `${icon ? icon + ' ' : ''}${dir_name}`;
		},
		cache_efficiency: (_data, insights, config) => {
			if (insights.cache_efficiency === undefined) return null;
			const efficiency = Math.round(insights.cache_efficiency);
			const savings = insights.cache_savings_tokens || 0;
			let savings_display = '';
			if (savings >= 1000000)
				savings_display = `${Math.round(savings / 1000000)}M`;
			else if (savings >= 1000)
				savings_display = `${Math.round(savings / 1000)}K`;
			else savings_display = savings.toString();
			const icon = get_ui_icon('cache', config);
			let cache_indicator = `${icon ? icon + ' ' : ''}${efficiency}% (${savings_display})`;
			if (config.display?.theme === 'emoji') {
				if (efficiency >= 90) cache_indicator += ' 🚀';
				else if (efficiency >= 70) cache_indicator += ' ⚡';
				else if (efficiency < 50) cache_indicator += ' 🐌';
			} else {
				if (efficiency >= 90) cache_indicator += ' ↑↑';
				else if (efficiency >= 70) cache_indicator += ' ↑';
				else if (efficiency < 50) cache_indicator += ' ↓';
			}
			return cache_indicator;
		},
		tool_gauge: (_data, insights, config) => {
			let pct = insights.tool_success_rate;
			if (pct === undefined) {
				try {
					const db = get_database();
					const row = db
						.prepare(
							`SELECT COUNT(*) as total,
								SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as ok
								FROM tool_calls tc
								JOIN sessions s ON s.session_id = tc.session_id
								WHERE s.started_at >= datetime('now','-7 days')`,
						)
						.get() as any;
					pct =
						row && row.total > 0
							? (row.ok / row.total) * 100
							: undefined;
				} catch {}
			}
			if (pct === undefined) return null;
			const width = (config.display?.bar_width ?? 10) as number;
			const ascii =
				config.display?.theme === 'ascii' ||
				config.display?.icons === false;
			const use_colors = (config.display as any)?.colors !== false;
			return make_gauge(pct, {
				width,
				ascii,
				use_colors,
				label: 'Tools',
			});
		},
		cache_gauge: (_data, insights, config) => {
			let pct = insights.cache_efficiency;
			if (pct === undefined) {
				try {
					const db = get_database();
					const row = db
						.prepare(
							`SELECT SUM(cache_read_input_tokens) as reads,
								SUM(cache_creation_input_tokens) as creates
								FROM messages m
								JOIN sessions s ON s.session_id = m.session_id
								WHERE m.role = 'assistant'
									AND s.started_at >= datetime('now','-7 days')`,
						)
						.get() as any;
					const reads = Number(row?.reads || 0);
					const creates = Number(row?.creates || 0);
					const total = reads + creates;
					pct = total > 0 ? (reads / total) * 100 : undefined;
				} catch {}
			}
			if (pct === undefined) return null;
			const width = (config.display?.bar_width ?? 10) as number;
			const ascii =
				config.display?.theme === 'ascii' ||
				config.display?.icons === false;
			const use_colors = (config.display as any)?.colors !== false;
			return make_gauge(pct, {
				width,
				ascii,
				use_colors,
				label: 'Cache',
			});
		},
		lines_bar: (data, _insights, config) => {
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
		},
		cost_sparkline: (_data, _insights, config) => {
			try {
				const db = get_database();
				const points = Math.max(
					5,
					Math.min(
						60,
						(config.display as any)?.sparkline?.points ?? 20,
					),
				);
				const rows = db
					.prepare(
						`SELECT total_cost_usd as c FROM sessions 
                         WHERE total_cost_usd IS NOT NULL 
                         ORDER BY started_at DESC 
                         LIMIT ?`,
					)
					.all(points) as { c: number }[];
				const values = rows.map((r) => Number(r.c || 0)).reverse();
				if (values.length === 0) return null;
				const width = Math.max(
					5,
					Math.min(
						60,
						(config.display as any)?.sparkline?.width ?? 20,
					),
				);
				const height = Math.max(
					1,
					Math.min(
						6,
						(config.display as any)?.sparkline?.height ?? 2,
					),
				);
				const spark = make_sparkline(values, { width, height });
				return `Cost ${spark}`;
			} catch {
				return null;
			}
		},
		context_gauge: (data, _insights, config) => {
			try {
				const db = get_database();
				const token_limit =
					(config.display as any)?.context?.token_limit ?? 200000;
				const mode: 'latest' | 'session_total' | 'recent_n' =
					(config.display as any)?.context?.mode || 'latest';
				const recent_n =
					(config.display as any)?.context?.recent_n ?? 5;

				let used_tokens = 0;

				if (mode === 'session_total' && data.session_id) {
					const row = db
						.prepare(
							`SELECT 
								SUM(COALESCE(token_count_input,0)) as tin,
								SUM(COALESCE(token_count_output,0)) as tout
							FROM messages WHERE session_id = ?`,
						)
						.get(data.session_id) as any;
					used_tokens =
						Number(row?.tin || 0) + Number(row?.tout || 0);
				} else if (mode === 'recent_n' && data.session_id) {
					const rows = db
						.prepare(
							`SELECT token_count_input as tin 
								FROM messages 
								WHERE session_id = ? AND role = 'assistant'
								ORDER BY message_index DESC LIMIT ?`,
						)
						.all(data.session_id, recent_n) as any[];
					used_tokens = rows.reduce(
						(sum, r) => sum + Number(r?.tin || 0),
						0,
					);
				} else {
					// latest assistant turn overall
					const row = db
						.prepare(
							`SELECT token_count_input as tin 
								FROM messages 
								WHERE role = 'assistant'
								ORDER BY timestamp DESC LIMIT 1`,
						)
						.get() as any;
					used_tokens = Number(row?.tin || 0);
				}

				if (token_limit <= 0) return null;
				const pct = Math.max(
					0,
					Math.min(
						100,
						Math.round((used_tokens / token_limit) * 100),
					),
				);
				const width = (config.display?.bar_width ?? 12) as number;
				const ascii =
					config.display?.theme === 'ascii' ||
					config.display?.icons === false;
				const use_colors = (config.display as any)?.colors !== false;

				const gauge = make_gauge(pct, {
					width,
					ascii,
					use_colors,
					label: 'Context',
				});
				const used_k = Math.round(used_tokens / 1000);
				const limit_k = Math.round(token_limit / 1000);
				return `${gauge} ${used_k}K/${limit_k}K`;
			} catch {
				return null;
			}
		},
		activity_strip: (_data, _insights, config) => {
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
		},
		streak_bar: (_data, _insights, config) => {
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
				const set = new Set(rows.map((r) => r.d));
				const use_colors = (config.display as any)?.colors !== false;
				const ascii =
					config.display?.theme === 'ascii' ||
					config.display?.icons === false;
				let out = 'Streak ';
				for (let i = days - 1; i >= 0; i--) {
					const d = new Date();
					d.setDate(d.getDate() - i);
					const iso = d.toISOString().slice(0, 10);
					let ch = ascii ? '.' : '░';
					if (set.has(iso)) ch = ascii ? '█' : '█';
					if (use_colors && !ascii) {
						ch = set.has(iso) ? chalk.green(ch) : chalk.gray(ch);
					}
					out += ch;
				}
				return out;
			} catch {
				return null;
			}
		},
		model_mix: (_data, _insights, config) => {
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
		},
		cache_reads_sparkline: (_data, _insights, config) => {
			try {
				const db = get_database();
				const points = Math.max(
					5,
					Math.min(
						60,
						(config.display as any)?.sparkline?.points ?? 20,
					),
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
							s.started_at DESC
						LIMIT
							?
						`,
					)
					.all(points) as { r: number }[];
				const values = rows.map((r) => Number(r.r || 0)).reverse();
				if (values.length === 0) return null;
				const width = Math.max(
					5,
					Math.min(
						60,
						(config.display as any)?.sparkline?.width ?? 20,
					),
				);
				const height = Math.max(
					1,
					Math.min(
						6,
						(config.display as any)?.sparkline?.height ?? 2,
					),
				);
				const spark = make_sparkline(values, { width, height });
				return `Cache ${spark}`;
			} catch {
				return null;
			}
		},
		ambient_wave: () => {
			const width = 12;
			const t = Math.floor(Date.now() / 300);
			let out = '';
			for (let i = 0; i < width; i++) {
				out += i === t % width ? '●' : '·';
			}
			return out;
		},
		ambient_bounce: (_d, _i, config) => {
			const width = 12;
			const ascii =
				config.display?.theme === 'ascii' ||
				config.display?.icons === false;
			const t = Math.floor(Date.now() / 300);
			const period = Math.max(2, 2 * (width - 1));
			let pos = t % period;
			if (pos >= width) pos = period - pos;
			let out = '';
			for (let i = 0; i < width; i++) {
				out += i === pos ? (ascii ? 'o' : '●') : ascii ? '.' : '·';
			}
			return out;
		},
		ambient_marquee: (_d, _i, config) => {
			const width = 12;
			const ascii =
				config.display?.theme === 'ascii' ||
				config.display?.icons === false;
			const t = Math.floor(Date.now() / 200);
			const pattern = ascii
				? ['.', '=', '-', '=']
				: ['░', '▒', '▓', '▒'];
			const plen = pattern.length;
			let out = '';
			for (let i = 0; i < width; i++) {
				const idx = (i + t) % plen;
				out += pattern[idx];
			}
			return out;
		},
		ambient_spinner: () => {
			const frames = [
				'⠋',
				'⠙',
				'⠹',
				'⠸',
				'⠼',
				'⠴',
				'⠦',
				'⠧',
				'⠇',
				'⠏',
			];
			const t = Math.floor(Date.now() / 120);
			return frames[t % frames.length];
		},
		ambient_twinkle: (_d, _i, config) => {
			const width = 12;
			const ascii =
				config.display?.theme === 'ascii' ||
				config.display?.icons === false;
			const t = Math.floor(Date.now() / 400);
			const p1 = (t * 3 + 1) % width;
			const p2 = (t * 5 + 2) % width;
			const p3 = (t * 7 + 3) % width;
			const star = ascii ? '*' : '✦';
			const dot = ascii ? '.' : '·';
			let out = '';
			for (let i = 0; i < width; i++) {
				out += i === p1 || i === p2 || i === p3 ? star : dot;
			}
			return out;
		},
		ambient_wave_sine: (_d, _i, config) => {
			const width = 12;
			const ascii =
				config.display?.theme === 'ascii' ||
				config.display?.icons === false;
			const blocks = ascii
				? ['_', '-', '=']
				: ['▁', '▂', '▃', '▄', '▅', '▆', '▇'];
			const t = Math.floor(Date.now() / 200);
			let out = '';
			for (let x = 0; x < width; x++) {
				const phase = (t + x) / 3;
				const s = Math.sin(phase);
				const idx = Math.max(
					0,
					Math.min(
						blocks.length - 1,
						Math.round(((s + 1) / 2) * (blocks.length - 1)),
					),
				);
				out += blocks[idx];
			}
			return out;
		},
		ambient_diagonal: (_d, _i, config) => {
			const width = 12;
			const ascii =
				config.display?.theme === 'ascii' ||
				config.display?.icons === false;
			const pattern = ascii ? ['/', '\\'] : ['╱', '╲'];
			const t = Math.floor(Date.now() / 200);
			let out = '';
			for (let i = 0; i < width; i++) {
				const idx = (i + t) % 2;
				out += pattern[idx];
			}
			return out;
		},
	};
}

export function build_statusline_parts(
	data: ClaudeCodeData,
): string[] {
	const config = load_config(data.workspace?.current_dir);
	const insights = get_productivity_insights(data.session_id);
	const SEGMENTS = make_segments();

	// If layout is configured, use it
	if (config.display?.layout) {
		const lines: string[] = [];

		for (const line_segments of config.display.layout) {
			const line_parts: string[] = [];

			for (const segment_name of line_segments) {
				const renderer = SEGMENTS[segment_name];
				const segment = renderer
					? renderer(data, insights, config)
					: null;
				if (segment) {
					line_parts.push(segment);
				}
			}

			if (line_parts.length > 0) {
				lines.push(line_parts.join(' | '));
			}
		}

		return lines;
	}

	// Fallback to original behavior
	const parts: string[] = [];
	const all_segments = [
		'git',
		'model',
		'cost',
		'duration',
		'lines_changed',
		'tool_performance',
		'cache_efficiency',
		'working_directory',
	];

	for (const segment_name of all_segments) {
		const renderer = SEGMENTS[segment_name];
		const segment = renderer
			? renderer(data, insights, config)
			: null;
		if (segment) {
			parts.push(segment);
		}
	}

	return parts;
}
