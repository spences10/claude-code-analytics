import type Database from 'better-sqlite3';

export interface Migration {
	version: number;
	name: string;
	description: string;
	up: (db: Database.Database) => void;
	down: (db: Database.Database) => void;
}
