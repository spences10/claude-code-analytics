import { is_hook_logging_enabled } from '../config';

export function hook_log(message: string): void {
	if (is_hook_logging_enabled()) {
		console.log(`[hook] ${message}`);
	}
}

export function hook_error(message: string, error?: Error): void {
	if (is_hook_logging_enabled()) {
		console.error(`[hook] ${message}`, error || '');
	}
}

export function hook_warn(message: string): void {
	if (is_hook_logging_enabled()) {
		console.warn(`[hook] ${message}`);
	}
}
