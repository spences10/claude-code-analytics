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
