# Projects Data Reference

Claude Code maintains historical conversation data per project in
`~/.claude/projects/`.

## Directory Structure

- **Project folders**: Named by encoded path
  (`-home-user-repos-project-name`)
- **Session files**: JSONL files named by session UUID
- **Historical data**: All conversations for each project

## Example Structure

```
~/.claude/projects/
├── -home-scott-repos-my-app/
│   ├── 5c1caff2-5729-4ee4-b141-c5c346ebda80.jsonl
│   ├── bb36a06b-d27c-44fe-b3d9-1cc6d650b5b7.jsonl
│   └── ce91a473-49c4-4ab8-8624-da75282f06bd.jsonl
└── -home-scott-repos-other-project/
    └── afd3a8eb-d02d-4b48-841a-18f91ace9518.jsonl
```

## File Format

Each JSONL file follows the same format as current conversation data:

- User/assistant messages with timestamps
- Tool usage records
- Threading via `parentUuid`
- Session metadata

## Key Use Cases

| Use Case               | Value                                  |
| ---------------------- | -------------------------------------- |
| **Project analytics**  | Cross-session cost/usage patterns      |
| **Work evolution**     | How projects develop over time         |
| **Tool effectiveness** | Which tools used most per project      |
| **Historical context** | Previous conversations in same project |

## Access Patterns

```bash
# List all projects
ls ~/.claude/projects/

# Get project conversations
ls ~/.claude/projects/-home-user-repos-project-name/

# Read conversation history
cat ~/.claude/projects/-home-user-repos-project-name/*.jsonl
```

## Data Volume

- **Persistent**: Never automatically cleaned
- **Accumulates**: One JSONL per session
- **Project-scoped**: Isolated by working directory

## See Also

- [Conversation Data](conversation-data.md) - JSONL format details
- [Statusline Data](statusline-data.md) - Real-time session info
