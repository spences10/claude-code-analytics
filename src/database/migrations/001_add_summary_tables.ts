import type Database from 'better-sqlite3';
import type { Migration } from '../types/migration';

export const migration_001_add_summary_tables: Migration = {
	version: 2,
	name: 'add_summary_tables',
	description:
		'Add pre-computed summary tables for fast statusline queries',

	up: (db: Database.Database) => {
		// Session-level summary metrics (updated by hooks)
		db.exec(`
			CREATE TABLE IF NOT EXISTS session_summary (
				session_id TEXT PRIMARY KEY,
				
				-- Productivity metrics
				efficiency_score REAL,
				session_rank TEXT, -- 'high', 'medium', 'low'
				cost_efficiency REAL,
				lines_per_dollar REAL,
				
				-- Tool metrics
				tool_success_rate REAL,
				tool_count INTEGER,
				
				-- Cache metrics
				cache_efficiency REAL,
				cache_savings_tokens INTEGER,
				total_cache_reads INTEGER,
				total_cache_creates INTEGER,
				
				-- Context metrics
				total_input_tokens INTEGER,
				total_output_tokens INTEGER,
				total_context_tokens INTEGER, -- input + output + cache_reads
				
				-- Computed at
				last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				
				FOREIGN KEY (session_id) REFERENCES sessions(session_id)
			)
		`);

		// Global metrics summary (updated periodically by hooks)
		db.exec(`
			CREATE TABLE IF NOT EXISTS global_summary (
				metric_key TEXT PRIMARY KEY,
				metric_value REAL,
				last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			)
		`);

		// Sparkline data cache (updated by hooks)
		db.exec(`
			CREATE TABLE IF NOT EXISTS sparkline_cache (
				cache_key TEXT PRIMARY KEY,
				data_points TEXT, -- JSON array of values
				last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			)
		`);

		// Indexes for fast statusline lookups
		db.exec(`
			CREATE INDEX IF NOT EXISTS idx_session_summary_rank 
			ON session_summary(session_rank)
		`);

		db.exec(`
			CREATE INDEX IF NOT EXISTS idx_global_summary_key 
			ON global_summary(metric_key)
		`);

		db.exec(`
			CREATE INDEX IF NOT EXISTS idx_sparkline_cache_key 
			ON sparkline_cache(cache_key)
		`);

		// Initialize default global metrics
		const init_global_metrics = db.prepare(`
			INSERT OR IGNORE INTO global_summary (metric_key, metric_value) VALUES (?, ?)
		`);

		init_global_metrics.run('avg_tool_success_rate_7d', 0);
		init_global_metrics.run('avg_cache_efficiency_7d', 0);
		init_global_metrics.run('avg_cost_per_session_7d', 0);
		init_global_metrics.run('total_sessions_today', 0);
		init_global_metrics.run('total_sessions_7d', 0);

		// Initialize default sparkline cache entries
		const init_sparkline_cache = db.prepare(`
			INSERT OR IGNORE INTO sparkline_cache (cache_key, data_points) VALUES (?, ?)
		`);

		init_sparkline_cache.run('cost_sparkline_20', '[]');
		init_sparkline_cache.run('cache_sparkline_20', '[]');
		init_sparkline_cache.run('activity_hourly_24h', '[]');
		init_sparkline_cache.run('streak_daily_7d', '[]');

		console.log(
			'✨ Summary tables created for fast statusline performance',
		);
	},

	down: (db: Database.Database) => {
		// Drop in reverse order of creation
		db.exec('DROP INDEX IF EXISTS idx_sparkline_cache_key');
		db.exec('DROP INDEX IF EXISTS idx_global_summary_key');
		db.exec('DROP INDEX IF EXISTS idx_session_summary_rank');

		db.exec('DROP TABLE IF EXISTS sparkline_cache');
		db.exec('DROP TABLE IF EXISTS global_summary');
		db.exec('DROP TABLE IF EXISTS session_summary');

		console.log('🗑️ Summary tables removed');
	},
};
