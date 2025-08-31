import { execSync } from 'node:child_process';
import type { StatuslineConfig } from '../config';
import { get_symbol, supports_powerline } from './symbols';

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

function get_git_detailed_status(): {
	branch: string;
	ahead: number;
	behind: number;
	staged_add: number;
	staged_del: number;
	unstaged: number;
	untracked: number;
	conflicts: number;
} | null {
	try {
		const out = execSync('git status --porcelain=2 --branch', {
			encoding: 'utf8',
			timeout: 1000,
		})
			.toString()
			.trim();

		let branch = '';
		let ahead = 0;
		let behind = 0;
		let staged_add = 0;
		let staged_del = 0;
		let unstaged = 0;
		let untracked = 0;
		let conflicts = 0;

		const lines = out.split('\n');
		for (const line of lines) {
			if (line.startsWith('#')) {
				if (line.startsWith('# branch.head ')) {
					branch = line.slice('# branch.head '.length).trim();
				} else if (line.startsWith('# branch.ab ')) {
					const m = line.match(/\+(-?\d+)\s+-(-?\d+)/);
					if (m) {
						ahead = parseInt(m[1] || '0', 10) || 0;
						behind = parseInt(m[2] || '0', 10) || 0;
					}
				}
				continue;
			}
			if (line.startsWith('?')) {
				untracked++;
				continue;
			}
			if (line.startsWith('u ')) {
				conflicts++;
				continue;
			}
			if (line.startsWith('1 ') || line.startsWith('2 ')) {
				const parts = line.split(' ');
				if (parts.length > 1) {
					const xy = parts[1];
					const x = xy[0];
					const y = xy[1];
					if (x === 'A' || x === 'M' || x === 'R' || x === 'C')
						staged_add++;
					if (x === 'D') staged_del++;
					if (y === 'M' || y === 'D') unstaged++;
				}
			}
		}

		if (!branch) {
			branch = execSync('git rev-parse --abbrev-ref HEAD', {
				encoding: 'utf8',
				timeout: 500,
			})
				.toString()
				.trim();
		}

		return {
			branch,
			ahead,
			behind,
			staged_add,
			staged_del,
			unstaged,
			untracked,
			conflicts,
		};
	} catch {
		return null;
	}
}

export function build_git_status(
	git_branch_from_data?: string,
	config?: StatuslineConfig,
): string {
	const icon_overrides = config?.display?.icon_overrides;
	const icons_enabled = config?.display?.icons !== false;
	const powerline_enabled =
		config?.display?.powerline === true ||
		(config?.display?.powerline !== false && supports_powerline());

	// Try to get detailed git status
	const detailed = get_git_detailed_status();

	const branch_icon = icons_enabled
		? powerline_enabled
			? get_symbol('branch', icon_overrides)
			: '🌿'
		: '';

	if (detailed) {
		const parts: string[] = [];
		const base = `${branch_icon ? branch_icon + ' ' : ''}${detailed.branch}`;
		parts.push(base);

		if (detailed.ahead > 0)
			parts.push(
				`${get_symbol('ahead', icon_overrides)}${detailed.ahead}`,
			);
		if (detailed.behind > 0)
			parts.push(
				`${get_symbol('behind', icon_overrides)}${detailed.behind}`,
			);
		if (detailed.conflicts > 0) parts.push(`!${detailed.conflicts}`);
		if (detailed.staged_add > 0)
			parts.push(
				`${get_symbol('staged_add', icon_overrides)}${detailed.staged_add}`,
			);
		if (detailed.staged_del > 0)
			parts.push(
				`${get_symbol('staged_del', icon_overrides)}${detailed.staged_del}`,
			);
		if (detailed.unstaged > 0)
			parts.push(
				`${get_symbol('unstaged', icon_overrides)}${detailed.unstaged}`,
			);
		if (detailed.untracked > 0)
			parts.push(
				`${get_symbol('untracked', icon_overrides)}${detailed.untracked}`,
			);

		return parts.join(' ');
	}

	// Fallback to data from Claude Code if available
	if (git_branch_from_data) {
		return `${branch_icon ? branch_icon + ' ' : ''}${git_branch_from_data}`.trim();
	}

	return '';
}
