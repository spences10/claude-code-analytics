# Claude Code Analytics & Enhanced Statusline

> A comprehensive statusline tool with data collection, analytics, and
> reporting for Claude Code users.

## What This Is

An **enhanced Claude Code statusline** that not only shows real-time
session data but also **collects, stores, and analyzes** your Claude
Code usage patterns over time.

### Core Features

🔄 **Enhanced Real-time Statusline Display**

- Smart cost formatting with efficiency indicators (⭐ high, ⚠️ low)
- Human-readable duration display (2m 30s vs 150000ms)
- Git status with clean/dirty indicators (🌿 main ✓ vs 🌿 main ●)
- Tool performance tracking with success rates (🔧 85% ✅)
- **Token cache efficiency tracking** with visual indicators (🚀 90%+,
  ⚡ 70%+, 🐌 <50%)
- **Cache savings display** in K/M format (🏃‍♂️ 100% (77K) 🚀)
- Working directory context and lines changed metrics

📊 **Data Collection & Analytics**

- Every tool call, file operation, and session tracked
- **Token caching metrics** with cache read/creation analysis
- SQLite database with rich schema (9 tables + cache fields)
- Hook-driven collection with ~0.1ms performance impact

📈 **Usage Analytics** _(Coming Soon)_

- Console-based reports and visualizations
- Personal productivity insights
- **Cache optimization recommendations** and efficiency analysis
- Cost optimization recommendations
- Project comparison and trends

## Current Status

**✅ Phase 1 Complete: Data Foundation**

- Hook system capturing all Claude Code events
- Comprehensive SQLite schema with incremental processing
- **Token caching data extraction** from JSONL conversation files
- 77+ sessions, 4,000+ messages, 2,000+ tool calls collected
- Silent operation (no user disruption)

**✅ Enhanced Statusline Complete**

- Two-tier display system (basic + database-powered)
- Productivity insights with efficiency rankings
- Real-time tool performance indicators
- **Token cache efficiency tracking** with 99.7% rates observed
- Smart cost analysis with historical comparisons
- Works independently with graceful fallbacks

**🚧 Phase 2 In Progress: CLI Analytics & Reports**

- Console-based analytics commands
- Personal productivity insights dashboard
- Advanced data visualization tools

## Quick Start

### 1. Installation & Setup

```bash
# Clone and build
git clone <repo>
cd claude-code-analytics
pnpm install && pnpm build

# Configure Claude Code statusline
# Add to ~/.claude/settings.json:
{
  "statusLine": {
    "type": "command",
    "command": "node /path/to/dist/statusline.js"
  },
  "hooks": {
    "SessionStart": [{"hooks": [{"type": "command", "command": "node /path/to/dist/statusline.js session_start"}]}],
    "PostToolUse": [{"hooks": [{"type": "command", "command": "node /path/to/dist/statusline.js post_tool_use"}]}],
    "Stop": [{"hooks": [{"type": "command", "command": "node /path/to/dist/statusline.js session_stop"}]}]
  }
}
```

### 2. Start Using Claude Code

Your statusline will display real-time data while collecting analytics
in the background.

### 3. View Your Data _(Coming Soon)_

```bash
# Session summaries
claude-code-analytics summary

# Cost breakdowns
claude-code-analytics costs --last-week

# Tool usage stats
claude-code-analytics tools --top-10

# Project insights
claude-code-analytics projects
```

## Database Schema

The system maintains a SQLite database at
`~/.claude/claude-code-analytics.db` with:

- **Sessions** - Every Claude Code session with timing, costs, metrics
- **Messages** - Full conversation history with **token caching
  analytics**
- **Tool Calls** - Every tool execution with success/failure tracking
- **Files** - File access patterns and modification history
- **Projects** - Cross-project analytics and comparisons
- **Hook Events** - Real-time event capture for performance monitoring

## Configuration

```json
// ~/.claude/claude-code-analytics.json
{
	"data_collection": true,
	"hook_logging": false,
	"display": {
		"show_cost": true,
		"show_duration": true,
		"show_lines_changed": true,
		"show_model": true
	},
	"thresholds": {
		"cost_warning": 1.0,
		"token_warning": 100000
	}
}
```

## Architecture

```
Claude Code Session
├── Real-time Status (300ms) → Enhanced Statusline Display
├── Hook Events → Data Collection Engine
├── JSONL Transcripts → Message & Tool Analysis
└── SQLite Database → Analytics & Reporting
```

## Data Privacy

- All data stored locally in `~/.claude/claude-code-analytics.db`
- No external data transmission
- Configurable data collection controls
- Hook operations run silently by default

## Development

```bash
# Development setup
pnpm install
pnpm build
pnpm dev

# Processing transcripts manually
node dist/statusline.js --process-transcripts
```

## Roadmap

- [ ] Console-based charts and graphs
- [ ] Personal productivity analytics
- [ ] **Cache optimization insights** and efficiency recommendations
- [ ] Cost optimization insights
- [ ] Project comparison reports
- [ ] Export capabilities (CSV, JSON)
- [ ] Advanced session analysis
- [ ] Trend forecasting
- [ ] Additional hook events (Notification, SubagentStop, PreCompact)
- [ ] Enhanced security and input validation

---

**Built for Claude Code power users who want to understand and
optimize their AI-assisted development workflows.**
