# Statusline Data Reference

Claude Code provides real-time JSON data to statusline scripts every
300ms.

## Data Structure

```typescript
interface ClaudeCodeData {
	session_id: string;
	transcript_path: string;
	cwd: string;
	model: { id: string; display_name: string };
	workspace: { current_dir: string; project_dir: string };
	version: string;
	cost: {
		total_cost_usd: number;
		total_duration_ms: number;
		total_lines_added: number;
		total_lines_removed: number;
	};
	exceeds_200k_tokens: boolean;
}
```

## Key Fields

| Field                      | Purpose                         |
| -------------------------- | ------------------------------- |
| `session_id`               | Unique session identifier       |
| `transcript_path`          | Path to JSONL conversation file |
| `model.display_name`       | Human-readable model name       |
| `cost.total_cost_usd`      | Session cost in USD             |
| `cost.total_lines_added`   | Lines of code added             |
| `cost.total_lines_removed` | Lines of code removed           |

## Real Example

```json
{
	"session_id": "5c1caff2-5729-4ee4-b141-c5c346ebda80",
	"model": { "display_name": "Sonnet 4" },
	"cost": {
		"total_cost_usd": 1.13177315,
		"total_lines_added": 72,
		"total_lines_removed": 13
	}
}
```

## Update Frequency

- **300ms intervals** while Claude Code is active
- Real-time cost and line change updates

## Official Documentation

For the most up-to-date information, fetch the official Claude Code
statusline documentation:

```bash
# Fetch latest statusline documentation
curl -s https://docs.anthropic.com/en/docs/claude-code/statusline
```

**Official Link:**
https://docs.anthropic.com/en/docs/claude-code/statusline

## See Also

- [Examples](examples/statusline-examples.json) - More data samples
- [Usage Patterns](patterns/statusline-patterns.md) - Implementation
  examples
