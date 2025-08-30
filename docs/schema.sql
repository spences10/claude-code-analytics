-- Claude Code Statusline Database Schema
-- Optimized for hook-driven data collection and real-time queries
-- Minimal overhead collection, maximum query performance

-- Projects: Root entity for workspace tracking
CREATE TABLE projects (
    project_id INTEGER PRIMARY KEY,
    project_path TEXT UNIQUE NOT NULL,
    project_name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_active_at TIMESTAMP,
    total_sessions INTEGER DEFAULT 0,
    total_cost_usd DECIMAL(10,6) DEFAULT 0
);

-- Sessions: Individual Claude Code conversation instances
CREATE TABLE sessions (
    session_id TEXT PRIMARY KEY,
    project_id INTEGER NOT NULL,
    transcript_path TEXT NOT NULL,
    model_id TEXT,
    model_display_name TEXT,
    claude_version TEXT,
    started_at TIMESTAMP,
    ended_at TIMESTAMP,
    last_active_at TIMESTAMP,
    duration_ms INTEGER,
    total_cost_usd DECIMAL(10,6),
    total_api_duration_ms INTEGER,
    total_lines_added INTEGER DEFAULT 0,
    total_lines_removed INTEGER DEFAULT 0,
    exceeds_200k_tokens BOOLEAN DEFAULT FALSE,
    session_source TEXT,
    end_reason TEXT,
    FOREIGN KEY (project_id) REFERENCES projects(project_id)
);

-- Messages: Conversation turns from JSONL transcripts
CREATE TABLE messages (
    message_id INTEGER PRIMARY KEY,
    session_id TEXT NOT NULL,
    message_index INTEGER NOT NULL,
    role TEXT NOT NULL, -- user, assistant, system
    content_preview TEXT, -- First 500 chars for search
    timestamp TIMESTAMP,
    token_count_input INTEGER,
    token_count_output INTEGER,
    cost_usd DECIMAL(10,6),
    has_tool_calls BOOLEAN DEFAULT FALSE,
    cache_creation_input_tokens INTEGER, -- Tokens added to cache
    cache_read_input_tokens INTEGER, -- Tokens read from cache (savings!)
    cache_5m_tokens INTEGER, -- 5-minute ephemeral cache tokens
    cache_1h_tokens INTEGER, -- 1-hour ephemeral cache tokens
    FOREIGN KEY (session_id) REFERENCES sessions(session_id),
    UNIQUE(session_id, message_index)
);

-- Tool Calls: Individual tool executions from hooks and transcripts
CREATE TABLE tool_calls (
    tool_call_id INTEGER PRIMARY KEY,
    session_id TEXT NOT NULL,
    message_id INTEGER,
    tool_name TEXT NOT NULL,
    tool_use_id TEXT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    execution_time_ms INTEGER,
    success BOOLEAN,
    error_message TEXT,
    FOREIGN KEY (session_id) REFERENCES sessions(session_id),
    FOREIGN KEY (message_id) REFERENCES messages(message_id)
);

-- Files: Track file access patterns across sessions
CREATE TABLE files (
    file_id INTEGER PRIMARY KEY,
    file_path TEXT UNIQUE NOT NULL,
    project_id INTEGER NOT NULL,
    first_accessed_at TIMESTAMP,
    last_accessed_at TIMESTAMP,
    total_read_operations INTEGER DEFAULT 0,
    total_write_operations INTEGER DEFAULT 0,
    total_lines_changed INTEGER DEFAULT 0,
    FOREIGN KEY (project_id) REFERENCES projects(project_id)
);

-- File Operations: Individual file access events from tool calls
CREATE TABLE file_operations (
    operation_id INTEGER PRIMARY KEY,
    file_id INTEGER NOT NULL,
    session_id TEXT NOT NULL,
    tool_call_id INTEGER,
    operation_type TEXT NOT NULL, -- read, write, edit
    lines_changed INTEGER DEFAULT 0,
    timestamp TIMESTAMP,
    FOREIGN KEY (file_id) REFERENCES files(file_id),
    FOREIGN KEY (session_id) REFERENCES sessions(session_id),
    FOREIGN KEY (tool_call_id) REFERENCES tool_calls(tool_call_id)
);

-- Hook Events: Lightweight performance metrics from hooks
-- No foreign key constraint - hooks can fire before sessions exist
-- Note: event_data now contains only essential performance metrics, not full conversation context
CREATE TABLE hook_events (
    event_id INTEGER PRIMARY KEY,
    session_id TEXT NOT NULL,
    event_type TEXT NOT NULL, -- session_start, session_end, pre_tool_use, post_tool_use, user_prompt_submit
    timestamp TIMESTAMP,
    execution_time_ms INTEGER DEFAULT 0,
    tool_name TEXT,
    event_data TEXT -- JSON containing: execution_time_ms, success, error_message, file_path, lines_changed
);

-- Processing State: Track incremental JSONL processing positions
CREATE TABLE processing_state (
    transcript_path TEXT PRIMARY KEY,
    last_processed_position INTEGER DEFAULT 0,
    last_processed_at TIMESTAMP,
    status TEXT DEFAULT 'pending' -- pending, processing, completed, error
);


-- Schema Version: Track database migrations
CREATE TABLE schema_version (
    version INTEGER PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description TEXT
);

-- Performance indexes for real-time queries
CREATE INDEX idx_sessions_project_active ON sessions(project_id, last_active_at DESC);
CREATE INDEX idx_sessions_cost ON sessions(total_cost_usd DESC);
CREATE INDEX idx_messages_session ON messages(session_id, message_index);
CREATE INDEX idx_messages_cache_efficiency ON messages(cache_read_input_tokens, cache_creation_input_tokens);
CREATE INDEX idx_tool_calls_session_time ON tool_calls(session_id, started_at);
CREATE INDEX idx_files_project_active ON files(project_id, last_accessed_at DESC);
CREATE INDEX idx_hook_events_session_type ON hook_events(session_id, event_type);
CREATE INDEX idx_hook_events_timestamp ON hook_events(timestamp DESC);