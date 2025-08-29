import Database from 'better-sqlite3';
import path from 'node:path';
import { ensure_schema_exists } from './migration';

let db_instance: Database.Database | null = null;

export function get_db_path(): string {
	return path.join(
		process.env.HOME || '',
		'.claude',
		'claude-code-statusline.db',
	);
}

export function get_database(): Database.Database {
	if (!db_instance) {
		try {
			db_instance = new Database(get_db_path());
			ensure_schema_exists(db_instance);
		} catch (error) {
			console.error('Database initialization failed:', error);
			throw error; // Re-throw to prevent using a bad instance
		}
	}
	return db_instance;
}

export function close_database(): void {
	if (db_instance) {
		db_instance.close();
		db_instance = null;
	}
}

export function with_database<T>(
	fn: (db: Database.Database) => T,
	operation_name: string,
): T | undefined {
	try {
		const db = get_database();
		return fn(db);
	} catch (error) {
		console.error(`Failed to ${operation_name}:`, error);
		return undefined;
	}
}
