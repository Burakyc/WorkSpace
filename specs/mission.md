# Mission

## Vision

DevPath Workspace is one calm, local desktop app where a junior developer plans, does and looks back on their learning and career growth. Focus time, notes, study content, interview prep and career visibility live in one place instead of five tools, and every piece of data stays on the user's own machine.

## Problem

Preparing for a first or next developer job spreads across many tools: a pomodoro timer that knows nothing about goals, a notes app, flashcard apps, AI chats whose output gets lost, bookmarks of videos, and a blank LinkedIn editor. Progress is hard to see, content is hard to find again, and showing your work publicly takes too much effort.

## Target user

A single developer (the author) who:

- is a junior developer preparing for **ASP.NET Core + React/TypeScript** roles,
- studies in pomodoro-sized blocks next to a job or other work,
- uses AI chats (Claude, ChatGPT, etc.) to generate study material and wants to keep that output in a structured form,
- wants to practise English daily and build visibility on LinkedIn and GitHub,
- is a native Turkish speaker: the app's UI is in **Turkish**, while study content can be in any language (mostly English).

There are no other users. Every design decision optimises for this one person on one Windows machine.

## Core goals

1. **Goal-driven focus.** Every pomodoro is tied to a goal (and optionally a project and tags), so time spent adds up to visible progress.
2. **Effortless look-back.** A calendar and daily log answer "what did I do on Tuesday?" in one click: pomodoros, goals and notes.
3. **One home for knowledge.** Notion-style notes (page tree, subpages, toggles, code blocks, `/` commands, search) for everything the user learns.
4. **Own content, structured.** Learning, English and Interview modules start empty and are filled only by the user, by pasting AI output or importing JSON files that are validated and merged, never overwritten.
5. **Signal at a glance.** A home dashboard shows today's reminders, GitHub stats, new YouTube videos and agent-written X summaries, plus what changed since the last visit.
6. **Career visibility without automation.** (Post-MVP) A post assistant turns projects, videos and links into LinkedIn drafts in the user's own style. The user posts them by hand.

## Success criteria for v1

| Measure | Target |
|---|---|
| Daily use habit | The app is used on at least 5 workdays per week for 4 consecutive weeks, replacing the separate timer, notes and calendar tools. |
| Interview readiness | The Interview, Learning and English modules hold enough of the user's own content to run daily practice and prepare for interviews from the app alone. |
| Career visibility | (After the post assistant ships) at least one LinkedIn post per week is drafted in the app. |

## Product principles

- **Local first, local only.** All data is JSON on disk in a folder the user controls. The app works offline; external data (GitHub, YouTube) is a cached extra.
- **Read and draft, never act.** The app reads from platforms and prepares drafts. It never posts, likes, comments or follows.
- **The user owns the content.** Nothing is pre-loaded. Content comes in through paste or file import, is validated against a schema, and is merged into existing topics.
- **Two clicks to anything.** Start a pomodoro, open a note, add content, prepare a post: at most two clicks each, with keyboard shortcuts for the most common actions.
- **Calm by default.** Notifications are few, quiet and configurable. No streak guilt, no fixed weekly schedule.
- **Small and boring.** Simple, well-tested code that the author can explain in an interview beats clever code.

## Non-goals

- **Auto-posting or any write action on external platforms** (LinkedIn, X, GitHub, YouTube). Drafts only.
- **Multi-user support.** No accounts, roles, sharing or collaboration.
- **Mobile or web versions.** Desktop (Electron on Windows) only.
- **Built-in AI in the MVP.** The MVP makes no LLM API calls; content arrives only through paste or file import. AI connection modes come after the MVP.
- **Pre-loaded learning content.** Modules ship empty.
- **A fixed weekly study schedule.** The calendar records and shows the past; reminders are daily.
- **UI translations.** The UI is Turkish only; there is no i18n layer.

## Stakeholder requirements (synthesized)

### Engineer — stack, reliability, scalability, security, internal tools

- **Stack:** Electron shell, React + TypeScript (Vite) frontend, ASP.NET Core Web API backend running on `127.0.0.1` and started by Electron, JSON files for storage, BlockNote note editor, GitHub REST API and YouTube channel RSS as external sources, xUnit and Vitest + React Testing Library for tests.
- **Reliability:** atomic JSON writes; a `schemaVersion` in every file with migrations; when GitHub or YouTube is unreachable the app opens with cached data and shows an error card. Daily backups with 14-day retention are planned right after the MVP.
- **Scalability:** one service and one folder per module; storage behind `IRepository` so a move to SQLite touches one layer; new content types are added as a new `type` in the shared import format (`type`, `topic`, `level`, `tags`, `items`).
- **Security:** localhost-only API; API keys and the GitHub token in Electron `safeStorage`, never in the repo or JSON; `contextIsolation: true`, `nodeIntegration: false`, minimal preload bridge, strict CSP; every import validated against its schema and executable content rejected; `data/` and `.env` gitignored, repo private.
- **Internal tools:** developer panel (API health, recent errors, data file sizes); import validator that lists missing fields line by line; an agent interface where Claude's morning task writes X List summaries to `feed.json` and weekly stats to `stats.json`, which the app only reads; a prompt library with ready-made templates per content type.

### Marketing — UI quality, responsiveness, performance, showcase, UX

- **UI quality:** one design token file for colors, fonts and spacing; light and dark themes that follow the OS; a sidebar + content layout shared by every module.
- **Responsive design:** below 900 px wide the sidebar collapses to icons and content becomes one column; large screens use a multi-column dashboard grid; SVG icons for sharp high-DPI rendering.
- **Performance:** startup under 3 seconds with the home screen loading from cache and refreshing in the background; no typing lag in the editor, with background saves on a 1-second debounce; the pomodoro timer stays accurate while minimized.
- **Showcase:** a "what changed since your last visit" card; profile cards with GitHub and LinkedIn links and current numbers; a certificate showcase and featured projects list (post-MVP); LinkedIn drafts from a project, video or link in the user's style (post-MVP).
- **UX standards:** at most two clicks per main action; keyboard shortcuts (new note, start/stop pomodoro, search); empty states that say what to do next; calm, configurable notifications with user-set times for the daily English and tech reminders; sufficient contrast and full keyboard navigation.

### Product — MVP, scenarios, business rules

- **MVP scope:** (1) goals and projects with progress percentage, (2) pomodoro with goal + project + tags, logged per session, (3) calendar and daily log, (4) notes, (5) empty Learning / English / Interview modules filled by paste or file import, (6) home dashboard.
- **Also in the MVP (decided with the user):** keyboard shortcuts, daily reminders, the developer panel and a Windows installer.
- **Post-MVP:** daily backups, AI connection modes (API / copy-paste / file import), AI teacher, style prompt and post assistant, spaced repetition, job application tracking, weekly summary report, showcase (profile cards, certificates, featured projects).
- **Scenarios:**
  - *Study session:* pick the "Learn ASP.NET Core" goal and the "Todo API" project, start a pomodoro tagged `#di`, write a short note at the end; the session shows up in the calendar and in the goal's progress.
  - *Adding content:* in the Interview module, click "Copy prompt", paste it into any AI, paste the returned JSON back; the app validates it and turns the questions into cards.
  - *Preparing a post:* give a YouTube link; the app fills title, body, hashtags, source link and image suggestion; the user copies the text and posts it themselves.
  - *Looking back:* click last Tuesday in the calendar to see the pomodoro count, the goals worked on and the notes taken.
- **Business rules:**
  - The app never posts, likes, comments or follows on any platform.
  - Every pomodoro session is linked to a goal; tags are optional.
  - Imported content that does not match its schema is not saved, and the missing fields are shown.
  - Adding content to an existing topic merges it; nothing is overwritten.
  - There is no fixed weekly schedule; reminders are daily.
  - Personal data is never committed to the repo.
