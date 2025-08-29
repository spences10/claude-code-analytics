import path from 'node:path';
import { with_database } from '../connection';

export function record_file_operation(
	session_id: string,
	file_path: string,
	operation_type: 'read' | 'write' | 'edit',
	lines_changed: number = 0,
	tool_call_id?: number,
): void {
	if (!session_id || !file_path) return;

	with_database((db) => {
		// Get or create project first
		const project_path = process.cwd(); // Use current working directory
		const project_name = path.basename(project_path);

		// Ensure project exists
		db.prepare(
			`
			INSERT OR IGNORE INTO projects (project_path, project_name)
			VALUES (?, ?)
		`,
		).run(project_path, project_name);

		const project = db
			.prepare(
				'SELECT project_id FROM projects WHERE project_path = ?',
			)
			.get(project_path) as { project_id: number };

		// Get or create file record
		db.prepare(
			`
			INSERT OR IGNORE INTO files (file_path, project_id, first_accessed_at)
			VALUES (?, ?, ?)
		`,
		).run(file_path, project.project_id, new Date().toISOString());

		const file = db
			.prepare('SELECT file_id FROM files WHERE file_path = ?')
			.get(file_path) as { file_id: number };

		// Record the operation
		db.prepare(
			`
			INSERT INTO file_operations (file_id, session_id, tool_call_id, operation_type, lines_changed, timestamp)
			VALUES (?, ?, ?, ?, ?, ?)
		`,
		).run(
			file.file_id,
			session_id,
			tool_call_id || null,
			operation_type,
			lines_changed,
			new Date().toISOString(),
		);

		// Update file statistics - map 'edit' to 'write' for database column
		const db_operation_type =
			operation_type === 'edit' ? 'write' : operation_type;
		const update_field = `total_${db_operation_type}_operations`;
		db.prepare(
			`
			UPDATE files 
			SET last_accessed_at = ?,
				${update_field} = ${update_field} + 1,
				total_lines_changed = total_lines_changed + ?
			WHERE file_id = ?
		`,
		).run(
			new Date().toISOString(),
			Math.abs(lines_changed),
			file.file_id,
		);
	}, 'record file operation');
}
