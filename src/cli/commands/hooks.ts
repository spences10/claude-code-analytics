import { confirm, isCancel, spinner } from '@clack/prompts';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const claude_settings_path = path.join(
	os.homedir(),
	'.claude',
	'settings.json',
);

interface ClaudeSettings {
	statusLine?: {
		type: 'command';
		command: string;
	};
	hooks?: {
		SessionStart?: Array<{
			hooks: Array<{
				type: 'command';
				command: string;
				timeout: number;
			}>;
		}>;
		SessionEnd?: Array<{
			hooks: Array<{
				type: 'command';
				command: string;
				timeout: number;
			}>;
		}>;
		PreToolUse?: Array<{
			hooks: Array<{
				type: 'command';
				command: string;
				timeout: number;
			}>;
		}>;
		PostToolUse?: Array<{
			hooks: Array<{
				type: 'command';
				command: string;
				timeout: number;
			}>;
		}>;
		UserPromptSubmit?: Array<{
			hooks: Array<{
				type: 'command';
				command: string;
				timeout: number;
			}>;
		}>;
		Stop?: Array<{
			hooks: Array<{
				type: 'command';
				command: string;
				timeout: number;
			}>;
		}>;
	};
}

function get_hook_config(): ClaudeSettings {
	return {
		statusLine: {
			type: 'command',
			command: 'claude-code-analytics',
		},
		hooks: {
			SessionStart: [
				{
					hooks: [
						{
							type: 'command',
							command: 'claude-code-analytics session_start',
							timeout: 3000,
						},
					],
				},
			],
			SessionEnd: [
				{
					hooks: [
						{
							type: 'command',
							command: 'claude-code-analytics session_end',
							timeout: 3000,
						},
					],
				},
			],
			PreToolUse: [
				{
					hooks: [
						{
							type: 'command',
							command: 'claude-code-analytics pre_tool_use',
							timeout: 3000,
						},
					],
				},
			],
			PostToolUse: [
				{
					hooks: [
						{
							type: 'command',
							command: 'claude-code-analytics post_tool_use',
							timeout: 3000,
						},
					],
				},
			],
			UserPromptSubmit: [
				{
					hooks: [
						{
							type: 'command',
							command: 'claude-code-analytics user_prompt_submit',
							timeout: 3000,
						},
					],
				},
			],
			Stop: [
				{
					hooks: [
						{
							type: 'command',
							command: 'claude-code-analytics session_stop',
							timeout: 5000,
						},
					],
				},
			],
		},
	};
}

function load_claude_settings(): ClaudeSettings | null {
	try {
		if (!fs.existsSync(claude_settings_path)) {
			return null;
		}
		const content = fs.readFileSync(claude_settings_path, 'utf8');
		return JSON.parse(content);
	} catch {
		return null;
	}
}

function save_claude_settings(settings: ClaudeSettings): void {
	const claude_dir = path.dirname(claude_settings_path);
	if (!fs.existsSync(claude_dir)) {
		fs.mkdirSync(claude_dir, { recursive: true });
	}
	fs.writeFileSync(
		claude_settings_path,
		JSON.stringify(settings, null, 2),
	);
}

function merge_settings(
	existing: ClaudeSettings,
	new_config: ClaudeSettings,
): ClaudeSettings {
	const merged = { ...existing };

	// Add/update statusLine
	if (new_config.statusLine) {
		merged.statusLine = new_config.statusLine;
	}

	// Add/update hooks (preserve existing hooks, only add/replace our hooks)
	if (new_config.hooks) {
		if (!merged.hooks) {
			merged.hooks = {};
		}

		// Only merge our specific hook types, preserve any other hooks
		Object.assign(merged.hooks, new_config.hooks);
	}

	return merged;
}

function remove_our_hooks_only(
	settings: ClaudeSettings,
): ClaudeSettings {
	const cleaned = { ...settings };

	if (cleaned.hooks) {
		// Only remove hooks that contain our command
		const our_hook_types = [
			'SessionStart',
			'SessionEnd',
			'PreToolUse',
			'PostToolUse',
			'UserPromptSubmit',
			'Stop',
		];

		for (const hook_type of our_hook_types) {
			if (cleaned.hooks[hook_type as keyof typeof cleaned.hooks]) {
				const hooks_array =
					cleaned.hooks[hook_type as keyof typeof cleaned.hooks];
				if (Array.isArray(hooks_array)) {
					// Filter out only our hooks, keep any other hooks
					const filtered = hooks_array.filter((group: any) => {
						if (group.hooks && Array.isArray(group.hooks)) {
							// Keep hook groups that don't contain our command (old or new format)
							return !group.hooks.some(
								(hook: any) =>
									hook.command &&
									(hook.command.includes('claude-code-analytics') ||
										hook.command.includes('claude-code-statusline') ||
										hook.command.includes('statusline.js')),
							);
						}
						return true;
					});

					if (filtered.length === 0) {
						// If no hooks left for this type, remove the entire type
						delete cleaned.hooks[
							hook_type as keyof typeof cleaned.hooks
						];
					} else {
						// Keep the filtered hooks
						(cleaned.hooks as any)[hook_type] = filtered;
					}
				}
			}
		}

		// If hooks object is empty, remove it entirely
		if (Object.keys(cleaned.hooks).length === 0) {
			delete cleaned.hooks;
		}
	}

	return cleaned;
}

export async function install_claude_integration(
	components: string[],
): Promise<boolean> {
	const s = spinner();
	s.start('Checking Claude Code settings...');

	if (components.length === 0) {
		s.stop('No components selected.');
		return false;
	}

	const existing_settings = load_claude_settings() || {};
	s.stop('Settings loaded.');

	// Check what's already installed (both new and old command formats)
	const has_statusline =
		existing_settings.statusLine?.command?.includes(
			'claude-code-analytics',
		) ||
		existing_settings.statusLine?.command?.includes(
			'claude-code-statusline',
		) ||
		existing_settings.statusLine?.command?.includes('statusline.js');
	const has_hooks =
		existing_settings.hooks?.SessionStart?.[0]?.hooks?.[0]?.command?.includes(
			'claude-code-analytics',
		) ||
		existing_settings.hooks?.SessionStart?.[0]?.hooks?.[0]?.command?.includes(
			'claude-code-statusline',
		) ||
		existing_settings.hooks?.SessionStart?.[0]?.hooks?.[0]?.command?.includes(
			'statusline.js',
		);

	const will_install_statusline = components.includes('statusline');
	const will_install_hooks = components.includes('hooks');

	// Check for conflicts
	if (will_install_statusline && has_statusline) {
		const reinstall = await confirm({
			message:
				'Claude Code statusline is already installed. Reinstall?',
		});

		if (isCancel(reinstall) || !reinstall) {
			return false;
		}
	}

	if (will_install_hooks && has_hooks) {
		const reinstall = await confirm({
			message: 'Claude Code hooks are already installed. Reinstall?',
		});

		if (isCancel(reinstall) || !reinstall) {
			return false;
		}
	}

	s.start(`Installing ${components.join(' and ')}...`);

	try {
		let merged_settings = { ...existing_settings };

		if (will_install_statusline) {
			merged_settings.statusLine = {
				type: 'command',
				command: 'claude-code-analytics',
			};
		}

		if (will_install_hooks) {
			const hook_config = get_hook_config();
			merged_settings = merge_settings(merged_settings, {
				hooks: hook_config.hooks,
			});
		}

		save_claude_settings(merged_settings);
		s.stop('Installation completed successfully!');
		return true;
	} catch (error) {
		s.stop('Failed to install components.');
		console.error('Error:', error);
		return false;
	}
}

export async function uninstall_claude_integration(
	components: string[],
): Promise<boolean> {
	const s = spinner();
	s.start('Checking Claude Code settings...');

	if (components.length === 0) {
		s.stop('No components selected.');
		return false;
	}

	const existing_settings = load_claude_settings();

	if (!existing_settings) {
		s.stop('No Claude Code settings found.');
		return false;
	}

	const has_statusline =
		existing_settings.statusLine?.command?.includes(
			'claude-code-analytics',
		) ||
		existing_settings.statusLine?.command?.includes(
			'claude-code-statusline',
		) ||
		existing_settings.statusLine?.command?.includes('statusline.js');
	const has_hooks =
		existing_settings.hooks?.SessionStart?.[0]?.hooks?.[0]?.command?.includes(
			'claude-code-analytics',
		) ||
		existing_settings.hooks?.SessionStart?.[0]?.hooks?.[0]?.command?.includes(
			'claude-code-statusline',
		) ||
		existing_settings.hooks?.SessionStart?.[0]?.hooks?.[0]?.command?.includes(
			'statusline.js',
		);

	const will_remove_statusline = components.includes('statusline');
	const will_remove_hooks = components.includes('hooks');

	// Check if any components are actually installed
	const statusline_installable =
		will_remove_statusline && has_statusline;
	const hooks_installable = will_remove_hooks && has_hooks;

	if (!statusline_installable && !hooks_installable) {
		s.stop('None of the selected components are installed.');
		return false;
	}

	// Show warnings for components not installed
	if (will_remove_statusline && !has_statusline) {
		console.log(
			'Note: Statusline is not installed, skipping statusline removal.',
		);
	}

	if (will_remove_hooks && !has_hooks) {
		console.log(
			'Note: Hooks are not installed, skipping hooks removal.',
		);
	}

	s.stop('Found installed components.');

	const confirm_uninstall = await confirm({
		message: `Are you sure you want to uninstall ${components.join(' and ')}?`,
	});

	if (isCancel(confirm_uninstall) || !confirm_uninstall) {
		return false;
	}

	s.start(`Uninstalling ${components.join(' and ')}...`);

	try {
		let cleaned_settings = { ...existing_settings };

		if (will_remove_statusline && has_statusline) {
			delete cleaned_settings.statusLine;
		}

		if (will_remove_hooks && has_hooks) {
			cleaned_settings = remove_our_hooks_only(cleaned_settings);
		}

		// If settings are completely empty, remove the file
		if (Object.keys(cleaned_settings).length === 0) {
			fs.unlinkSync(claude_settings_path);
		} else {
			save_claude_settings(cleaned_settings);
		}

		s.stop('Uninstallation completed successfully!');
		return true;
	} catch (error) {
		s.stop('Failed to uninstall components.');
		console.error('Error:', error);
		return false;
	}
}
