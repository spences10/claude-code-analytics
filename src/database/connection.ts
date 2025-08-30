import Database from 'better-sqlite3';
import path from 'node:path';
import { ensure_schema_exists } from './migration';

export function get_db_path(): string {
	return path.join(
		process.env.HOME || '',
		'.claude',
		'claude-code-statusline.db',
	);
}

export function get_database(): Database.Database {
	const db = new Database(get_db_path());

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
