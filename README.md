# Claude Code Analytics

This is Claude Code Analytics! It uses ClaudeCode statusline and
Claude Code hooks to store information about your Claude Code sessions
in a local SQLite database.

There's a CLI for some reports, Cost Analytics...

```ascii
◇  How many days to analyze?
│  7

Cost Trend (Last 7 Days)

   $21.47    ┤                           ╭────────────────╮
   $19.55    ┤                         ╭─╯                ╰──╮
   $17.63    ┤                       ╭─╯                     ╰──╮
   $15.71    ┤                     ╭─╯                          ╰──╮
   $13.78    ┤                  ╭──╯                               ╰───╮
   $11.86    ┤                ╭─╯                                      ╰─
    $9.94    ┤             ╭──╯
    $8.02    ┤   ╭─────────╯
    $6.10    ┼───╯

Total Cost        │$68.11
Total Sessions    │87
Avg Cost/Session  │$0.78
Daily Average     │$9.73
```

Activity patterns...

```ascii
◇  How many days to analyze?
│  7

Activity Heatmap (Last 7 Days)

Total: 88 sessions across 5 days
Peak: 13 sessions on 2025-08-27 at 20:00

    00 01 02 03 04 05 06 07 08 09 10 11 12 13 14 15 16 17 18 19 20 21 22 23
Sun ░░ ░░ ░░ ░░ ░░ ░░ ░░ ░░ ░░ ░░ ░░ ░░ ░░ ░░ ░░ ░░ ░░ ░░ ░░ ░░ ░░ ░░ ░░ ░░
Mon ░░ ░░ ░░ ░░ ░░ ░░ ░░ ░░ ░░ ░░ ░░ ░░ ░░ ░░ ░░ ░░ ░░ ░░ ░░ ░░ ░░ ░░ ░░ ░░
Tue ░░ ░░ ░░ ░░ ░░ ░░ ░░ ░░ ▓▓ ▓▓ ▓▓ ░░ ░░ ░░ ░░ ░░ ▓▓ ░░ ░░ ▓▓ ░░ ░░ ░░ ░░
Wed ░░ ░░ ░░ ░░ ░░ ░░ ░░ ▓▓ ░░ ░░ ░░ ░░ ░░ ░░ ░░ ░░ ░░ ░░ ▓▓ ░░ ██ ▓▓ ░░ ░░
Thu ░░ ░░ ░░ ░░ ░░ ░░ ░░ ░░ ▓▓ ██ ░░ ░░ ░░ ░░ ░░ ░░ ▓▓ ▓▓ ▓▓ ▓▓ ░░ ░░ ░░ ░░
Fri ░░ ░░ ░░ ░░ ░░ ▓▓ ▓▓ ▓▓ ▓▓ ░░ ░░ ▓▓ ░░ ░░ ░░ ░░ ▓▓ ░░ ░░ ░░ ░░ ░░ ░░ ░░
Sat ░░ ░░ ░░ ░░ ░░ ░░ ░░ ░░ ░░ ▓▓ ░░ ░░ ░░ ░░ ░░ ░░ ░░ ▓▓ ░░ ▓▓ ▓▓ ▓▓ ░░ ░░

██ High (9+)  ▓▓ Medium (5-9)  ░░ Low (0-5)

Top Activity Hours:
  1. Wed 20:00 (2025-08-27): 13 sessions
  2. Thu 09:00 (2025-08-28): 9 sessions
  3. Tue 10:00 (2025-08-26): 8 sessions
  4. Thu 18:00 (2025-08-28): 7 sessions
  5. Thu 16:00 (2025-08-28): 6 sessions
```

## Installation

Install globally with your preferred package manager:

```bash
# npm
npm install -g claude-code-analytics

# pnpm
pnpm add -g claude-code-analytics

# bun
bun add -g claude-code-analytics

# volta
volta install claude-code-analytics
```

## Setup

After installing, you need to hook it into Claude Code:

```bash
claude-code-analytics --config
```

This will walk you through setting up the statusline and hooks in your
`~/.claude/settings.json`.

## Usage

Once configured, just use Claude Code normally. The tool runs in the
background collecting data.

To view your analytics:

```bash
claude-code-analytics --config
```

Pick what you want to see - cost trends, activity patterns, tool
usage, productivity metrics, etc.

Your data lives in `~/.claude/claude-code-analytics.db` and never
leaves your machine.
