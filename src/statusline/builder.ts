import { get_productivity_insights } from '../analytics/productivity';
import { load_config, type StatuslineConfig } from '../config';
import { type ClaudeCodeData } from '../database';
import { format_cost, format_duration } from '../utils/formatters';
import { build_git_status } from '../utils/git';
import { get_ui_icon } from '../utils/symbols';

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
			const icon = get_ui_icon('cost', config);
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
			if (!data.workspace?.current_dir) return null;
			const dir_name =
				data.workspace.current_dir.split('/').pop() || '';
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
