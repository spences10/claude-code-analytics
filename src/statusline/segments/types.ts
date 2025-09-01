import { get_productivity_insights } from '../../analytics/productivity';
import { type StatuslineConfig } from '../../config';
import { type ClaudeCodeData } from '../../database';

export type Insights = ReturnType<typeof get_productivity_insights>;
export type SegmentRenderer = (
	data: ClaudeCodeData,
	insights: Insights,
	config: StatuslineConfig,
) => string | null;
