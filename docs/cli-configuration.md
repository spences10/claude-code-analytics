# CLI Configuration Reference

Interactive configuration setup using @clack/prompts for
claude-code-statusline.

## Quick Start

```bash
# Run interactive configuration setup
claude-code-statusline --config
```

## CLI Features

- **Interactive Setup**: Beautiful prompts powered by @clack/prompts
- **Configuration Management**: Set up display preferences
- **Multiple Modes**: Switch between statusline output and config mode

## Usage Modes

### Statusline Mode (Default)

```bash
# Used by Claude Code automatically
claude-code-statusline < data.json
```

Returns formatted statusline output for terminal display.

### Configuration Mode

```bash
# Interactive setup
claude-code-statusline --config
```

Launches interactive prompts for configuration management.

## Current Configuration Options

**Basic Setup** (more options coming as project develops):

- Configuration naming
- Setup confirmation

## Future Configuration Areas

_These will be added as the project develops:_

- Display fields (cost, lines changed, model, etc.)
- Visual styling (colors, icons, separators)
- Data thresholds and warnings
- Output format preferences
- Multiple configuration presets

## Technical Details

- **Library**: @clack/prompts for interactive CLI
- **Entry Point Detection**: `--config` flag routes to CLI mode
- **Performance**: Fast statusline path remains separate for 300ms
  updates
- **Configuration Storage**: Planned for `~/.claude/` and `./.claude/`
  hierarchy

## See Also

- [Statusline Data](statusline-data.md) - Available data fields
- [Examples](examples/) - Sample configurations and usage
