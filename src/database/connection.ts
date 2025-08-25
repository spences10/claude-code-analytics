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
	}

	return db;
}
