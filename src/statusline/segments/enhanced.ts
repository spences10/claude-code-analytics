import { format_cost } from '../../utils/formatters';
import { get_ui_icon } from '../../utils/symbols';
import { get_global_metric, get_session_summary } from './helpers';
import { type SegmentRenderer } from './types';

/**
 * Enhanced segments that use pre-computed summary data
 * for intelligent insights beyond basic statusline data
 */

export const fast_cost: SegmentRenderer = (
	data,
	_insights,
	config,
) => {
	const formatted_cost = format_cost(data.cost?.total_cost_usd);
	if (!formatted_cost) return null;

	let icon = get_ui_icon('cost', config);
	if (icon === '$' && formatted_cost.trim().startsWith('$')) {
		icon = '';
	}

	let cost_display = `${icon ? icon + ' ' : ''}${formatted_cost}`;

	// Use pre-computed session rank if available
	const summary = get_session_summary(data.session_id);
	if (summary?.session_rank === 'high') {
		cost_display += config.display?.theme === 'emoji' ? ' ⭐' : ' ↑';
	} else if (summary?.session_rank === 'low') {
		cost_display += config.display?.theme === 'emoji' ? ' ⚠️' : ' !';
	}

	return cost_display;
};

export const fast_tool_performance: SegmentRenderer = (
	data,
	_insights,
	config,
) => {
	const summary = get_session_summary(data.session_id);
	const success_rate = summary?.tool_success_rate;

	if (success_rate === undefined) {
		// Fallback to global average
		const global_rate = get_global_metric('avg_tool_success_rate_7d');
		if (global_rate === 0) return null;
		const rate = Math.round(global_rate);
		const icon = get_ui_icon('tools', config);
		return `${icon ? icon + ' ' : ''}${rate}%`;
	}

	const rate = Math.round(success_rate);
	const icon = get_ui_icon('tools', config);
	let tool_indicator = `${icon ? icon + ' ' : ''}${rate}%`;

	if (rate < 50) {
		tool_indicator +=
			config.display?.theme === 'emoji' ? ' ❌' : ' !';
	} else if (rate > 80) {
		tool_indicator +=
			config.display?.theme === 'emoji' ? ' ✅' : ' +';
	}

	return tool_indicator;
};

export const fast_cache_efficiency: SegmentRenderer = (
	data,
	_insights,
	config,
) => {
	const summary = get_session_summary(data.session_id);
	if (!summary?.cache_efficiency) return null;

	const efficiency = Math.round(summary.cache_efficiency);
	const savings = summary.cache_savings_tokens || 0;

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
};
