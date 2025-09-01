# Claude Code Analytics

This is Claude Code Analytics! It uses ClaudeCode statusline and
Claude Code hooks to store information about your Claude Code sessions
in a local SQLite database.

## Hook-Driven Architecture

**Why use hooks instead of just reading statusline data?**

The statusline updates every 300ms, so we _could_ do all analytics
calculations in real-time. But this marvellous monstrosity explores a
different approach:

- **Hooks do heavy lifting** during natural Claude Code pauses
  (PostToolUse, UserPromptSubmit)
- **Statusline stays responsive** with sub-millisecond lookups of
  pre-computed data
- **True zero-impact analytics** - expensive queries happen when
  Claude Code is already waiting
- **Separation of concerns** - data processing vs. display logic

The result? A statusline that can show complex productivity insights,
cache efficiency metrics, and sparkline visualizations without ever
slowing down your workflow.

_Sometimes the best solution is the most over-engineered one!_ 😂

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

## First Run (Onboarding)

After installing, run:

```bash
claude-code-analytics
```

You’ll be prompted to:

- Confirm local storage: creates `~/.claude/claude-code-analytics.db`
  (SQLite) and never sends data over the network.
- Choose components: install the statusline and/or lightweight hooks
  into `~/.claude/settings.json`.
- Enable data collection: can be changed later in
  `~/.claude/claude-code-analytics.json`.

Onboarding only appears the first time you run the CLI interactively.
Claude Code invoking the binary will never show prompts.

Tip: To confirm the CLI is available on your PATH, try:

```bash
claude-code-analytics -h
```

This should print the help text.

## Commands

- `claude-code-analytics config`: Interactive configuration
  (statusline, hooks, settings).
- `claude-code-analytics analytics`: Interactive analytics dashboard
  (tables and ASCII charts).
- `claude-code-analytics quick-stats`: One-shot 7‑day summary.
- `claude-code-analytics install | uninstall`: Install/remove
  statusline and hooks without prompts.
- `claude-code-analytics --help | --version`: Show help/version.

Advanced (optional):

- `claude-code-analytics transcripts process-all`
- `claude-code-analytics transcripts process-one <transcript.jsonl> <session_id>`

## Usage

- Use Claude Code normally. The statusline and hooks record session
  metadata locally for analytics.
- View analytics anytime with `claude-code-analytics analytics` or a
  quick summary with `claude-code-analytics quick-stats`.

## Data & Privacy

- Database: `~/.claude/claude-code-analytics.db` (SQLite, local-only).
- Config: `~/.claude/claude-code-analytics.json`.
- Claude integration: `~/.claude/settings.json` (non-destructive; only
  our entries).
- No telemetry or network calls.

To disable collection, set `data_collection: false` in
`~/.claude/claude-code-analytics.json`.

### Per‑Project Configuration

You can override settings per project with a local config file at:

- `<project>/.claude/claude-code-analytics.json`

Example (this repo):
`claude-code-analytics/.claude/claude-code-analytics.json`

Project config deep‑merges over the global config. Useful for:

- Disabling collection in a specific repo
- Customizing the statusline layout per project

Example:

```json
{
	"data_collection": true,
	"display": {
		"layout": [
			["git", "model"],
			["cost", "duration", "lines_changed"]
		]
	}
}
```

## Theming & Display

You can customize the statusline’s look globally or per‑project.

- Config files:
  - Global: `~/.claude/claude-code-analytics.json`
  - Project: `<project>/.claude/claude-code-analytics.json` (overrides
    global)

Display keys

- `display.theme`: `minimal` (default), `ascii`, or `emoji`
- `display.icons`: enable/disable icons globally (default: true)
- `display.powerline`: boolean (auto‑detect when omitted)
- `display.icon_overrides`: map of symbol name → string
- `display.layout`: string[][] to control segment order and lines

Examples

Minimal (default) with Powerline forced:

```json
{
	"display": {
		"theme": "minimal",
		"powerline": true
	}
}
```

Pure ASCII:

```json
{
	"display": {
		"theme": "ascii",
		"icons": true
	}
}
```

Emoji (opt‑in) with simple overrides:

```json
{
	"display": {
		"theme": "emoji",
		"icon_overrides": {
			"branch": " ",
			"ahead": "↑",
			"behind": "↓"
		}
	}
}
```

Notes

- No environment variables are used for theming. Configure via JSON
  only.
- Project config deep‑merges over global config.

## Terminal Visuals

The CLI uses color and layout for readability without relying on heavy
emoji.

- `chalk` for subtle, meaningful color (headings, axes, legends)
- `cli-table3` for clean, aligned tables
- `asciichart` for compact line charts with scaled y‑axis labels
- Powerline glyphs when the terminal supports them (auto‑detected)

Upcoming improvements

- Color cues for session rank, cache efficiency, and tool success
- Theme presets that bundle layout + color choices (e.g., Minimal,
  Dense)
- Optional ASCII‑only mode across all views for maximal portability

## Statusline Segments

Add segments to `display.layout` (each inner array is a row).
Available segments:

- Core: `git`, `model`, `cost`, `duration`, `lines_changed`,
  `tool_performance`, `cache_efficiency`, `working_directory`
- Gauges: `tool_gauge` (tool success %), `cache_gauge` (cache
  efficiency %), `context_gauge` (context tokens vs limit)
- Bars: `lines_bar` (added vs removed)
- Sparklines: `cost_sparkline` (recent session costs),
  `cache_reads_sparkline` (cache read tokens per session)
- Activity: `activity_strip` (last 24h hourly activity), `streak_bar`
  (last 7 days usage)
- Mix: `model_mix` (top 3 models compact bands)
- Ambient: `ambient_wave`, `ambient_bounce`, `ambient_marquee`,
  `ambient_spinner`, `ambient_twinkle`, `ambient_wave_sine`

Segment options (under `display`)

- `colors`: boolean — enable color cues (default: true)
- `bar_width`: number — width for gauges/bars (default: 10–12)
- `sparkline`: `{ width, height, points }` — size and history length
  for sparklines
- `context`: `{ token_limit, mode, recent_n }` — context gauge
  configuration
  - `token_limit`: default `200000` (200k tokens)
  - `mode`: `latest` | `session_total` | `recent_n` (default `latest`)
  - `recent_n`: number of assistant turns when `mode = recent_n`

Example multi‑row layout

```json
{
	"display": {
		"theme": "minimal",
		"colors": true,
		"bar_width": 12,
		"sparkline": { "width": 20, "height": 2, "points": 20 },
		"context": {
			"token_limit": 200000,
			"mode": "latest",
			"recent_n": 5
		},
		"layout": [
			["working_directory"],
			["git", "model"],
			["cost", "duration"],
			["tool_gauge", "cache_gauge"],
			["context_gauge"],
			["activity_strip"],
			["streak_bar"],
			["model_mix"],
			["cache_reads_sparkline"],
			["ambient_wave"],
			["ambient_bounce"],
			["ambient_marquee"],
			["ambient_spinner"],
			["ambient_twinkle"],
			["ambient_wave_sine"],
			["cost_sparkline"]
		]
	}
}
```
