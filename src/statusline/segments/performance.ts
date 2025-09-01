import { get_ui_icon } from '../../utils/symbols';
import { type SegmentRenderer } from './types';

export const tool_performance: SegmentRenderer = (
	_data,
	insights,
	config,
) => {
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
};

export const cache_efficiency: SegmentRenderer = (
	_data,
	insights,
	config,
) => {
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
};
