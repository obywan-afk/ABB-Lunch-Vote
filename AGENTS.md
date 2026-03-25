# ABB Lunch Vote: Agent Guide

This file is for coding agents and future maintainers who need fast operational context on this repository.

## What This App Does

- Shows lunch menus for a fixed set of restaurants around Pitäjänmäki / Valimo.
- Lets users vote on restaurants.
- Supports Finnish and English menus.
- Scrapes live menu data, caches processed results, and serves them through `/api/menus`.
- Uses a custom Three.js background on the login page.

## Main Runtime Flow

### Menus

1. Client requests `/api/menus`.
2. Route loads restaurant metadata.
3. For each restaurant, `EnhancedMenuProcessor.processRestaurantWithCache(...)` runs.
4. Processor tries DB cache first.
5. If cache miss:
   - calls restaurant-specific scraper in `src/lib/restaurantScrapers.ts`
   - for Finnish-only restaurants, translates via `src/lib/simpleTranslate.ts`
   - caches processed result through `DbMenuCache`
6. Route returns normalized restaurant payloads for UI rendering.

### Login Prefetch

- `src/app/login/page.tsx` prefetches menus for current day in both `en` and `fi`.
- Prefetched payload is stored in `sessionStorage`.
- Home page can use that payload to reduce perceived wait after login.

## Files That Matter Most

### API and menu processing

- `src/app/api/menus/route.ts`
  Main menu API route.

- `src/lib/enhancedMenuProcessor.ts`
  Cache-aware orchestration for scraping, translation, and fallback handling.

- `src/lib/restaurantScrapers.ts`
  Most scraper logic lives here. This is the highest-risk file for regressions.

- `src/lib/dbMenuCache.ts`
  Prisma-backed processed menu cache.

- `src/lib/simpleTranslate.ts`
  Deterministic line-based translation using `@vitalets/google-translate-api`.

### UI

- `src/app/login/page.tsx`
  Login page, prefetch logic, ocean controls.

- `src/components/ThreeGridBackground.tsx`
  Three.js login background. Contains custom GLSL shaders.

- `src/app/page.tsx`
  Main application page using prefetched menu data.

- `src/components/restaurant-card.tsx`
- `src/components/cards/MotionRestaurantCard.tsx`
- `src/components/cards/RetroRestaurantCard.tsx`
- `src/components/cards/ABBNeuralRestaurantCard.tsx`
  Card variants. Website CTA is wired here.

## Restaurant-Specific Notes

- `tellus`
  RSS/API style source.

- `por`
  Weekly content with day slicing logic.

- `valimo-park` / `Faundori`
  Finnish-only source. English is translated after scrape.

- `factory`
  Finnish-only source. English is translated after scrape.

- `ravintola-valimo`
  Very fragile source. The website contains lots of non-menu content.
  Important:
  - only validated day slices should be accepted
  - never allow fallback to whole-page text extraction
  - bad extraction can dump marketing copy, contact form labels, and multiple weekdays into the UI

- `antell-kuohu`
  Finnish-only source. English is translated after scrape.

## Important Behavioral Decisions

### Translation

- Old Genkit/Gemini translation flow was removed from live menu processing.
- Translation now uses `google-translate-api` for determinism and speed.
- Structured menu preservation matters more than “smart” rewriting.

### Parsing

- Live `/api/menus` should not depend on Genkit for parsing.
- `EnhancedMenuProcessor` now uses a local fallback parser for failed scrapes instead of loading old Genkit prompt flows.

### Caching

- Cache is per restaurant, per language, per day.
- English cache for Finnish-only restaurants should be reused, not bypassed.
- Placeholder or temporary failure content should not be kept as valid cache if avoidable.

### Database fallback

- `/api/menus` should still work when `DATABASE_URL` is not configured.
- Route currently falls back to static restaurant metadata in that case.
- Prisma-backed cache reads/writes will degrade, but route should not crash just because DB env is missing.

## Current Known Traps

### 1. Prisma environment assumptions

- Some paths still assume Prisma client exists.
- Missing `DATABASE_URL` used to hard-fail `/api/menus`.
- When touching DB-related code, preserve the non-DB fallback behavior.

### 2. Valimo extraction quality

- `ravintola-valimo` is easy to break.
- If you broaden fallback extraction, you will likely leak page chrome and non-menu content into the menu cards.

### 3. Three.js shader edits

- `ThreeGridBackground.tsx` contains custom GLSL.
- Common failure mode: add usage of a uniform in shader code without declaring it in the shader header.
- If browser shows:
  `THREE.WebGLProgram: Shader Error ... Fragment shader is not compiled`
  check missing `uniform` declarations first.

### 4. Camera interaction

- Camera should not dip into the water.
- Orbit controls clamp both angle and camera height to avoid bug-like interaction.

### 5. Typecheck status

- There are recurring unrelated TypeScript failures outside the latest UI work:
  - `src/app/api/lunch-notes/[id]/route.ts`
  - `src/lib/restaurantScrapers.ts`
- If typecheck fails after unrelated changes, verify whether these pre-existing issues are the reason before rolling back good work.

## How To Modify Safely

### If changing menu scraping

- Prefer deterministic extraction before AI.
- Validate extracted content aggressively.
- Reject page-wide fallback text if it includes:
  - contact forms
  - marketing copy
  - multiple weekday sections when only one day is expected
  - generic site navigation or footer content

### If changing `/api/menus`

- Keep route parallelized.
- Avoid blocking cleanup work on request path.
- Preserve `DATABASE_URL` fallback behavior.

### If changing translation

- Preserve menu structure, diet markers, day headers, and pricing.
- Do not reintroduce LLM-based translation for basic menu conversion unless there is a strong reason.

### If changing login background

- Keep controls minimal.
- Make slider movement visually obvious.
- Prefer broad scene response over tiny numeric parameter shifts.

## Environment Assumptions

- Branch used for deployment: `master`
- Remote: `origin` -> GitHub -> Vercel deploy
- App often runs locally without fully configured production env
- `NEXTAUTH_URL` may be missing locally
- `DATABASE_URL` may be missing locally

## Recommended First Reads For Agents

If you are new to this codebase, read in this order:

1. `src/app/api/menus/route.ts`
2. `src/lib/enhancedMenuProcessor.ts`
3. `src/lib/restaurantScrapers.ts`
4. `src/app/login/page.tsx`
5. `src/components/ThreeGridBackground.tsx`

## Practical Rule

If a fallback returns "something" but that something looks like an entire webpage, treat it as a failure, not a success.
