import { get_productivity_insights } from '../analytics/productivity';
import { load_config } from '../config';
import { type ClaudeCodeData } from '../database';
import { format_cost, format_duration } from '../utils/formatters';
import { build_git_status } from '../utils/git';

function build_segment(
	segment_name: string,
	data: ClaudeCodeData,
): string | null {
	const insights = get_productivity_insights(data.session_id);

	switch (segment_name) {
		case 'git': {
			const git_status = build_git_status(data.gitBranch);
			return git_status || null;
		}
		case 'model': {
			return data.model?.display_name
				? `🤖 ${data.model.display_name}`
				: null;
		}
		case 'cost': {
			const formatted_cost = format_cost(data.cost?.total_cost_usd);
			if (!formatted_cost) return null;

			let cost_display = `💰 ${formatted_cost}`;
			if (insights.session_rank === 'high') {
				cost_display += ' ⭐';
			} else if (insights.session_rank === 'low') {
				cost_display += ' ⚠️';
			}
			return cost_display;
		}
		case 'duration': {
			const duration = format_duration(data.cost?.total_duration_ms);
			return duration ? `⏱️  ${duration}` : null;
		}
		case 'lines_changed': {
			const added = data.cost?.total_lines_added || 0;
			const removed = data.cost?.total_lines_removed || 0;
			return added > 0 || removed > 0
				? `📊 +${added}/-${removed}`
				: null;
		}
		case 'tool_performance': {
			if (insights.tool_success_rate === undefined) {
				// Show warming up state for sessions without tool data yet
				return `🔧 --`;
			}

			const success_rate = Math.round(insights.tool_success_rate);
			let tool_indicator = `🔧 ${success_rate}%`;

			if (success_rate < 50) {
				tool_indicator += ' ❌';
			} else if (success_rate > 80) {
				tool_indicator += ' ✅';
			}
			return tool_indicator;
		}
		case 'working_directory': {
			if (!data.workspace?.current_dir) return null;
			const dir_name =
				data.workspace.current_dir.split('/').pop() || '';
			return dir_name && dir_name !== '.' ? `📁 ${dir_name}` : null;
		}
		default:
			return null;
	}
}

export function build_statusline_parts(
	data: ClaudeCodeData,
): string[] {
	const config = load_config(data.workspace?.current_dir);

	// If layout is configured, use it
	if (config.display?.layout) {
		const lines: string[] = [];

		for (const line_segments of config.display.layout) {
			const line_parts: string[] = [];

			for (const segment_name of line_segments) {
				const segment = build_segment(segment_name, data);
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
		'working_directory',
	];

	for (const segment_name of all_segments) {
		const segment = build_segment(segment_name, data);
		if (segment) {
			parts.push(segment);
		}
	}

	return parts;
}
