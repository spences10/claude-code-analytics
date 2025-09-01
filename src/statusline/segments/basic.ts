import { format_cost, format_duration } from '../../utils/formatters';
import { build_git_status } from '../../utils/git';
import { get_ui_icon } from '../../utils/symbols';
import { type SegmentRenderer } from './types';

export const git: SegmentRenderer = (data, _insights, config) =>
	build_git_status(data.gitBranch, config) || null;

export const model: SegmentRenderer = (data, _insights, config) => {
	if (!data.model?.display_name) return null;
	const icon = get_ui_icon('model', config);
	return `${icon ? icon + ' ' : ''}${data.model.display_name}`;
};

export const working_directory: SegmentRenderer = (
	data,
	_insights,
	config,
) => {
	const cwd = data.workspace?.current_dir || process.cwd();
	if (!cwd) return null;
	const dir_name = cwd.split('/').pop() || '';
	if (!dir_name || dir_name === '.') return null;
	const icon = get_ui_icon('folder', config);
	return `${icon ? icon + ' ' : ''}${dir_name}`;
};

export const cost: SegmentRenderer = (data, insights, config) => {
	const formatted_cost = format_cost(data.cost?.total_cost_usd);
	if (!formatted_cost) return null;
	let icon = get_ui_icon('cost', config);
	if (icon === '$' && formatted_cost.trim().startsWith('$')) {
		icon = '';
	}
	let cost_display = `${icon ? icon + ' ' : ''}${formatted_cost}`;
	if (insights.session_rank === 'high') {
		cost_display += config.display?.theme === 'emoji' ? ' ⭐' : ' ↑';
	} else if (insights.session_rank === 'low') {
		cost_display += config.display?.theme === 'emoji' ? ' ⚠️' : ' !';
	}
	return cost_display;
};

export const duration: SegmentRenderer = (
	data,
	_insights,
	config,
) => {
	const duration = format_duration(data.cost?.total_duration_ms);
	if (!duration) return null;
	const icon = get_ui_icon('duration', config);
	return `${icon ? icon + ' ' : ''}${duration}`;
};

export const lines_changed: SegmentRenderer = (
	data,
	_insights,
	config,
) => {
	const added = data.cost?.total_lines_added || 0;
	const removed = data.cost?.total_lines_removed || 0;
	if (!(added > 0 || removed > 0)) return null;
	const icon = get_ui_icon('lines', config);
	return `${icon ? icon + ' ' : ''}+${added}/-${removed}`;
};
