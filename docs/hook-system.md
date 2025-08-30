# Hook System Reference

Claude Code's hook system executes custom scripts in response to
events during Claude Code operation.

## Hook Types

### Tool Events

- **`PreToolUse`** - Before tool execution
- **`PostToolUse`** - After tool completion

### Session Events

- **`SessionStart`** - Session begins
- **`SessionEnd`** - Session ends (mapped to `Stop` event)
- **`UserPromptSubmit`** - User submits prompt

### Additional Hook Events (Not Yet Implemented)

- **`Notification`** - Tool permissions/idle periods
- **`SubagentStop`** - When subagents complete
- **`PreCompact`** - Before context compaction (critical for cache
  analysis)

## Configuration Structure

Configure in `.claude/settings.json`:

```json
{
	"hooks": {
		"EventName": [
			{
				"matcher": "ToolPattern",
				"hooks": [
					{
						"type": "command",
						"command": "script-to-execute",
						"timeout": 5000
					}
				]
			}
		]
	}
}
```

## Configuration Fields

| Field     | Purpose                          |
| --------- | -------------------------------- |
| `matcher` | Tool/event pattern (optional)    |
| `command` | Shell command to execute         |
| `timeout` | Max execution time (ms)          |
| `block`   | Block Claude Code until complete |

## Environment Variables

- **`$CLAUDE_PROJECT_DIR`** - Project directory path
- Standard shell environment variables

## Basic Example

```json
{
	"hooks": {
		"SessionStart": [
			{
				"hooks": [
					{
						"type": "command",
						"command": "echo \"Session started\" >> session.log"
					}
				]
			}
		]
	}
}
```

## Tool-Specific Hook

```json
{
	"hooks": {
		"PostToolUse": [
			{
				"matcher": "Edit",
				"hooks": [
					{
						"type": "command",
						"command": "git add -A && git status"
					}
				]
			}
		]
	}
}
```

## Security Notes

⚠️ **Hooks execute shell commands automatically**

- Validate inputs and quote variables
- Use absolute paths
- Set timeouts
- Test in safe environments

## Official Documentation

For the most up-to-date information, fetch the official Claude Code
hooks documentation:

```bash
# Fetch latest hooks documentation
curl -s https://docs.anthropic.com/en/docs/claude-code/hooks
```

**Official Link:**
https://docs.anthropic.com/en/docs/claude-code/hooks

## See Also

- [Hook Examples](examples/hook-configs.json) - More configurations
- [Hook Patterns](patterns/hook-patterns.md) - Advanced usage
