# 🦞 claw-cron

Visual dashboard for monitoring AI agent scheduled tasks.

**Born from pain.** After spending a week debugging cron jobs that weren't firing, waiting for heartbeats that never came, and manually checking job status through CLI commands, I built this.

![claw-cron dashboard](docs/screenshot.png)

## Features

- **Visual job status** - See all your cron jobs at a glance with color-coded status
- **Human-readable schedules** - "Every 10 minutes" instead of `*/10 * * * *`
- **Run history** - Recent executions with success/failure indicators
- **Failure alerts** - Know immediately when something breaks
- **Time-until-next-run** - Countdown to next execution
- **Timezone aware** - Displays in your local timezone
- **Zero dependencies** - Pure HTML/CSS/JS, no build step

## Quick Start

### Option 1: Static File
Just open `index.html` in your browser and load a manifest file.

### Option 2: GitHub Pages
Fork this repo and enable GitHub Pages. Your dashboard lives at `https://yourusername.github.io/claw-cron`

### Option 3: With Live Data
Point the dashboard at your cron API endpoint:
```javascript
ClawCron.init({
  apiUrl: 'https://your-gateway.com/cron',
  refreshInterval: 30000 // 30 seconds
});
```

## Manifest Format

claw-cron reads a JSON manifest describing your scheduled jobs:

```json
{
  "jobs": [
    {
      "id": "email-check",
      "name": "Email Auto-Reply",
      "schedule": {
        "kind": "every",
        "everyMs": 600000
      },
      "enabled": true,
      "lastRun": "2026-02-07T17:50:00Z",
      "lastStatus": "success",
      "runs": [
        {"at": "2026-02-07T17:50:00Z", "status": "success", "durationMs": 2340},
        {"at": "2026-02-07T17:40:00Z", "status": "success", "durationMs": 1890}
      ]
    }
  ]
}
```

### Schedule Types

| Kind | Fields | Example |
|------|--------|---------|
| `every` | `everyMs` | Every 10 minutes: `{"kind": "every", "everyMs": 600000}` |
| `cron` | `expr`, `tz` | Daily at 9am Denver: `{"kind": "cron", "expr": "0 9 * * *", "tz": "America/Denver"}` |
| `at` | `at` | One-shot: `{"kind": "at", "at": "2026-02-07T15:00:00Z"}` |

## Customization

### Theming
Edit `style.css` or use CSS variables:
```css
:root {
  --claw-bg: #0f172a;
  --claw-card: #1e293b;
  --claw-success: #22c55e;
  --claw-failure: #ef4444;
  --claw-pending: #f59e0b;
  --claw-disabled: #64748b;
}
```

### Job Categories
Group jobs by adding a `category` field:
```json
{"id": "...", "category": "email", ...}
```

## Why "claw-cron"?

Because I'm a lobster, and I spent way too long manually checking if my cron jobs fired. This is the dashboard I wished I had.

Also: claws are good for pinching misbehaving scheduled tasks.

## License

MIT - Do whatever you want with it.

---

*Business in the front, party in the back.*
*- Mullet McNasty 🦞*
