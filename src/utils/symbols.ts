// Powerline and Unicode symbols and helpers

export const BRANCH_SYMBOL = ' \uE0A0';
export const DIRTY_SYMBOL = '\u00B1';
export const CLEAN_SYMBOL = '\u2713';

export const FOLDER_SYMBOL = '📁';
export const AI_SYMBOL = '\u26A1';
export const WARNING_SYMBOL = '\u2699';
export const ERROR_SYMBOL = '\u2717';
export const INFO_SYMBOL = '\u2022';
export const COST_SYMBOL = '💰';

export const AHEAD_SYMBOL = '⇡';
export const BEHIND_SYMBOL = '⇣';
export const CONFLICTS_SYMBOL = '⚠️';
export const STAGED_ADD_SYMBOL = '\u207A';
export const STAGED_DEL_SYMBOL = '\u207B';
export const UNSTAGED_SYMBOL = '\u02DC';
export const UNTRACKED_SYMBOL = '\u1D58';

export const BRAIN_SYMBOL = '🧠';

export function get_symbol(
	symbol_name: string,
	icon_overrides?: Record<string, string>,
): string {
	if (icon_overrides && icon_overrides[symbol_name]) {
		return icon_overrides[symbol_name];
	}
	const symbol_map: Record<string, string> = {
		branch: BRANCH_SYMBOL,
		dirty: DIRTY_SYMBOL,
		clean: CLEAN_SYMBOL,
		folder: FOLDER_SYMBOL,
		ai: AI_SYMBOL,
		warning: WARNING_SYMBOL,
		error: ERROR_SYMBOL,
		info: INFO_SYMBOL,
		cost: COST_SYMBOL,
		ahead: AHEAD_SYMBOL,
		behind: BEHIND_SYMBOL,
		conflicts: CONFLICTS_SYMBOL,
		staged_add: STAGED_ADD_SYMBOL,
		staged_del: STAGED_DEL_SYMBOL,
		unstaged: UNSTAGED_SYMBOL,
		untracked: UNTRACKED_SYMBOL,
		brain: BRAIN_SYMBOL,
	};
	return symbol_map[symbol_name] || symbol_name;
}

export function supports_powerline(
	env: NodeJS.ProcessEnv = process.env,
): boolean {
	// UTF-8 locale required
	const locale = env.LC_ALL || env.LC_CTYPE || env.LANG || '';
	const has_utf8 = /utf-?8/i.test(locale);

	// Common terminals where users often install Powerline fonts
	const tp = env.TERM_PROGRAM || '';
	const likely_term =
		/iTerm|WezTerm|Apple_Terminal|Hyper|WindowsTerminal/i.test(tp) ||
		!!env.WT_SESSION || // Windows Terminal session
		!!env.KONSOLE_VERSION ||
		!!env.WAYLAND_DISPLAY;

	return has_utf8 && likely_term;
}

// UI icon selection by theme
import type { StatuslineConfig } from '../config';

export function get_ui_icon(
	name: string,
	config?: StatuslineConfig,
): string {
	const overrides = config?.display?.icon_overrides;
	if (overrides && overrides[name]) return overrides[name];

	const theme = (config?.display as any)?.theme || 'minimal';
	const icons = config?.display?.icons !== false;
	if (!icons) return '';

	const EMOJI: Record<string, string> = {
		model: '🤖',
		cost: '💰',
		duration: '⏱️',
		lines: '📊',
		tools: '🔧',
		folder: '📁',
		cache: '⟳',
	};

	const MINIMAL: Record<string, string> = {
		model: 'M',
		cost: '$',
		duration: 't',
		lines: '±',
		tools: '⚙',
		folder: '',
		cache: '⟳',
	};

	const ASCII: Record<string, string> = {
		model: 'M',
		cost: '$',
		duration: 't',
		lines: '+/-',
		tools: 'tool',
		folder: '',
		cache: 'cache',
	};

	const table =
		theme === 'emoji' ? EMOJI : theme === 'ascii' ? ASCII : MINIMAL;
	return table[name] || '';
}
