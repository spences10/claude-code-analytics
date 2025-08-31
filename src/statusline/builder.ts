import { get_productivity_insights } from '../analytics/productivity';
import { load_config } from '../config';
import { type ClaudeCodeData } from '../database';
import { format_cost, format_duration } from '../utils/formatters';
import { build_git_status } from '../utils/git';

type Insights = ReturnType<typeof get_productivity_insights>;
type SegmentRenderer = (
	data: ClaudeCodeData,
	insights: Insights,
) => string | null;

const SEGMENTS: Record<string, SegmentRenderer> = {
	git: (data) => build_git_status(data.gitBranch) || null,
	model: (data) =>
		data.model?.display_name ? `🤖 ${data.model.display_name}` : null,
	cost: (data, insights) => {
		const formatted_cost = format_cost(data.cost?.total_cost_usd);
		if (!formatted_cost) return null;
		let cost_display = `💰 ${formatted_cost}`;
		if (insights.session_rank === 'high') cost_display += ' ⭐';
		else if (insights.session_rank === 'low') cost_display += ' ⚠️';
		return cost_display;
	},
	duration: (data) => {
		const duration = format_duration(data.cost?.total_duration_ms);
		return duration ? `⏱️  ${duration}` : null;
	},
	lines_changed: (data) => {
		const added = data.cost?.total_lines_added || 0;
		const removed = data.cost?.total_lines_removed || 0;
		return added > 0 || removed > 0
			? `📊 +${added}/-${removed}`
			: null;
	},
	tool_performance: (_data, insights) => {
		if (insights.tool_success_rate === undefined) return null;
		const success_rate = Math.round(insights.tool_success_rate);
		let tool_indicator = `🔧 ${success_rate}%`;
		if (success_rate < 50) tool_indicator += ' ❌';
		else if (success_rate > 80) tool_indicator += ' ✅';
		return tool_indicator;
	},
	working_directory: (data) => {
		if (!data.workspace?.current_dir) return null;
		const dir_name =
			data.workspace.current_dir.split('/').pop() || '';
		return dir_name && dir_name !== '.' ? `📁 ${dir_name}` : null;
	},
	cache_efficiency: (_data, insights) => {
		if (insights.cache_efficiency === undefined) return null;
		const efficiency = Math.round(insights.cache_efficiency);
		const savings = insights.cache_savings_tokens || 0;
		let savings_display = '';
		if (savings >= 1000000)
			savings_display = `${Math.round(savings / 1000000)}M`;
		else if (savings >= 1000)
			savings_display = `${Math.round(savings / 1000)}K`;
		else savings_display = savings.toString();
		let cache_indicator = `🏃‍♂️ ${efficiency}% (${savings_display})`;
		if (efficiency >= 90) cache_indicator += ' 🚀';
		else if (efficiency >= 70) cache_indicator += ' ⚡';
		else if (efficiency < 50) cache_indicator += ' 🐌';
		return cache_indicator;
	},
};

export function build_statusline_parts(
	data: ClaudeCodeData,
): string[] {
	const config = load_config(data.workspace?.current_dir);
	const insights = get_productivity_insights(data.session_id);

	// If layout is configured, use it
	if (config.display?.layout) {
		const lines: string[] = [];

		for (const line_segments of config.display.layout) {
			const line_parts: string[] = [];

			for (const segment_name of line_segments) {
				const renderer = SEGMENTS[segment_name];
				const segment = renderer ? renderer(data, insights) : null;
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
		const segment = renderer ? renderer(data, insights) : null;
		if (segment) {
			parts.push(segment);
		}
	}

	return parts;
}
