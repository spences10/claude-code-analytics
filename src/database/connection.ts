import Database from 'better-sqlite3';
import path from 'node:path';

export function get_db_path(): string {
	return path.join(
		process.env.HOME || '',
		'.claude',
		'claude-code-statusline.db',
	);
}

export function get_database(): Database.Database {
	return new Database(get_db_path());
}
