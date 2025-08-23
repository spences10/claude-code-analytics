# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `pnpm build` - Build the statusline CLI tool to dist/
- `pnpm dev` - Build with watch mode for development
- `pnpm start` - Run the built statusline tool directly
- `node dist/statusline.js` - Execute the CLI with test JSON

## Project Architecture

This is a TypeScript CLI tool that integrates with Claude Code's statusline feature. The architecture consists of:

### Core Components

- **src/statusline.ts** - Main CLI entry point that parses JSON data from Claude Code and formats statusline output
- **dist/statusline.js** - Built executable with shebang for direct CLI usage
- **logs/claude-code-data.log** - Debug logging for analyzing Claude Code integration data

### Data Flow

1. Claude Code invokes the built script with JSON data as an argument
2. Script parses ClaudeCodeData interface containing model, git, cost, and line change metrics  
3. Formats output with emojis and separators (🌿 branch | 🤖 model | 💰 cost | 📊 +lines/-lines)
4. Logs all input data to logs/ for debugging and development

### Build System

- Uses tsup for bundling with CommonJS output targeting Node 18+
- Adds shebang banner for direct CLI execution
- TypeScript strict mode with ES2022 target
- Source maps and declarations generated for debugging

### Claude Code Integration

The tool implements the statusline script requirements:
- Accepts JSON data from Claude Code containing session metrics
- Returns formatted string for bottom status bar display  
- Updates every 300ms when active
- Supports ANSI colors and emojis for visual formatting
- Falls back to default "⚡ Claude Code" on errors

See CLAUDE_CODE_INTEGRATION.md for detailed Claude Code statusline documentation and integration patterns.