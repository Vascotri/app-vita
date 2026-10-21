# Vita

**Fill the bars.** A single-player, Sims-style daily game for getting to a healthy muscular weight:
it tells you what to eat and what to train, estimates your meals from a photo, and recalibrates its
own targets from your daily weigh-in.

Built to the inex26 company standards. Scope and slices: [`docs/prd-v1.md`](docs/prd-v1.md).

**Stack:** Next.js (App Router) · TypeScript (strict) · Tailwind · Supabase · Vitest · Playwright
(mobile gate) · CI on PRs · deployed on Vercel.

## The four bars

| Bar | Fills from | Hue |
|---|---|---|
| **Fuel** | calories logged | amber |
| **Protein** | protein logged | rose |
| **Training** | today's session completed | violet |
| **Recovery** | sleep hours | sky |

All four filled = a **green day**. Consecutive green days = the streak. That's the whole game.

## Scripts

```bash
npm install
npm run dev        # local dev server
npm run typecheck  # tsc --noEmit
npm run lint       # next lint
npm run test       # vitest (unit, lib/ only)
npm run test:e2e   # playwright — the 375px mobile gate
npm run build      # production build
npm run format     # prettier --write
```

"Done" means all of the above are green.

## Layout

```
app/        # Next.js App Router (layout.tsx, page.tsx, globals.css)
lib/        # framework-free logic + colocated *.test.ts
supabase/   # schema.sql + numbered migrations
docs/       # the PRD and design notes
tests/e2e/  # the mobile responsive gate
CLAUDE.md   # how agents work in this repo — read before touching features
```

## Environment

See [`.env.example`](.env.example). Nothing real is committed; values are set per-scope (Preview vs
Production) in Vercel.

## Deploy

Vercel auto-detects Next.js. Every PR gets a preview URL; merges to `main` ship to production.

---

Not medical advice. Persistent underweight despite normal eating warrants a GP visit and bloodwork.
