import { get_productivity_insights } from '../analytics/productivity';
import { load_config } from '../config';
import { type ClaudeCodeData } from '../database';
import { segments } from './segments';

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
				const renderer = segments[segment_name];
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
		const renderer = segments[segment_name];
		const segment = renderer
			? renderer(data, insights, config)
			: null;
		if (segment) {
			parts.push(segment);
		}
	}

	return parts;
}
