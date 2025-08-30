export interface ClaudeCodeData {
	session_id?: string;
	transcript_path?: string;
	cwd?: string;
	model?: {
		id: string;
		display_name: string;
	};
	workspace?: {
		current_dir: string;
		project_dir: string;
	};
	version?: string;
	output_style?: {
		name: string;
	};
	cost?: {
		total_cost_usd: number;
		total_duration_ms: number;
		total_api_duration_ms: number;
		total_lines_added: number;
		total_lines_removed: number;
	};
	exceeds_200k_tokens?: boolean;

	// Hook-specific fields
	tool_name?: string;
	toolUseID?: string;
	file_path?: string;
	lines_changed?: number;
	error_message?: string;
	end_reason?: string;
	gitBranch?: string;
	sessionSource?: string;
	session_source?: string;

	[key: string]: any;
}

export interface HookEvent {
	event_id?: number;
	session_id: string;
	event_type: string;
	timestamp: string;
	execution_time_ms: number;
	tool_name?: string;
	event_data: string;
}

export interface Project {
	project_id?: number;
	project_path: string;
	project_name: string;
	created_at?: string;
	last_active_at?: string;
	total_sessions?: number;
	total_cost_usd?: number;
}

export interface Session {
	session_id: string;
	project_id: number;
	transcript_path: string;
	model_id?: string;
	model_display_name?: string;
	claude_version?: string;
	started_at?: string;
	ended_at?: string;
	last_active_at?: string;
	duration_ms?: number;
	total_cost_usd?: number;
	total_api_duration_ms?: number;
	total_lines_added?: number;
	total_lines_removed?: number;
	exceeds_200k_tokens?: boolean;
	session_source?: string;
	end_reason?: string;
}
