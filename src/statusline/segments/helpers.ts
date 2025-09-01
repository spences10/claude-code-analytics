import { get_database } from '../../database/connection';

// Helper to get pre-computed session data
export function get_session_summary(session_id?: string) {
	if (!session_id) return null;
	try {
		const db = get_database();
		return db
			.prepare('SELECT * FROM session_summary WHERE session_id = ?')
			.get(session_id) as any;
	} catch {
		return null;
	}
}

// Helper to get global metrics
export function get_global_metric(key: string): number {
	try {
		const db = get_database();
		const row = db
			.prepare(
				'SELECT metric_value FROM global_summary WHERE metric_key = ?',
			)
			.get(key) as any;
		return Number(row?.metric_value || 0);
	} catch {
		return 0;
	}
}

// Helper to get sparkline data
export function get_sparkline_data(key: string): number[] {
	try {
		const db = get_database();
		const row = db
			.prepare(
				'SELECT data_points FROM sparkline_cache WHERE cache_key = ?',
			)
			.get(key) as any;
		return row?.data_points ? JSON.parse(row.data_points) : [];
	} catch {
		return [];
	}
}
