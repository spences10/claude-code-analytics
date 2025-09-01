import type Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import type { Migration } from './types/migration';

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
			initialize_schema_version(db);
			return true;
		}

		// Run migrations if needed
		run_pending_migrations(db);
		return false;
	} catch (error) {
		console.error('Failed to check database schema:', error);
		return false;
	}
}

function initialize_database_schema(db: Database.Database): void {
	// Load schema packaged alongside compiled code in dist/database/
	const schema_path = path.join(__dirname, 'schema.sql');

	if (!fs.existsSync(schema_path)) {
		throw new Error(
			`Schema file not found at ${schema_path}. Ensure build copies schema.sql to dist/database/`,
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

function initialize_schema_version(db: Database.Database): void {
	// Create schema_version table to track migrations
	db.exec(`
		CREATE TABLE IF NOT EXISTS schema_version (
			version INTEGER PRIMARY KEY,
			applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			description TEXT
		)
	`);

	// Set initial version to 0
	db.prepare(
		`
		INSERT OR IGNORE INTO schema_version (version, description)
		VALUES (0, 'Initial schema creation')
	`,
	).run();
}

function get_current_schema_version(db: Database.Database): number {
	try {
		// Ensure schema_version table exists
		if (!validate_table_exists(db, 'schema_version')) {
			initialize_schema_version(db);
			return 0;
		}

		const result = db
			.prepare(
				`
			SELECT MAX(version) as version FROM schema_version
		`,
			)
			.get() as any;

		return result?.version || 0;
	} catch {
		return 0;
	}
}

function run_pending_migrations(db: Database.Database): void {
	const current_version = get_current_schema_version(db);
	const available_migrations = get_available_migrations();

	const pending_migrations = available_migrations.filter(
		(migration) => migration.version > current_version,
	);

	if (pending_migrations.length === 0) {
		return;
	}

	console.log(
		`📦 Running ${pending_migrations.length} pending migration(s)...`,
	);

	// Sort by version to ensure correct order
	pending_migrations.sort((a, b) => a.version - b.version);

	for (const migration of pending_migrations) {
		console.log(
			`🔄 Applying migration ${migration.version}: ${migration.name}`,
		);

		try {
			db.transaction(() => {
				migration.up(db);

				// Record migration as applied
				db.prepare(
					`
					INSERT INTO schema_version (version, description)
					VALUES (?, ?)
				`,
				).run(migration.version, migration.description);
			})();

			console.log(
				`✅ Migration ${migration.version} completed successfully`,
			);
		} catch (error) {
			console.error(
				`❌ Migration ${migration.version} failed:`,
				error,
			);
			throw error;
		}
	}
}

function get_available_migrations(): Migration[] {
	// Import available migrations
	const migrations: Migration[] = [];

	try {
		// Import migration 001
		const {
			migration_001_add_summary_tables,
		} = require('./migrations/001_add_summary_tables');
		migrations.push(migration_001_add_summary_tables);
	} catch (error) {
		console.warn('Could not load migration 001:', error);
	}

	return migrations;
}
