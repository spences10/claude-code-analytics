import * as ambient from './ambient';
import * as basic from './basic';
import * as enhanced from './enhanced';
import * as gauges from './gauges';
import * as performance from './performance';
import * as sparklines from './sparklines';
import { type SegmentRenderer } from './types';
import * as visuals from './visuals';

export const segments: Record<string, SegmentRenderer> = {
	// Basic segments (core functionality)
	git: basic.git,
	model: basic.model,
	duration: basic.duration,
	lines_changed: basic.lines_changed,
	working_directory: basic.working_directory,

	// Enhanced segments with pre-computed intelligence
	cost: enhanced.fast_cost,
	tool_performance: enhanced.fast_tool_performance,
	cache_efficiency: enhanced.fast_cache_efficiency,

	// Gauge visualizations
	tool_gauge: gauges.fast_tool_gauge,
	cache_gauge: gauges.fast_cache_gauge,
	context_gauge: gauges.fast_context_gauge,

	// Trend visualizations (sparklines & activity bars)
	cost_sparkline: sparklines.fast_cost_sparkline,
	cache_reads_sparkline: sparklines.fast_cache_sparkline,
	activity_strip: sparklines.fast_activity_strip,
	streak_bar: sparklines.fast_streak_bar,

	// Slower segments (fallback - will be deprecated)
	cost_slow: basic.cost,
	tool_performance_slow: performance.tool_performance,
	cache_efficiency_slow: performance.cache_efficiency,
	tool_gauge_slow: gauges.tool_gauge,
	cache_gauge_slow: gauges.cache_gauge,
	context_gauge_slow: gauges.context_gauge,
	cost_sparkline_slow: visuals.cost_sparkline,
	cache_reads_sparkline_slow: visuals.cache_reads_sparkline,
	activity_strip_slow: visuals.activity_strip,
	streak_bar_slow: visuals.streak_bar,

	// Visual segments
	lines_bar: visuals.lines_bar,
	model_mix: visuals.model_mix,

	// Ambient segments
	ambient_wave: ambient.ambient_wave,
	ambient_bounce: ambient.ambient_bounce,
	ambient_marquee: ambient.ambient_marquee,
	ambient_spinner: ambient.ambient_spinner,
	ambient_twinkle: ambient.ambient_twinkle,
	ambient_wave_sine: ambient.ambient_wave_sine,
	ambient_diagonal: ambient.ambient_diagonal,
};

export type { Insights, SegmentRenderer } from './types';
