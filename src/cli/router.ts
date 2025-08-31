import fs from 'node:fs';
import path from 'node:path';
import { run_cli } from '.';
import {
	process_all_pending_transcripts,
	process_jsonl_transcript,
} from '../parsers/jsonl-parser';
import {
	run_analytics_dashboard,
	show_quick_stats,
} from './commands/analytics';
import {
	install_claude_integration,
	uninstall_claude_integration,
} from './commands/hooks';
import { run_onboarding } from './onboarding';

function print_help(): void {
	const lines = [
		'Usage: claude-code-analytics [command] [options]',
		'',
		'Commands:',
		'  help, --help               Show this help and exit',
		'  --version                  Show version and exit',
		'  config                     Open interactive configuration',
		'  analytics                  Explore analytics dashboard',
		'  quick-stats                Print a 7-day summary',
		'  install                    Install statusline and hooks',
		'  uninstall                  Uninstall statusline and hooks',
		'',
		'Advanced:',
		'  transcripts process-all    Process all pending JSONL transcripts',
		'  transcripts process-one <path> <session_id>',
		'                             Process a single transcript',
		'',
		'Default (no args): statusline mode for Claude Code integration.',
	];
	console.log(lines.join('\n'));
}

function print_version(): void {
	try {
		const pkgPath = path.join(__dirname, '..', 'package.json');
		const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as {
			version?: string;
		};
		console.log(pkg.version || '0.0.0');
	} catch {
		console.log('unknown');
	}
}

export async function handle_cli(argv: string[]): Promise<boolean> {
	if (!argv || argv.length === 0) return false;

	type CommandHandler = (args: string[]) => Promise<boolean>;

	const TRANSCRIPTS: Record<string, CommandHandler> = {
		'process-all': async () => {
			console.log('Processing all pending JSONL transcripts...');
			await process_all_pending_transcripts();
			console.log('Transcript processing completed.');
			return true;
		},
		'process-one': async ([transcript_path, session_id]) => {
			if (!transcript_path || !session_id) {
				console.error(
					'Usage: transcripts process-one <transcript_path> <session_id>',
				);
				return true;
			}
			console.log(
				`Processing JSONL transcript: ${transcript_path} for session ${session_id}`,
			);
			await process_jsonl_transcript(
				transcript_path,
				session_id,
				true,
			);
			console.log('Transcript processing completed.');
			return true;
		},
	};

	const COMMANDS: Record<string, CommandHandler> = {
		help: async () => {
			print_help();
			return true;
		},
		'-h': async () => COMMANDS.help([]),
		'--help': async () => COMMANDS.help([]),
		'--version': async () => {
			print_version();
			return true;
		},
		config: async () => {
			await run_cli();
			return true;
		},
		analytics: async () => {
			await run_analytics_dashboard();
			return true;
		},
		'quick-stats': async () => {
			await show_quick_stats();
			return true;
		},
		install: async () => {
			const ok = await install_claude_integration([
				'statusline',
				'hooks',
			]);
			if (ok) {
				console.log('✅ Installed statusline and hooks.');
			} else {
				console.log('Installation cancelled or failed.');
			}
			return true;
		},
		uninstall: async () => {
			const ok = await uninstall_claude_integration([
				'statusline',
				'hooks',
			]);
			if (ok) {
				console.log('🗑️  Uninstalled statusline and hooks.');
			} else {
				console.log('Uninstallation cancelled or failed.');
			}
			return true;
		},
		'--setup': async () => {
			await run_onboarding();
			return true;
		},
		transcripts: async (rest: string[]) => {
			const sub = rest[0];
			const handler = TRANSCRIPTS[sub];
			if (!handler) {
				console.error('Unknown transcripts command.');
				console.error(
					'Usage: transcripts process-all | transcripts process-one <path> <session_id>',
				);
				return true;
			}
			return handler(rest.slice(1));
		},
	};

	const [cmd, ...rest] = argv;
	const handler = COMMANDS[cmd];
	if (!handler) return false;
	return handler(rest);
}
