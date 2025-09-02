import Database from 'better-sqlite3';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ensure_schema_exists } from './migration';

export function get_db_path(): string {
	const claude_dir = path.join(os.homedir(), '.claude');

	// Ensure the directory exists
	fs.mkdirSync(claude_dir, { recursive: true });

	return path.join(claude_dir, 'claude-code-analytics.db');
}

function cleanup_stale_locks(): void {
	const db_path = get_db_path();
	const wal_path = `${db_path}-wal`;
	const shm_path = `${db_path}-shm`;

	try {
		// Remove stale lock files if they exist and are older than 5 minutes
		const five_minutes_ago = Date.now() - 5 * 60 * 1000;

		if (fs.existsSync(wal_path)) {
			const wal_stats = fs.statSync(wal_path);
			if (wal_stats.mtimeMs < five_minutes_ago) {
				fs.unlinkSync(wal_path);
			}
		}

		if (fs.existsSync(shm_path)) {
			const shm_stats = fs.statSync(shm_path);
			if (shm_stats.mtimeMs < five_minutes_ago) {
				fs.unlinkSync(shm_path);
			}
		}
	} catch (error) {
		// Silent cleanup - don't fail if we can't clean up locks
	}
}

export function get_database(): Database.Database {
	// Clean up any stale lock files before connecting
	cleanup_stale_locks();

	const db = new Database(get_db_path());

	// Set timeout to prevent hanging on locks (1 second max)
	db.pragma('busy_timeout = 1000');

	// Force WAL checkpoint to clean up write-ahead log
	db.pragma('wal_checkpoint(TRUNCATE)');

	// Auto-initialize schema if needed
	try {
		ensure_schema_exists(db);
	} catch (error) {
		console.error('Database initialization failed:', error);
		db.close();
		throw error;
	}

	return db;
}

export function with_database<T>(
	fn: (db: Database.Database) => T,
	operation_name: string,
): T | undefined {
	let db: Database.Database | null = null;
	try {
		db = get_database();
		const result = fn(db);
		db.close();
		return result;
	} catch (error) {
		console.error(`Failed to ${operation_name}:`, error);
		if (db) {
			db.close();
		}
		// For hooks, we need to see the actual errors, not silent failures
		throw error;
	}
}
