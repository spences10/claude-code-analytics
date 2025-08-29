import { execSync } from 'node:child_process';

export function get_git_status(): {
	branch: string;
	is_clean: boolean;
} | null {
	try {
		// Get current branch
		const branch = execSync('git rev-parse --abbrev-ref HEAD', {
			encoding: 'utf8',
			timeout: 1000,
		})
			.toString()
			.trim();

		// Check if working directory is clean
		const status = execSync('git status --porcelain', {
			encoding: 'utf8',
			timeout: 1000,
		})
			.toString()
			.trim();

		return {
			branch,
			is_clean: status === '',
		};
	} catch {
		return null;
	}
}

export function build_git_status(
	git_branch_from_data?: string,
): string {
	// Try to get detailed git status
	const git_status = get_git_status();

	if (git_status) {
		const status_indicator = git_status.is_clean ? '✓' : '●';
		return `🌿 ${git_status.branch} ${status_indicator}`;
	}

	// Fallback to data from Claude Code if available
	if (git_branch_from_data) {
		return `🌿 ${git_branch_from_data}`;
	}

	return '';
}
