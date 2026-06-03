# 🧠 Cortex — Personal Learning OS

AI-powered learning companion. Self-hosted, local-first, open-source.

## What is Cortex?

Cortex turns video courses into an interactive learning experience with an AI tutor. It's built for people who:
- Start courses and never finish them
- Have transcripts sitting unused in Obsidian
- Want an AI that actually helps them learn, not just answer questions

## How it works

1. **Drop video courses** into a folder
2. **Cortex discovers them** and creates a structured curriculum
3. **AI tutor** generates summaries, answers questions, reviews your practice code
4. **Track progress** with streaks and completion stats

## Tech Stack

- **Runtime:** Node.js + TypeScript
- **Framework:** Next.js 16 (App Router, Turbopack)
- **UI:** Mantine v9
- **Database:** SQLite (Drizzle ORM + better-sqlite3)
- **AI:** Pluggable — Hermes by default, any LLM agent can be added

## Quick Start

```bash
git clone git@github.com:effgenij/cortex.git
cd cortex
npm install
npm run db:migrate
npm run dev
```

Place courses in `/root/courses/` (configurable via `COURSES_DIR` env):

```
/root/courses/
└── Course Name/
    ├── cortex.json          # optional metadata
    ├── 01 - Introduction.mp4
    ├── 01 - Introduction.txt  # transcript
    ├── 02 - Setup.mkv
    └── ...
```

## Architecture

```
┌─────────────┐    ┌──────────────┐    ┌────────────┐
│   Next.js   │    │  AI Adapter  │    │  Sources   │
│  (Mantine)  │◄──►│  (pluggable) │    │ (pluggable)│
└─────────────┘    └──────┬───────┘    └─────┬──────┘
                          │                  │
                    ┌─────▼──────────────────▼─────┐
                    │         SQLite + FS          │
                    └──────────────────────────────┘
```

### AI Adapters (pluggable)
- **Hermes** — default, calls `hermes chat` CLI
- Claude Code, Codex, Pi — add a `cortex.plugin.json`

### Content Sources (pluggable)
- **LocalFS** — scans directories for video files
- YouTube, RSS, Email — future plugins

## Project Structure

```
src/
├── app/              # Next.js App Router pages + API
│   ├── page.tsx      # Dashboard
│   ├── courses/      # Course + module views
│   └── api/          # Chat, progress, media APIs
├── core/             # Business logic
│   ├── ai/           # AIService interface + Hermes impl
│   ├── sources/      # ContentSource interface + LocalFS
│   └── plugins/      # Plugin loader + manifest types
├── db/               # Drizzle schema + migrations
├── components/       # React components
└── lib/              # Utilities
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run db:migrate` | Apply DB migrations |
| `npm run db:generate` | Generate new migration |
| `npm run db:studio` | Open Drizzle Studio |

## License

MIT
