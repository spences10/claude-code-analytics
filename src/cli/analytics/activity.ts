import chalk from 'chalk';
import { get_database } from '../../database';
import { create_activity_heatmap } from '../../utils/charts';

interface ActivityRow {
	day_of_week: string;
	hour: string;
	session_count: number;
	date: string;
}

export async function show_activity_analytics(days: number) {
	const db = get_database();

	// Get hourly activity data for heatmap
	const hourly_activity = db
		.prepare(
			`
		SELECT 
			strftime('%w', started_at) as day_of_week,
			strftime('%H', started_at) as hour,
			COUNT(*) as session_count,
			DATE(started_at) as date
		FROM sessions s
		WHERE s.started_at >= datetime('now', '-${days} days')
		AND s.started_at IS NOT NULL
		GROUP BY strftime('%w', started_at), strftime('%H', started_at)
	`,
		)
		.all() as ActivityRow[];

	if (hourly_activity.length === 0) {
		console.log(
			chalk.yellow(
				'\nNo activity data found for the specified period.',
			),
		);
		return;
	}

	console.log(
		chalk.blue.bold(`\nActivity Heatmap (Last ${days} Days)\n`),
	);

	// Show summary stats first
	const total_sessions = hourly_activity.reduce(
		(sum, h) => sum + h.session_count,
		0,
	);
	const active_days = new Set(hourly_activity.map((h) => h.date))
		.size;
	const peak_hour = hourly_activity.reduce((max, h) =>
		h.session_count > max.session_count ? h : max,
	);

	console.log(
		chalk.cyan(
			`Total: ${total_sessions} sessions across ${active_days} days`,
		),
	);
	console.log(
		chalk.cyan(
			`Peak: ${peak_hour.session_count} sessions on ${peak_hour.date} at ${peak_hour.hour}:00\n`,
		),
	);

	// Create 2D activity grid: [day][hour] for full 24-hour display
	const activity_grid: number[][] = [];
	const day_labels = [
		'Sun',
		'Mon',
		'Tue',
		'Wed',
		'Thu',
		'Fri',
		'Sat',
	];

	// Generate hour labels 00-23 with proper formatting
	const hour_labels = [];
	for (let i = 0; i < 24; i++) {
		hour_labels.push(i.toString().padStart(2, '0'));
	}

	// Initialize grid with zeros (7 days x 24 hours)
	for (let day = 0; day < 7; day++) {
		activity_grid[day] = new Array(24).fill(0);
	}

	// Fill grid with actual data
	hourly_activity.forEach((row) => {
		const day = parseInt(row.day_of_week);
		const hour = parseInt(row.hour);
		activity_grid[day][hour] = row.session_count;
	});

	const heatmap = create_activity_heatmap(activity_grid, {
		days: day_labels,
		hours: hour_labels,
	});

	console.log(heatmap);

	// Show top activity hours (not blocks)
	const activity_hours: Array<{
		day_name: string;
		hour: string;
		sessions: number;
		date: string;
	}> = [];
	hourly_activity.forEach((row) => {
		const day_name = day_labels[parseInt(row.day_of_week)];
		activity_hours.push({
			day_name,
			hour: row.hour,
			sessions: row.session_count,
			date: row.date,
		});
	});

	activity_hours.sort((a, b) => b.sessions - a.sessions);

	if (activity_hours.length > 0) {
		console.log(chalk.cyan('\nTop Activity Hours:'));
		activity_hours.slice(0, 5).forEach((period, i) => {
			console.log(
				`  ${i + 1}. ${period.day_name} ${period.hour}:00 (${period.date}): ${period.sessions} sessions`,
			);
		});
	}
}
