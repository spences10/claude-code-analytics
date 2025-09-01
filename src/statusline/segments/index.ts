import * as ambient from './ambient';
import * as basic from './basic';
import * as gauges from './gauges';
import * as performance from './performance';
import { type SegmentRenderer } from './types';
import * as visuals from './visuals';

export const segments: Record<string, SegmentRenderer> = {
	// Basic segments
	git: basic.git,
	model: basic.model,
	cost: basic.cost,
	duration: basic.duration,
	lines_changed: basic.lines_changed,
	working_directory: basic.working_directory,

	// Performance segments
	tool_performance: performance.tool_performance,
	cache_efficiency: performance.cache_efficiency,

	// Gauge segments
	tool_gauge: gauges.tool_gauge,
	cache_gauge: gauges.cache_gauge,
	context_gauge: gauges.context_gauge,

	// Visual segments
	lines_bar: visuals.lines_bar,
	cost_sparkline: visuals.cost_sparkline,
	cache_reads_sparkline: visuals.cache_reads_sparkline,
	activity_strip: visuals.activity_strip,
	streak_bar: visuals.streak_bar,
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
