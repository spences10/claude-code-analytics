# Database Schema Design

SQLite schema optimized for hook-driven data collection with minimal
overhead and maximum query performance for real-time statusline
updates.

## Core Design Principles

- **Hook-optimized**: Minimal `INSERT`/`UPDATE` overhead during
  collection
- **Query-optimized**: Indexed for instant statusline lookups
- **Size-aware**: Avoids storing full JSONL content, uses
  previews/references
- **Performance-first**: Constant-time queries regardless of session
  size

## Schema Overview

### Primary Tables

- `projects` - Workspace/directory tracking
- `sessions` - Individual conversation instances
- `messages` - Conversation turns (with content previews)
- `tool_calls` - Tool execution tracking
- `files` - File access patterns
- `file_operations` - Individual file changes
- `hook_events` - Lightweight performance metrics (not full event
  data)
- `schema_version` - Database migration tracking
- `processing_state` - JSONL processing tracking

### Key Performance Optimizations

**Real-time Statusline Queries:**

```sql
-- Current session cost (instant lookup)
SELECT total_cost_usd FROM sessions WHERE session_id = ?;

-- Active tools in session
SELECT tool_name, execution_time_ms FROM tool_calls
WHERE session_id = ? AND completed_at IS NULL;
```

**Analytics Queries:**

```sql
-- Project cost trends
SELECT DATE(started_at), SUM(total_cost_usd)
FROM sessions WHERE project_id = ?
GROUP BY DATE(started_at);

-- Most expensive tools
SELECT tool_name, AVG(execution_time_ms), COUNT(*)
FROM tool_calls GROUP BY tool_name;
```

## Data Collection Strategy

1. **Hooks write directly to SQLite** (no intermediate files)
2. **JSONL transcripts remain on disk** (referenced, not duplicated)
3. **Content previews** for searchability without full storage
4. **Incremental processing** tracks position in transcript files

## Performance Characteristics

- **Hook overhead**: ~0.1ms per event (single INSERT with minimal
  data)
- **Statusline queries**: <1ms (indexed lookups)
- **Analytics**: Scales with session count, not conversation length
- **Storage**: ~1KB per session vs. ~200KB+ JSONL files

## Database Maintenance

### Migration System

The database includes an automatic migration system to handle schema
updates:

- `schema_version` table tracks applied migrations
- Migrations run automatically on database connection
- Each migration is atomic and logged

### Storage Optimization

**Hook Events Data Policy** (as of Migration 001):

- Only stores essential performance metrics
- Event data limited to: `execution_time_ms`, `success`,
  `error_message`, `file_path`, `lines_changed`
- Full conversation context is stored in `messages` and `tool_calls`
  tables
- Previous redundant JSON blobs have been cleaned up

**Recommended Maintenance**:

```sql
-- Run VACUUM quarterly to reclaim space
VACUUM;

-- Check database size
SELECT page_count * page_size / 1024.0 / 1024.0 as size_mb FROM pragma_page_count(), pragma_page_size();
```
