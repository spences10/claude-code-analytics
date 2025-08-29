import { with_database } from '../connection';

export interface ProcessingPosition {
	transcript_path: string;
	last_processed_position: number;
	last_processed_at: string;
	status: 'pending' | 'processing' | 'completed' | 'error';
}

export function get_processing_position(
	transcript_path: string,
): ProcessingPosition | undefined {
	return with_database((db) => {
		const stmt = db.prepare(
			'SELECT * FROM processing_state WHERE transcript_path = ?',
		);

		const result = stmt.get(transcript_path);

		if (result) {
			return result as ProcessingPosition;
		}

		// Create new processing record
		const insert_stmt = db.prepare(`
			INSERT INTO processing_state (transcript_path, last_processed_position, last_processed_at, status)
			VALUES (?, 0, ?, 'pending')
		`);

		insert_stmt.run(transcript_path, new Date().toISOString());

		return {
			transcript_path,
			last_processed_position: 0,
			last_processed_at: new Date().toISOString(),
			status: 'pending',
		};
	}, 'get processing position');
}

export function update_processing_position(
	transcript_path: string,
	position: number,
): void {
	with_database((db) => {
		const stmt = db.prepare(`
			UPDATE processing_state 
			SET last_processed_position = ?, last_processed_at = ?
			WHERE transcript_path = ?
		`);

		stmt.run(position, new Date().toISOString(), transcript_path);
	}, 'update processing position');
}

export function update_processing_status(
	transcript_path: string,
	status: ProcessingPosition['status'],
): void {
	with_database((db) => {
		const stmt = db.prepare(`
			UPDATE processing_state 
			SET status = ?, last_processed_at = ?
			WHERE transcript_path = ?
		`);

		stmt.run(status, new Date().toISOString(), transcript_path);
	}, 'update processing status');
}

export function get_pending_transcripts(): Array<{
	transcript_path: string;
	session_id: string;
}> {
	return (
		with_database((db) => {
			const stmt = db.prepare(`
				SELECT ps.transcript_path, s.session_id
				FROM processing_state ps
				LEFT JOIN sessions s ON s.transcript_path = ps.transcript_path
				WHERE ps.status IN ('pending', 'error') AND s.session_id IS NOT NULL
			`);

			return stmt.all() as Array<{
				transcript_path: string;
				session_id: string;
			}>;
		}, 'get pending transcripts') || []
	);
}
