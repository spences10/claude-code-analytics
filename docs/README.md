# Claude Code Integration Data Sources

This documentation maps all available data sources and integration
points within Claude Code, providing comprehensive reference for
building statusline tools, hooks, and SDK integrations.

## Quick Reference

### Data Sources

- **[Statusline Data](statusline-data.md)** - Real-time JSON data
  (300ms updates)
- **[Conversation Data](conversation-data.md)** - JSONL transcript
  format with full message history
- **[Hook System](hook-system.md)** - Event-driven automation and
  monitoring
- **[SDK Integration](sdk-integration.md)** - Programmatic Claude API
  access
- **[Projects Data](projects-data.md)** - Historical conversation data
  per project

### Implementation Guides

- **[CLI Configuration](cli-configuration.md)** - Interactive setup
  with @clack/prompts
- **[Data Architecture](data-architecture.md)** - Event-driven SQLite
  processing approach
- **[Database Schema](database-schema.md)** - SQLite schema optimized
  for hook collection and real-time queries
- **[Examples](examples/)** - Real data samples and working code

## Data Flow Overview

```
Claude Code Session
├── Real-time Status (300ms) → Statusline Scripts
├── Conversation Events → Hook System
├── Full Transcript → JSONL File
├── SDK Access → Programmatic Analysis
└── File System → Project Context
```

## Key Capabilities Discovered

### Real-time Session Monitoring

- Live cost tracking and duration metrics
- Model and workspace context
- Code change statistics (lines added/removed)
- Git branch and project directory tracking
- **Performance**: All hook events complete in ~0.1ms (zero impact)

### Complete Conversation History

- Every user message and assistant response
- Full tool usage with inputs/outputs
- Message threading and timestamps
- Working directory context per interaction
- **Incremental processing** with position tracking prevents
  reprocessing

### Event-Driven Automation

- Pre/post tool execution hooks
- User interaction monitoring
- Session lifecycle management
- Custom notification triggers
- **Background JSONL processing** doesn't block operations

### Rich Analysis Potential

- Conversation summarization via SDK
- Activity pattern analysis
- Productivity metrics and trends
- Context-aware project insights

## Getting Started

### Quick Start (Current Implementation)

1. **Setup**: Run `claude-code-statusline --config` for interactive
   configuration
2. **JSONL Processing**: Use `--process-transcripts` to parse all
   pending conversation data
3. **Manual Processing**: Use
   `--process-transcript <path> <session_id>` for specific files

### Development Reference

1. **For Statusline Development**: Start with
   [statusline-data.md](statusline-data.md)
2. **For Hook Automation**: Review [hook-system.md](hook-system.md)
3. **For Data Architecture**: See
   [data-architecture.md](data-architecture.md)
4. **For Database Schema**: Review
   [database-schema.md](database-schema.md)
5. **For Analysis Tools**: Check
   [sdk-integration.md](sdk-integration.md)
6. **For Project History**: Review
   [projects-data.md](projects-data.md)
7. **For Conversation Format**: See
   [conversation-data.md](conversation-data.md)

## Official Documentation Links

- [Claude Code Statusline](https://docs.anthropic.com/en/docs/claude-code/statusline)
- [Claude Code Hooks](https://docs.anthropic.com/en/docs/claude-code/hooks)
- [Claude Code SDK](https://docs.anthropic.com/en/docs/claude-code/sdk)
