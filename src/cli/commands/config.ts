import { cancel, isCancel, select, text } from '@clack/prompts';
import { save_global_config } from '../../config';

export async function run_configuration() {
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
				label: 'Enabled - Collect session and project data (default)',
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

	save_global_config({
		name: name as string,
		data_collection: data_collection as boolean,
		performance_logging: performance_logging as boolean,
	});

	return {
		name: name as string,
		data_collection: data_collection as boolean,
		performance_logging: performance_logging as boolean,
	};
}
