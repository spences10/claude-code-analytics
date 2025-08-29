// Database result types
export interface SessionRow {
	session_id: string;
	project_id: number;
	started_at: string;
	duration_ms: number;
	total_cost_usd: number;
	total_lines_added: number;
	total_lines_removed: number;
	project_name?: string;
	lines_changed: number;
	tool_calls: number;
	unique_tools?: number;
	duration_minutes: number;
}

export interface CostRow {
	date: string;
	daily_cost: number;
	session_count: number;
}

export interface ToolRow {
	tool_name: string;
	usage_count: number;
	percentage: number;
	avg_execution_ms: number | null;
	error_count: number;
}

export interface ActivityRow {
	date: string;
	session_count: number;
	total_minutes: number;
}

export interface StatsRow {
	total_sessions: number;
	total_cost: number;
	total_projects: number;
	total_tools: number;
}

export interface ProjectROIRow {
	project_name: string;
	total_cost: number;
	total_lines: number;
	session_count: number;
	avg_session_cost: number;
	lines_per_dollar: number;
	last_activity: string;
}

export interface FileHeatRow {
	file_path: string;
	edit_count: number;
	total_lines_changed: number;
	session_count: number;
	last_modified: string;
	operation_type: string;
}

export interface SessionFlowRow {
	session_id: string;
	project_name: string;
	duration_minutes: number;
	tool_calls: number;
	lines_changed: number;
	cost_usd: number;
	efficiency_score: number;
	flow_state_duration: number;
	context_switches: number;
}

export interface ToolPerformanceRow {
	tool_name: string;
	usage_count: number;
	success_rate: number;
	avg_execution_ms: number;
	trend_direction: string;
	failure_patterns: string;
	recent_performance: number;
}

export interface IntelligentInsightRow {
	insight_type: string;
	insight_message: string;
	confidence_score: number;
	data_points: number;
	actionable: boolean;
}
