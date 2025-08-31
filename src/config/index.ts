import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export interface StatuslineConfig {
	name?: string;
	data_collection?: boolean;
	performance_logging?: boolean;
	hook_logging?: boolean;
	display?: {
		show_cost?: boolean;
		show_duration?: boolean;
		show_lines_changed?: boolean;
		show_model?: boolean;
		show_session_status?: boolean;
		show_working_directory?: boolean;
		icons?: boolean;
		powerline?: boolean;
		icon_overrides?: Record<string, string>;
		theme?: 'minimal' | 'ascii' | 'emoji';
		layout?: string[][];
	};
	thresholds?: {
		cost_warning?: number;
		token_warning?: number;
	};
	data?: {
		polling_interval?: number;
		auto_cleanup_days?: number;
	};
}

const global_config_dir = path.join(os.homedir(), '.claude');
const global_config_file = path.join(
	global_config_dir,
	'claude-code-analytics.json',
);

function get_project_config_path(project_dir?: string): string {
	const base_dir = project_dir || process.cwd();
	return path.join(base_dir, '.claude', 'claude-code-analytics.json');
}

function deep_merge(target: any, source: any): any {
	const result = { ...target };
	for (const key in source) {
		if (
			source[key] !== null &&
			typeof source[key] === 'object' &&
			!Array.isArray(source[key])
		) {
			result[key] = deep_merge(result[key] || {}, source[key]);
		} else {
			result[key] = source[key];
		}
	}
	return result;
}

export function save_global_config(config: StatuslineConfig): void {
	if (!fs.existsSync(global_config_dir)) {
		fs.mkdirSync(global_config_dir, { recursive: true });
	}
	fs.writeFileSync(
		global_config_file,
		JSON.stringify(config, null, 2),
	);
}

export function save_project_config(
	config: StatuslineConfig,
	project_dir?: string,
): void {
	const project_config_path = get_project_config_path(project_dir);
	const project_config_dir = path.dirname(project_config_path);

	if (!fs.existsSync(project_config_dir)) {
		fs.mkdirSync(project_config_dir, { recursive: true });
	}
	fs.writeFileSync(
		project_config_path,
		JSON.stringify(config, null, 2),
	);
}

function load_config_file(
	file_path: string,
): StatuslineConfig | null {
	try {
		if (!fs.existsSync(file_path)) {
			return null;
		}
		const content = fs.readFileSync(file_path, 'utf8');
		return JSON.parse(content);
	} catch {
		return null;
	}
}

export function load_config(project_dir?: string): StatuslineConfig {
	const global_config = load_config_file(global_config_file) || {};
	const project_config =
		load_config_file(get_project_config_path(project_dir)) || {};

	return deep_merge(global_config, project_config);
}

export function get_default_config(): StatuslineConfig {
	return {
		name: 'statusline',
		data_collection: true,
		performance_logging: false,
		hook_logging: false,
		display: {
			show_cost: true,
			show_duration: true,
			show_lines_changed: true,
			show_model: true,
			show_session_status: true,
			show_working_directory: false,
			icons: true,
			theme: 'minimal',
		},
		thresholds: {
			cost_warning: 1.0,
			token_warning: 100000,
		},
		data: {
			polling_interval: 5000,
			auto_cleanup_days: 30,
		},
	};
}

export function is_data_collection_enabled(
	project_dir?: string,
): boolean {
	const config = load_config(project_dir);
	return config?.data_collection !== false;
}

export function is_performance_logging_enabled(
	project_dir?: string,
): boolean {
	const config = load_config(project_dir);
	return config?.performance_logging === true;
}

export function is_hook_logging_enabled(
	project_dir?: string,
): boolean {
	const config = load_config(project_dir);
	return config?.hook_logging === true;
}
