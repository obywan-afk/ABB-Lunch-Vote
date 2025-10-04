# ABB Lunch Vote

Next.js internal tool for the ABB Helsinki crew to keep lunch decisions organised. The app scrapes restaurant menus, translates Finnish-only listings on demand, and records everyone’s daily votes in PostgreSQL.

## Features
- **Daily menu ingest** – Scrapes six local restaurants, normalises the output, and caches per-day menu data in the database.
- **AI-assisted translation** – Uses Google Gemini (Genkit) so Finnish menus stay readable in English while preserving dietary codes and formatting.
- **Per-day voting** – Authenticated teammates cast one vote per weekday (open Monday 07:00 → Tuesday 12:00 Helsinki time). Votes are tied to the calendar date.
- **Realtime-friendly hooks** – Shared React hooks (`useVoting`, `useUserVote`, `useVoters`, `useDayVoting`) drive optimistic UI and toast feedback across the themed weekday pages.
- **Operational tooling** – A cron-safe cleanup endpoint archives last week’s votes and removes stale menu cache entries.

## Tech Stack
- **Framework**: Next.js 15 (App Router) + React 18 + TypeScript
- **UI**: Tailwind CSS, Radix primitives, custom animated cards per weekday
- **Data**: PostgreSQL via Prisma (`Restaurant`, `Vote`, `MenuCache`, `VoteHistory`)
- **AI**: Google Gemini 2.0 Flash through Genkit flows
- **Tooling**: Genkit CLI, tsx, date-fns, Luxon, react-hook-form

## Getting Started
### Prerequisites
- Node.js 18+
- PostgreSQL database
- Gemini API key (Google AI Studio access)

### Environment Variables
Create `.env` with at least:
```
DATABASE_URL=postgresql://...
GEMINI_API_KEY=...
LUNCH_VOTE_PASSWORD=...
CRON_SECRET=...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:9002
```

### Install & Database
```bash
npm install
npx prisma migrate dev      # or migrate deploy in CI
npx prisma db seed          # optional baseline restaurants
```

### Run Locally
```bash
npm run dev                 # http://localhost:9002
```
Log in with the shared password (`LUNCH_VOTE_PASSWORD`) and enter your display name (stored with your votes).

## Core Flows
### Menu ingestion & translation
- `GET /api/menus?day=tuesday|wednesday|thursday` runs `EnhancedMenuProcessor`.
- Scrapers live in `src/lib/restaurantScrapers.ts`; results cache per restaurant/date/language in `MenuCache`.
- When English is requested and text is Finnish, `src/ai/flows/translate-menu.ts` invokes Genkit to translate while preserving headers, tags, and prices.

### Voting
- `src/hooks/useDayVoting.ts` merges static menu data and live tallies from `/api/vote`.
- Votes store both `date` (YYYY-MM-DD, Europe/Helsinki) and `weekOf` (used for archiving).
- Delete via `/api/vote` `DELETE`; `/api/user/vote-status` keeps clients in sync.
- `/api/voters` returns the distinct voter list for today.

### Cleanup & archiving
- `POST /api/cache/cleanup` archives votes older than the current week (`VoteHistory`) and deletes stale `MenuCache` rows.
- Include header `x-cron-secret: <CRON_SECRET>` and schedule once per weekday.

## Useful Scripts
| Command | Purpose |
| --- | --- |
| `npm run dev` | Start Next.js with Turbopack |
| `npm run build` | Generate Prisma client + build app |
| `npm run start` | Serve production build |
| `npm run lint` | Next.js ESLint checks |
| `npm run typecheck` | TypeScript `--noEmit` |
| `npx tsx scripts/test-translation.ts` | Sanity-check Finnish → English translation |
| `npm run genkit:dev` | Launch Genkit dev console |

## Project Layout
```
src/
  ai/            # Genkit flows (translation, parsing)
  app/           # Next.js pages & API routes
  components/    # UI components and restaurant cards
  hooks/         # React hooks for voting state
  lib/           # Scrapers, utilities, menu helpers
prisma/
  schema.prisma  # Data model
  seed.ts        # Seed script for restaurants
```

## Timezone Configuration ⚠️
**IMPORTANT**: This application assumes the server runs in **Europe/Helsinki timezone** (EET/EEST, UTC+2/+3).

### Why This Matters
All date/time calculations use the server's local time via JavaScript's `Date()` object:
- **Voting windows**: Monday 07:00 → Tuesday 12:00 (Helsinki time)
- **Week calculations**: Monday midnight is used for `weekOf` grouping
- **Menu caching**: Day boundaries determined by server time

### Current Implementation
The codebase uses naive `Date()` operations in `src/lib/time/week.ts` without explicit timezone handling. This works correctly as long as the server timezone matches Helsinki.

### Deployment Options
When deploying outside Helsinki timezone:

**Option 1: Configure Server Timezone (Recommended for current setup)**
```bash
# Set environment variable
TZ=Europe/Helsinki

# Or in Docker/container
ENV TZ=Europe/Helsinki
```

**Option 2: Migrate to Timezone-Aware Code**
If you cannot control server timezone, you'll need to:
1. Update `src/lib/time/week.ts` to use `Intl.DateTimeFormat` with explicit `Europe/Helsinki` timezone
2. Migrate existing `Vote.weekOf` values in the database to match new semantics
3. Update queries to use date ranges instead of exact equality: `where: { weekOf: { gte: start, lt: end } }`

### Database Considerations
The `Vote.weekOf` column stores Monday midnight timestamps for week grouping. If you change how `getCurrentWeekStart()` calculates this value (e.g., by switching to timezone-aware code), existing votes won't match the new timestamps unless you migrate them. Current queries use exact equality: `where: { weekOf: weekStartDate }`.

## Deployment Notes
- Provide all env vars plus production DB credentials.
- **Ensure server timezone is set to `Europe/Helsinki`** (see Timezone Configuration section above).
- `npm run build` → `npm run start` for production.
- Allow outbound HTTPS for scraper targets and Google AI endpoints.
- Schedule `/api/cache/cleanup` with the cron secret.
- Monitor Genkit usage; translation runs once per restaurant per day per language.

## Troubleshooting
- **Menus empty**: check server logs, use `?fresh=true` to bypass cache.
- **Translations missing**: verify `GEMINI_API_KEY`, run `scripts/test-translation.ts`.
- **Votes stale**: ensure session storage keys exist (`abb-lunch-vote-auth`, `abb-lunch-vote-user`) and that it’s within the voting window (Mon 07:00 → Tue 12:00 Helsinki).
- **Cleanup skipped**: confirm cron sends `x-cron-secret` header; handler quietly skips invalid calls.

## Contributing
1. Branch off `master`.
2. Update Prisma schema/migrations if data changes.
3. Run `npm run lint` and `npm run typecheck`.
4. Document notable updates in `/docs` and extend this README when needed.

Happy lunch voting! 🥗
