# SDK Integration Reference

The Claude Code SDK enables programmatic access to Claude's API for
conversation analysis and intelligent automation.

## SDK Capabilities

- **Command-line interface** - Available as `claude` command
- **Programmatic API** - TypeScript and Python libraries
- **Multi-turn conversations** - Context-aware interactions
- **Custom system prompts** - Specialized behavior
- **Multiple output formats** - JSON and text responses

## CLI Usage

### Basic Analysis

```bash
# Conversation summary with fast model
claude --model haiku -p "Summarize this conversation in 10 words"

# Analyze transcript file
claude --model sonnet -p "What were the key decisions?" < transcript.jsonl

# Generate status summary
claude --model haiku -p "Create brief status from this data" < session-data.json
```

### Statusline Integration

```bash
# Get conversation topic for statusline
TOPIC=$(claude --model haiku -p "3-word topic summary" < transcript.jsonl)
echo "🤖 Sonnet 4 | 💰 $1.23 | 📊 +45/-12 | 💬 $TOPIC"
```

## Programmatic Usage

### TypeScript

```typescript
import { Claude } from 'claude-sdk';

const claude = new Claude();

async function getConversationSummary(transcript: string) {
	const response = await claude.messages.create({
		model: 'claude-3-haiku-20240307',
		max_tokens: 50,
		messages: [
			{
				role: 'user',
				content: `Brief summary: ${transcript}`,
			},
		],
	});

	return response.content.trim();
}
```

### Python

```python
import anthropic

client = anthropic.Anthropic()

def analyze_session(session_data):
    response = client.messages.create(
        model="claude-3-haiku-20240307",
        max_tokens=100,
        messages=[{
            "role": "user",
            "content": f"Analyze: {session_data}"
        }]
    )
    return response.content
```

## Model Selection

| Model  | Use Case             | Speed  | Cost   |
| ------ | -------------------- | ------ | ------ |
| Haiku  | Real-time statusline | Fast   | Low    |
| Sonnet | General analysis     | Medium | Medium |
| Opus   | Deep insights        | Slow   | High   |

## Hook Integration

Call SDK from hooks:

```bash
#!/bin/bash
# session-end-hook.sh
SUMMARY=$(claude --model haiku -p "Session summary" < "$TRANSCRIPT_PATH")
echo "Summary: $SUMMARY" >> reports.log
```

## Performance Tips

- **Cache results** - Avoid duplicate API calls
- **Rate limiting** - Respect API limits
- **Batch requests** - Process multiple items together
- **Choose appropriate models** - Balance speed vs quality

## Official Documentation

For the most up-to-date information, fetch the official Claude Code
SDK documentation:

```bash
# Fetch latest SDK documentation
curl -s https://docs.anthropic.com/en/docs/claude-code/sdk
```

**Official Link:** https://docs.anthropic.com/en/docs/claude-code/sdk

## See Also

- [SDK Examples](examples/sdk-usage.js) - Code samples
- [SDK Patterns](patterns/sdk-patterns.md) - Advanced usage
