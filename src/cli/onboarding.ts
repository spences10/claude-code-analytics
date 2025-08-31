import {
	cancel,
	confirm,
	intro,
	isCancel,
	outro,
	select,
} from '@clack/prompts';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { save_global_config } from '../config';
import { get_db_path } from '../database/connection';
import { install_claude_integration } from './commands/hooks';

const CLAUDE_DIR = path.join(os.homedir(), '.claude');
const SETTINGS_PATH = path.join(CLAUDE_DIR, 'settings.json');
const CONFIG_PATH = path.join(
	CLAUDE_DIR,
	'claude-code-analytics.json',
);
const ONBOARD_SKIP = path.join(
	CLAUDE_DIR,
	'.analytics_onboarding_skipped',
);

function file_exists(p: string): boolean {
	try {
		return fs.existsSync(p);
	} catch {
		return false;
	}
}

function has_integration_installed(): boolean {
	if (!file_exists(SETTINGS_PATH)) return false;
	try {
		const content = fs.readFileSync(SETTINGS_PATH, 'utf8');
		// Simple detection: any occurrence of our command
		return content.includes('claude-code-analytics');
	} catch {
		return false;
	}
}

export function needs_onboarding(): boolean {
	if (file_exists(ONBOARD_SKIP)) return false;
	if (has_integration_installed()) return false;
	if (file_exists(CONFIG_PATH)) return false;
	if (file_exists(get_db_path())) return false;
	return true;
}

export async function run_onboarding(): Promise<void> {
	intro('🌟 Claude Code Analytics — First-time Setup');

	const consent = await confirm({
		message:
			'This will create a local SQLite database in your home folder (no network) and record Claude Code session metadata (costs, durations, tool calls) for analytics. Continue?',
	});

	if (isCancel(consent) || !consent) {
		// Create sentinel to avoid asking again
		try {
			fs.mkdirSync(CLAUDE_DIR, { recursive: true });
			fs.writeFileSync(ONBOARD_SKIP, 'skipped');
		} catch {}
		cancel(
			'Setup skipped. You can run `claude-code-analytics config` anytime.',
		);
		return;
	}

	// Choose components
	const install_statusline = await select({
		message: 'Install statusline display?',
		options: [
			{
				value: true,
				label: '✅ Yes — Real-time metrics in statusline',
			},
			{ value: false, label: '❌ No — Skip statusline' },
		],
	});
	if (isCancel(install_statusline)) {
		cancel('Setup cancelled.');
		return;
	}

	const install_hooks = await select({
		message: 'Add data collection hooks?',
		options: [
			{
				value: true,
				label: '✅ Yes — Enrich analytics with hook events',
			},
			{ value: false, label: '❌ No — Skip hooks' },
		],
	});
	if (isCancel(install_hooks)) {
		cancel('Setup cancelled.');
		return;
	}

	const data_collection = await select({
		message: 'Enable core data collection (sessions, projects)?',
		options: [
			{ value: true, label: 'Enabled (recommended)' },
			{ value: false, label: 'Disabled' },
		],
	});
	if (isCancel(data_collection)) {
		cancel('Setup cancelled.');
		return;
	}

	// Save defaults
	try {
		save_global_config({
			name: 'Default',
			data_collection: Boolean(data_collection),
			performance_logging: false,
		});
	} catch {}

	// Install integration as selected
	const components: string[] = [];
	if (install_statusline) components.push('statusline');
	if (install_hooks) components.push('hooks');

	if (components.length > 0) {
		try {
			await install_claude_integration(components);
		} catch {}
	}

	outro(
		'✅ Setup complete! Open Claude Code and start a session to see metrics.',
	);
}
