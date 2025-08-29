import { get_productivity_insights } from '../analytics/productivity';
import { type ClaudeCodeData } from '../database';
import { format_cost, format_duration } from '../utils/formatters';
import { build_git_status } from '../utils/git';

export function build_statusline_parts(
	data: ClaudeCodeData,
): string[] {
	const parts: string[] = [];

	// Git status with enhanced formatting
	const git_status = build_git_status(data.gitBranch);
	if (git_status) {
		parts.push(git_status);
	}

	// Model display
	if (data.model?.display_name) {
		parts.push(`🤖 ${data.model.display_name}`);
	}

	// Enhanced cost display with productivity insights
	const formatted_cost = format_cost(data.cost?.total_cost_usd);
	const insights = get_productivity_insights(data.session_id);

	if (formatted_cost) {
		let cost_display = `💰 ${formatted_cost}`;

		// Add session ranking indicator if available
		if (insights.session_rank === 'high') {
			cost_display += ' ⭐'; // High efficiency
		} else if (insights.session_rank === 'low') {
			cost_display += ' ⚠️'; // Low efficiency warning
		}

		parts.push(cost_display);
	}

	// Duration display
	const duration = format_duration(data.cost?.total_duration_ms);
	if (duration) {
		parts.push(`⏱️  ${duration}`);
	}

	// Lines changed with better formatting
	if (
		data.cost?.total_lines_added !== undefined ||
		data.cost?.total_lines_removed !== undefined
	) {
		const added = data.cost?.total_lines_added || 0;
		const removed = data.cost?.total_lines_removed || 0;

		if (added > 0 || removed > 0) {
			parts.push(`📊 +${added}/-${removed}`);
		}
	}

	// Tool performance indicator (database-powered)
	if (insights.tool_success_rate !== undefined) {
		const success_rate = Math.round(insights.tool_success_rate);
		let tool_indicator = `🔧 ${success_rate}%`;

		if (success_rate < 50) {
			tool_indicator += ' ❌'; // Poor tool performance
		} else if (success_rate > 80) {
			tool_indicator += ' ✅'; // Good tool performance
		}

		parts.push(tool_indicator);
	}

	// Working directory
	if (data.workspace?.current_dir) {
		const dir_name =
			data.workspace.current_dir.split('/').pop() || '';
		if (dir_name && dir_name !== '.') {
			parts.push(`📁 ${dir_name}`);
		}
	}

	return parts;
}
