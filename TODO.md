# Claude Code Statusline & CLI TODO

## Project Vision

Build a comprehensive toolkit for Claude Code integration with
real-time statusline displays and powerful CLI analytics, all built on
a solid, modular data processing foundation.

## Phase 1: Data Foundation (PRIORITY)

**Establish robust, modular data processing before any features**

### Phase 1a: Hook Integration Research ✓

- [x] **Hook System Analysis** - Understanding Claude Code hooks
  - [x] Hook types and event triggers (SessionStart/End,
        Pre/PostToolUse, UserPromptSubmit)
  - [x] Available environment variables (CLAUDE_PROJECT_DIR, session
        context)
  - [x] Hook input data via stdin (session_id, transcript_path, tool
        context)
  - [x] Command configuration in .claude/settings.json

### Phase 1b: SQLite Data Architecture ✓

- [x] **Database Schema Design** - Efficient storage for large
      datasets ✓
  - [x] Sessions table (statusline data aggregation) ✓
  - [x] Messages table (JSONL conversation data) ✓
  - [x] Tools table (tool usage analytics) ✓
  - [x] File positions table (incremental processing tracking) ✓

- [x] **Hook-Driven Data Collection** ✓
  - [x] CLI flags for different hook operations (--session-start,
        --tool-use, etc.) ✓
  - [x] Hook configuration templates for .claude/settings.json ✓
  - [x] Data collection workflows per hook type ✓
  - [x] SQLite database initialization and updates ✓

**STATUS UPDATE**: Database schema is complete and hook events are being collected (94 events recorded). However, JSONL transcript parsing is not yet implemented - this is the critical missing piece.

### Core Data Infrastructure

- [ ] **Data Models** - TypeScript interfaces for all data types
  - [ ] StatuslineData interface with proper typing
  - [ ] ConversationMessage types (user/assistant/tool)
  - [ ] SessionMetrics and Cost tracking types
  - [ ] HookContext and event-specific data types

- [ ] **Data Parsers** - Reliable, tested parsing modules **← NEXT PRIORITY**
  - [ ] **JSONL parser for conversation transcripts** ⚠️ CRITICAL - 0 messages in DB
  - [x] Hook stdin data parser (JSON context from Claude Code) ✓
  - [x] Projects directory scanner and parser ✓
  - [ ] Error handling for malformed/incomplete data

- [x] **Data Access Layer** - SQLite-based with hook integration ✓
  - [x] Database connection and migration management ✓
  - [ ] **Incremental JSONL file processing (position tracking)** ⚠️ CRITICAL - 0 processing_state records
  - [x] Hook-triggered data updates ✓
  - [x] Query interfaces for analytics and statusline ✓

### Configuration & Setup

- [ ] **Config Management** - Centralized configuration system
  - [ ] User preferences and settings
  - [ ] Data source paths and polling intervals
  - [ ] Feature toggles and customization options
  - [ ] Environment-specific configurations

- [ ] **CLI Foundation** - Extensible command structure
  - [ ] Base CLI framework with subcommands
  - [ ] Common flags and options parsing
  - [ ] Output formatting utilities (JSON, table, etc.)
  - [ ] Plugin/extension system architecture

### Testing & Quality

- [ ] **Test Data** - Comprehensive test fixtures
  - [ ] Mock statusline data samples
  - [ ] Sample conversation transcripts
  - [ ] Edge case data scenarios
  - [ ] Performance test datasets

- [ ] **Unit Tests** - Full test coverage for data layer
  - [ ] Parser validation tests
  - [ ] Data access layer tests
  - [ ] Utility function tests
  - [ ] Error handling verification

## Phase 2: Basic Features (After Foundation)

### Immediate Statusline Features

- [ ] **Real-time Metrics Display**
  - [ ] Cost tracking with formatting ($X.XX)
  - [ ] Duration display (human-readable)
  - [ ] Lines changed indicators (+X/-Y)
  - [ ] Model and version display

- [ ] **Activity Indicators**
  - [ ] Session status (active/idle)
  - [ ] Current working directory
  - [ ] Token usage warnings
  - [ ] Error state indicators

### Core CLI Analytics

- [ ] **Session Analysis Commands**
  - [ ] `status` - Current session overview
  - [ ] `summary` - Session cost and activity breakdown
  - [ ] `tools` - Tool usage statistics
  - [ ] `timeline` - Chronological activity view

- [ ] **Basic Reporting**
  - [ ] Daily/weekly cost summaries
  - [ ] Project activity reports
  - [ ] Simple productivity metrics
  - [ ] Export capabilities (JSON, CSV)

## Phase 3: Enhanced Features (Future)

### Smart Statusline Enhancements

- [ ] AI-generated topic summaries using SDK
- [ ] Project context awareness
- [ ] Git integration indicators
- [ ] Build/test status integration

### Advanced CLI Features

- [ ] Cross-project analytics and trends
- [ ] Conversation search and mining
- [ ] Productivity scoring and insights
- [ ] Historical project evolution analysis

### Automation & Intelligence

- [ ] Smart hook integrations
- [ ] AI-powered insights via SDK
- [ ] Predictive analytics
- [ ] Workflow optimization suggestions

## Architecture Principles

### Code Organization

- **Modular**: Clear separation between data, processing, and
  presentation
- **DRY**: Shared utilities and common patterns
- **Extensible**: Plugin architecture for easy feature additions
- **Testable**: Dependency injection and mockable interfaces

### Data Flow

```
Raw Data Sources → Parsers → Data Models → Processing Layer → Features
     ↓               ↓           ↓              ↓             ↓
Statusline JSON   Typed Data   Clean APIs   Analytics    UI/CLI
JSONL Files      Interfaces   Abstractions  Functions   Output
Project History
```

### Quality Standards

- TypeScript strict mode with full type coverage
- Comprehensive unit and integration tests
- Error handling with graceful degradation
- Performance monitoring and optimization
- Clear documentation and examples

---

**CURRENT STATUS**: Phase 1b SQLite architecture is 80% complete. Hook system is working (94 events collected), but JSONL transcript parsing is missing - this prevents messages, tool_calls, files, and file_operations tables from being populated.

**IMMEDIATE NEXT STEP**: Implement JSONL parser to populate missing database tables with conversation data.
