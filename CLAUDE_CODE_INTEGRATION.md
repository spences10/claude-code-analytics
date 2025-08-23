# Claude Code Integration Reference

## Reference Links

- [Claude Code Statusline Documentation](https://docs.anthropic.com/en/docs/claude-code/statusline)
- [Claude Code Hooks Documentation](https://docs.anthropic.com/en/docs/claude-code/hooks)
- [Claude Code SDK Documentation](https://docs.anthropic.com/en/docs/claude-code/sdk)

## Statusline

The statusline is a customizable bottom interface element that displays contextual information about the current coding session.

### Configuration

1. **Interactive setup**: Run `/statusline` command
2. **Manual config**: Add `statusLine` configuration in `.claude/settings.json`

### Available Data

Claude Code provides JSON data to statusline scripts containing:
- Model name and details
- Current working directory
- Project directory  
- Session version
- Cost metrics
- Lines of code added/removed
- Git branch information

### Script Requirements

- Updates every 300ms
- First line of script output becomes status text
- Supports ANSI color codes
- Should be concise and informative
- Script must be executable

### Best Practices

- Keep status line brief
- Use emojis and colors for readability
- Test scripts manually with mock JSON input
- Ensure script is executable

## Hooks

Hooks are configurable scripts triggered at various points during Claude Code operation.

### Hook Types

- **PreToolUse**: Runs before a tool is used
- **PostToolUse**: Runs after a tool completes  
- **UserPromptSubmit**: Runs when a user submits a prompt
- **Notification**: Runs for system notifications
- **Stop/SubagentStop**: Runs when processing stops
- **SessionStart/SessionEnd**: Runs at session beginning/end

### Configuration

- Defined in JSON settings files
- Can use matchers to target specific tools or events
- Support command execution with optional timeouts
- Can block or modify tool usage
- Use environment variable `$CLAUDE_PROJECT_DIR` for project-relative paths

### Capabilities

- Validate inputs
- Add context
- Control tool permissions  
- Perform logging/monitoring
- Execute custom scripts

### Security Considerations

- Hooks execute shell commands automatically
- Users responsible for ensuring safe configurations
- Validate and sanitize inputs
- Use absolute paths and careful command design

## SDK

The Claude Code SDK is a development toolkit for building AI agents.

### Key Features

- Available in TypeScript and Python
- Command-line and programmatic interfaces
- Tools for file operations, code execution, web search
- Fine-grained permissions and error handling

### Core Capabilities

- Multi-turn conversations
- Custom system prompts
- JSON and text output formats
- MCP (Model Context Protocol) for custom tool integration
- Streaming response support

### Authentication Options

- Anthropic API key
- Third-party provider credentials (Amazon Bedrock, Google Vertex AI)

### Agent Types

1. **Coding Agents**: SRE incident response, security code review, engineering assistants
2. **Business Agents**: Legal document review, financial analysis, customer support

## Integration Points

For statusline CLI development:
1. Parse JSON data from Claude Code
2. Extract relevant information (git, project metrics, etc.)
3. Format output with ANSI colors/emojis
4. Build to single executable script
5. Configure in Claude Code settings