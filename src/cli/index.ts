import { intro, outro, text, confirm, cancel, isCancel } from '@clack/prompts';

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
				if (value.length === 0) return `Configuration name is required!`;
			},
		});

		if (isCancel(name)) {
			cancel('Configuration cancelled.');
			return;
		}

		// For now, just show what we collected
		outro(`Configuration "${name}" ready! (More options coming soon...)`);
	} else {
		outro('No configuration changes made.');
	}
}