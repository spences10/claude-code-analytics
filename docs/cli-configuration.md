# CLI Configuration Reference

Interactive configuration setup using @clack/prompts for
claude-code-analytics.

## Quick Start

```bash
# Run interactive configuration setup
claude-code-analytics --config
```

## CLI Features

- **Interactive Setup**: Beautiful prompts powered by @clack/prompts
- **Configuration Management**: Set up display preferences
- **Multiple Modes**: Switch between statusline output and config mode

## Usage Modes

### Statusline Mode (Default)

```bash
# Used by Claude Code automatically
claude-code-analytics < data.json
```

Returns formatted statusline output for terminal display.

### Configuration Mode

```bash
# Interactive setup
claude-code-analytics --config
```

Launches interactive prompts for configuration management.

## Current Configuration Options

**Basic Setup**:

- Configuration naming
- Core data collection toggle
- Performance logging toggle
- Setup confirmation

## Future Configuration Areas

_These will be added as the project develops:_

- Display fields (cost, lines changed, model, etc.)
- Visual styling (colors, icons, separators)
- Data thresholds and warnings
- Output format preferences
- Multiple configuration presets

## Configuration Options Details

### Core Data Collection

**Purpose**: Control whether the package collects session and project
data for statusline display and analytics

**Options**:

- **Enabled** (default): Collect sessions, projects, and analytics
  data
- **Disabled**: Package is completely disabled

**Use Case**: This is the main feature toggle - disabling it turns off
the entire package functionality

### Performance Logging

**Purpose**: Control whether hook execution times are logged for
debugging and optimization

**Options**:

- **Disabled** (default): No performance logging
- **Enabled**: Log hook execution times to `hook_events` table

**Use Case**: Enable only when debugging performance issues or
optimizing hook execution

## Technical Details

- **Library**: @clack/prompts for interactive CLI
- **Entry Point Detection**: `--config` flag routes to CLI mode
- **Performance**: Fast statusline path remains separate for 300ms
  updates
- **Configuration Storage**: `~/.claude/claude-code-analytics.json`
  (global) or `.claude/claude-code-analytics.json` (project)

## See Also

- [Statusline Data](statusline-data.md) - Available data fields
- [Examples](examples/) - Sample configurations and usage
