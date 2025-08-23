# Conversation Data Reference

Claude Code maintains complete conversation history in JSONL format at
the path specified in statusline data's `transcript_path`.

## File Format

- **JSONL** (JSON Lines) - One JSON object per line
- **Chronological** - Messages flow from top to bottom
- **Threaded** - Messages linked via `parentUuid` references

## Message Types

### User Message

```json
{
	"type": "user",
	"message": { "role": "user", "content": "your message here" },
	"uuid": "message-uuid",
	"parentUuid": "parent-uuid-or-null",
	"timestamp": "2025-08-23T19:08:48.926Z"
}
```

### Assistant Response

```json
{
	"type": "assistant",
	"message": {
		"role": "assistant",
		"model": "claude-sonnet-4-20250514",
		"content": [{ "type": "text", "text": "assistant response" }]
	},
	"uuid": "response-uuid",
	"parentUuid": "user-message-uuid"
}
```

### Tool Usage

```json
{
	"type": "assistant",
	"message": {
		"content": [
			{
				"type": "tool_use",
				"name": "Read",
				"input": { "file_path": "/path/to/file" }
			}
		]
	}
}
```

## Key Fields

| Field        | Purpose                        |
| ------------ | ------------------------------ |
| `uuid`       | Unique message identifier      |
| `parentUuid` | Parent message (threading)     |
| `type`       | "user" or "assistant"          |
| `timestamp`  | ISO 8601 timestamp             |
| `sessionId`  | Links to statusline session_id |

## Reading JSONL Files

```typescript
import readline from 'readline';

const fileStream = fs.createReadStream(transcriptPath);
const rl = readline.createInterface({ input: fileStream });

for await (const line of rl) {
	const entry = JSON.parse(line);
	// Process each message
}
```

## See Also

- [Examples](examples/conversation-samples.jsonl) - Full message
  samples
- [Analysis Patterns](patterns/conversation-analysis.md) - Processing
  examples
