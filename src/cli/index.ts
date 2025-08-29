import {
	cancel,
	intro,
	isCancel,
	outro,
	select,
	spinner,
} from '@clack/prompts';
import chalk from 'chalk';
import { get_database } from '../database';
import { StatsRow } from '../types';
import { run_analytics_dashboard } from './commands/analytics';
import { run_configuration } from './commands/config';

export async function run_cli() {
	intro('🌟 Claude Code Analytics & Configuration');

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

		const db = get_database();

		const stats = db
			.prepare(
				`
			SELECT 
				COUNT(DISTINCT s.session_id) as total_sessions,
				SUM(s.total_cost_usd) as total_cost,
				COUNT(DISTINCT p.project_id) as total_projects,
				COUNT(tc.tool_call_id) as total_tools
			FROM sessions s
			LEFT JOIN projects p ON s.project_id = p.project_id
			LEFT JOIN tool_calls tc ON s.session_id = tc.session_id
			WHERE s.started_at >= datetime('now', '-7 days')
		`,
			)
			.get() as StatsRow;

		s.stop('Stats loaded!');

		console.log(chalk.cyan('\n📈 Last 7 Days Summary:'));
		console.log(`  Sessions: ${stats.total_sessions}`);
		console.log(
			`  Cost: $${Number(String(stats.total_cost || 0)).toFixed(2)}`,
		);
		console.log(`  Projects: ${stats.total_projects}`);
		console.log(`  Tool Calls: ${stats.total_tools}`);

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
					`Configuration "${result.name}" saved!\nData collection: ${result.data_collection}\nPerformance logging: ${result.performance_logging}`,
				);
			}
		} else {
			outro('No configuration changes made.');
		}
	} else {
		outro('No configuration changes made.');
	}
}
