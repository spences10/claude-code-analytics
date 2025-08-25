import {
	cancel,
	confirm,
	intro,
	isCancel,
	outro,
	select,
	text,
} from '@clack/prompts';
import { save_global_config } from '../config/index';

export async function run_cli() {
	intro('🌟 Claude Code Statusline Configuration');

	const should_configure = await confirm({
		message: 'Do you want to set up your statusline configuration?',
	});

	if (isCancel(should_configure)) {
		cancel('Configuration cancelled.');
		return;
	}

	if (should_configure) {
		const name = await text({
			message: 'What would you like to call this configuration?',
			placeholder: 'My Statusline Config',
			validate(value) {
				if (value.length === 0)
					return `Configuration name is required!`;
			},
		});

		if (isCancel(name)) {
			cancel('Configuration cancelled.');
			return;
		}

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
			cancel('Configuration cancelled.');
			return;
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
			cancel('Configuration cancelled.');
			return;
		}

		// Save configuration to ~/.claude/statusline-config.json
		save_global_config({
			name: name as string,
			data_collection: data_collection as boolean,
			performance_logging: performance_logging as boolean,
		});

		outro(
			`Configuration "${name}" saved!\nData collection: ${data_collection}\nPerformance logging: ${performance_logging}`,
		);
	} else {
		outro('No configuration changes made.');
	}
}
