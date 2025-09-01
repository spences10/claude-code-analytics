import { format_cost } from '../../utils/formatters';
import { get_ui_icon } from '../../utils/symbols';
import { make_gauge } from '../visuals';
import { get_global_metric } from './helpers';
import { type SegmentRenderer } from './types';

/**
 * Cost analytics segments using pre-computed aggregate data
 * These provide spending insights and budget awareness
 */

export const total_cost: SegmentRenderer = (
	_data,
	_insights,
	config,
) => {
	const total = get_global_metric('total_cost_all_time');
	if (!total) return null;

	const formatted = format_cost(total);
	if (!formatted) return null;

	const icon = get_ui_icon('cost', config);
	const clean_icon =
		icon === '$' && formatted.startsWith('$') ? '' : icon;

	return `${clean_icon ? clean_icon + ' ' : ''}${formatted} total`;
};

export const daily_avg_cost: SegmentRenderer = (
	_data,
	_insights,
	config,
) => {
	const avg = get_global_metric('avg_daily_cost_30d');
	if (!avg) return null;

	const formatted = format_cost(avg);
	if (!formatted) return null;

	const icon = get_ui_icon('calendar', config);
	return `${icon ? icon + ' ' : ''}${formatted}/day`;
};

export const session_vs_avg: SegmentRenderer = (
	data,
	_insights,
	config,
) => {
	const session_cost = data.cost?.total_cost_usd;
	const avg_cost = get_global_metric('avg_session_cost_all_time');

	if (!session_cost || !avg_cost) return null;

	const multiplier = session_cost / avg_cost;
	const formatted_multiplier =
		multiplier >= 10
			? `${Math.round(multiplier)}x`
			: `${multiplier.toFixed(1)}x`;

	const formatted_cost = format_cost(session_cost);
	if (!formatted_cost) return null;

	let indicator = '';
	if (multiplier >= 2.0) {
		indicator = config.display?.theme === 'emoji' ? ' 🔥' : ' ↑↑';
	} else if (multiplier >= 1.5) {
		indicator = config.display?.theme === 'emoji' ? ' 📈' : ' ↑';
	} else if (multiplier <= 0.5) {
		indicator = config.display?.theme === 'emoji' ? ' 💚' : ' ↓';
	}

	return `${formatted_cost} (${formatted_multiplier} avg)${indicator}`;
};

export const cost_percentile: SegmentRenderer = (
	data,
	_insights,
	config,
) => {
	const session_cost = data.cost?.total_cost_usd;
	if (!session_cost) return null;

	const percentile = get_global_metric('current_session_percentile');
	if (!percentile) return null;

	const ordinal =
		percentile >= 90
			? 'top 10%'
			: percentile >= 75
				? 'top 25%'
				: percentile >= 50
					? 'top 50%'
					: percentile >= 25
						? 'bottom 50%'
						: 'bottom 25%';

	const icon = get_ui_icon('stats', config);
	return `${icon ? icon + ' ' : ''}${ordinal}`;
};

export const cost_velocity: SegmentRenderer = (
	_data,
	_insights,
	config,
) => {
	const velocity = get_global_metric('cost_velocity_7d');
	if (!velocity) return null;

	const formatted = format_cost(velocity);
	if (!formatted) return null;

	const trend_direction = get_global_metric('cost_trend_7d');
	let trend_indicator = '';

	if (trend_direction > 1.2) {
		trend_indicator =
			config.display?.theme === 'emoji' ? ' 📈' : ' ↗';
	} else if (trend_direction < 0.8) {
		trend_indicator =
			config.display?.theme === 'emoji' ? ' 📉' : ' ↘';
	} else {
		trend_indicator =
			config.display?.theme === 'emoji' ? ' ➡️' : ' →';
	}

	const icon = get_ui_icon('trend', config);
	return `${icon ? icon + ' ' : ''}${formatted}/day (7d)${trend_indicator}`;
};

export const monthly_projection: SegmentRenderer = (
	_data,
	_insights,
	config,
) => {
	const projection = get_global_metric('monthly_cost_projection');
	if (!projection) return null;

	const formatted = format_cost(projection);
	if (!formatted) return null;

	// Warning if projection is high
	let warning = '';
	if (projection > 200) {
		warning = config.display?.theme === 'emoji' ? ' ⚠️' : ' !';
	} else if (projection > 100) {
		warning = config.display?.theme === 'emoji' ? ' 🔸' : ' ~';
	}

	const icon = get_ui_icon('calendar', config);
	return `${icon ? icon + ' ' : ''}~${formatted}/mo${warning}`;
};

export const cost_gauge_monthly: SegmentRenderer = (
	_data,
	_insights,
	config,
) => {
	const current_month = get_global_metric('current_month_cost');
	const monthly_budget =
		(config.display as any)?.cost?.monthly_budget ?? 150;

	if (!current_month || monthly_budget <= 0) return null;

	const pct = Math.max(
		0,
		Math.min(100, (current_month / monthly_budget) * 100),
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
		label: 'Budget',
	});

	const current_formatted = format_cost(current_month);
	const budget_formatted = format_cost(monthly_budget);

	return `${gauge} ${current_formatted}/${budget_formatted}`;
};
