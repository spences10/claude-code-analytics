import chalk from 'chalk';
import { get_database } from '../../database';
import { create_usage_table } from '../../utils/charts';

export async function show_token_usage(days: number) {
	const db = get_database();

	const by_model = db
		.prepare(
			`
      SELECT 
        COALESCE(s.model_display_name, 'Unknown') as model,
        SUM(m.token_count_input) as input_tokens,
        SUM(m.token_count_output) as output_tokens,
        COUNT(DISTINCT s.session_id) as sessions
      FROM messages m
      JOIN sessions s ON s.session_id = m.session_id
      WHERE s.started_at >= datetime('now', '-${days} days')
      GROUP BY s.model_display_name
      ORDER BY input_tokens DESC
      LIMIT 12
    `,
		)
		.all() as {
		model: string;
		input_tokens: number | null;
		output_tokens: number | null;
		sessions: number;
	}[];

	if (!by_model.length) {
		console.log(
			chalk.yellow('\nNo token data for the selected period.'),
		);
		return;
	}

	console.log(chalk.blue.bold(`\nToken Usage (Last ${days} Days)\n`));
	const table = create_usage_table(
		[
			'Model',
			'Input Tokens',
			'Output Tokens',
			'Sessions',
			'Avg In/Session',
		],
		by_model.map((r) => [
			r.model,
			Number(r.input_tokens || 0).toLocaleString(),
			Number(r.output_tokens || 0).toLocaleString(),
			r.sessions.toString(),
			(
				Number(r.input_tokens || 0) /
				Math.max(1, Number(r.sessions || 0))
			).toFixed(0),
		]),
	);
	console.log(table);
}
