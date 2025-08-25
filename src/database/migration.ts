import type Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

export function ensure_schema_exists(db: Database.Database): boolean {
	try {
		// Check if any core tables exist
		const tables_query = db.prepare(`
			SELECT name FROM sqlite_master 
			WHERE type='table' AND name IN ('projects', 'sessions', 'hook_events')
		`);
		const existing_tables = tables_query.all();

		// If no core tables exist, initialize schema
		if (existing_tables.length === 0) {
			initialize_database_schema(db);
			return true;
		}

		// TODO: Add schema version checking and migrations here
		return false;
	} catch (error) {
		console.error('Failed to check database schema:', error);
		return false;
	}
}

function initialize_database_schema(db: Database.Database): void {
	// Try multiple possible paths for schema.sql
	const possible_paths = [
		path.join(__dirname, '../../docs/schema.sql'),
		path.join(process.cwd(), 'docs/schema.sql'),
		path.join(process.cwd(), 'src/../docs/schema.sql'),
	];

	let schema_path = '';
	for (const candidate_path of possible_paths) {
		if (fs.existsSync(candidate_path)) {
			schema_path = candidate_path;
			break;
		}
	}

	if (!schema_path) {
		throw new Error(
			`Schema file not found. Tried: ${possible_paths.join(', ')}`,
		);
	}

	const schema_sql = fs.readFileSync(schema_path, 'utf8');

	// Remove comments and split by semicolons properly
	const clean_sql = schema_sql
		.split('\n')
		.filter((line) => !line.trim().startsWith('--'))
		.join('\n');

	const statements = clean_sql
		.split(';')
		.map((stmt) => stmt.trim())
		.filter((stmt) => stmt.length > 0);

	db.transaction(() => {
		for (const statement of statements) {
			if (statement.trim()) {
				try {
					db.exec(statement);
				} catch (error) {
					console.error(
						`Failed to execute SQL statement: ${statement}`,
					);
					console.error(`Error: ${error}`);
					throw error;
				}
			}
		}
	})();
}

export function validate_table_exists(
	db: Database.Database,
	table_name: string,
): boolean {
	try {
		const check_query = db.prepare(`
			SELECT name FROM sqlite_master 
			WHERE type='table' AND name=?
		`);
		const result = check_query.get(table_name);
		return result !== undefined;
	} catch {
		return false;
	}
}
