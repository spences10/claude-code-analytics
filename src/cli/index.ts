import {
	cancel,
	intro,
	isCancel,
	outro,
	select,
	spinner,
} from '@clack/prompts';
import { show_quick_stats } from './analytics/summary';
import { run_analytics_dashboard } from './commands/analytics';
import { run_configuration } from './commands/config';

export async function run_cli() {
	intro('🌟 Claude Code Analytics & Configuration');

	console.log('Hint: Press Esc to go back in submenus.');

	const main_action = await select({
		message: 'What would you like to do?',
		options: [
			{
				value: 'analytics',
				label: '📊 View Analytics Dashboard',
				hint: 'Interactive data exploration',
			},
			{
				value: 'configure',
				label: '⚙️  Configure Statusline',
				hint: 'Setup hooks and data collection',
			},
			{
				value: 'quick_stats',
				label: '⚡ Quick Stats',
				hint: 'Brief overview of recent activity',
			},
		],
	});

	if (isCancel(main_action)) {
		cancel('Operation cancelled.');
		return;
	}

	if (main_action === 'quick_stats') {
		const s = spinner();
		s.start('Loading your Claude Code stats...');

		s.stop('Stats loaded!');
		await show_quick_stats();

		outro(
			'Quick stats complete! Use Analytics Dashboard for detailed views.',
		);
		return;
	}

	if (main_action === 'analytics') {
		await run_analytics_dashboard();
		outro('Analytics session complete!');
		return;
	}

	if (main_action === 'configure') {
		const result = await run_configuration();
		if (result) {
			if (result.action === 'install') {
				const components_text = (result.components as string[]).join(
					' and ',
				);
				outro(
					`✅ ${components_text} installed successfully!\nYour Claude Code integration is now active.`,
				);
			} else if (result.action === 'uninstall') {
				const components_text = (result.components as string[]).join(
					' and ',
				);
				outro(
					`🗑️  ${components_text} uninstalled successfully!\nComponents have been removed from Claude Code.`,
				);
			} else if (result.action === 'settings') {
				outro(
					`Settings updated!\nData collection: ${result.data_collection}\nPerformance logging: ${result.performance_logging}`,
				);
			}
		} else {
			outro('No configuration changes made.');
		}
	} else {
		outro('No configuration changes made.');
	}
}
