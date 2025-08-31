import {
	cancel,
	isCancel,
	multiselect,
	select,
} from '@clack/prompts';
import { save_global_config } from '../../config';
import {
	install_claude_integration,
	uninstall_claude_integration,
} from './hooks';

export async function run_configuration() {
	while (true) {
		const config_action = await select({
			message: 'What would you like to configure?',
			options: [
				{
					value: 'install',
					label: '🔧 Install Claude Code Integration',
					hint: 'Choose what to install (statusline and/or hooks)',
				},
				{
					value: 'uninstall',
					label: '🗑️  Uninstall Claude Code Integration',
					hint: 'Choose what to remove from Claude Code',
				},
				{
					value: 'settings',
					label: '⚙️  Configure Settings',
					hint: 'Adjust data collection and display preferences',
				},
				{ value: 'back', label: 'Back to Main Menu' },
			],
		});

		if (isCancel(config_action) || config_action === 'back') {
			// Return to main menu instead of quitting entire CLI
			return;
		}

		if (config_action === 'install') {
			// Step 1: Always ask about statusline first
			const install_statusline = await select({
				message: 'Install statusline display?',
				options: [
					{
						value: true,
						label: '✅ Yes - Install statusline',
						hint: 'Real-time cost, duration, and activity metrics',
					},
					{
						value: false,
						label: '❌ No - Skip statusline',
						hint: 'Only install data collection hooks',
					},
				],
			});

			if (isCancel(install_statusline)) {
				// Go back to configuration menu
				continue;
			}

			// Step 2: Ask about hooks (always ask, regardless of statusline choice)
			const install_hooks = await select({
				message: 'Add data collection hooks?',
				options: [
					{
						value: true,
						label: '✅ Yes - Add hooks',
						hint: 'Enable session analytics and CLI insights',
					},
					{
						value: false,
						label: '❌ No - Skip hooks',
						hint: install_statusline
							? 'Statusline only (basic metrics)'
							: 'Nothing will be installed',
					},
				],
			});

			if (isCancel(install_hooks)) {
				// Go back to configuration menu
				continue;
			}

			// Build components array based on choices
			const components: string[] = [];
			if (install_statusline) components.push('statusline');
			if (install_hooks) components.push('hooks');

			if (components.length === 0) {
				cancel('No components selected for installation.');
				continue;
			}

			const result = await install_claude_integration(components);
			return result
				? { action: 'install', components, success: true }
				: null;
		}

		if (config_action === 'uninstall') {
			const components = await multiselect({
				message: 'Select components to uninstall:',
				options: [
					{
						value: 'statusline',
						label: '📊 Statusline Display',
						hint: 'Remove real-time metrics display',
					},
					{
						value: 'hooks',
						label: '🔗 Data Collection Hooks',
						hint: 'Remove session and tool usage analytics',
					},
				],
			});

			if (isCancel(components)) {
				// Back to configuration menu
				continue;
			}

			const result = await uninstall_claude_integration(
				components as string[],
			);
			return result
				? { action: 'uninstall', components, success: true }
				: null;
		}

		if (config_action === 'settings') {
			const data_collection = await select({
				message: 'Enable core data collection (sessions, projects)?',
				options: [
					{
						value: true,
						label:
							'Enabled - Collect session and project data (default)',
					},
					{
						value: false,
						label: 'Disabled - No data collection (package disabled)',
					},
				],
			});

			if (isCancel(data_collection)) {
				// Back to configuration menu
				continue;
			}

			const performance_logging = await select({
				message: 'Enable performance logging for debugging?',
				options: [
					{
						value: false,
						label: 'Disabled - No performance logging (default)',
					},
					{
						value: true,
						label: 'Enabled - Log hook execution times for debugging',
					},
				],
			});

			if (isCancel(performance_logging)) {
				// Back to configuration menu
				continue;
			}

			save_global_config({
				data_collection: data_collection as boolean,
				performance_logging: performance_logging as boolean,
			});

			return {
				action: 'settings',
				data_collection: data_collection as boolean,
				performance_logging: performance_logging as boolean,
			};
		}
	}
}
