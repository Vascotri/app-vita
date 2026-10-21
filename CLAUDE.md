# CLAUDE.md — Vita

A product app built to the **inex26** company standards (canonical: the **hq** repo — `AGENTS.md` +
`standards/`), but hosted at **`Vascotri/app-vita`**, public, deliberately: Vercel Hobby and the
Supabase free tier are the budget, and Vercel Hobby won't deploy private org repos.

Read [`docs/prd-v1.md`](docs/prd-v1.md) before touching features.

## What Vita is

A single-player, Sims-style daily game that gets one user (the CEO: 62kg at 183cm, BMI 18.5) to a
healthy muscular weight. It tells him what to eat and train, logs meals from a photo, and recalibrates
itself from his daily weigh-in. **The goal is weight *gain*** — this is not a weight-loss app, and
every default must point the other way.

## Product invariants — don't "fix" these

- **The real problem is consistency, not knowledge.** The game layer (four bars, green day, streak) is
  the product; the nutrition maths is the easy half. If a change makes logging slower, it's a
  regression even if it makes the numbers more accurate.
- **The weight trend is ground truth; the photo is just a fast input.** Photo estimates are ±20–40%
  and that is *fine* — systematic error is absorbed by the weekly recalibration. Therefore: optimise
  for speed of logging over precision, show estimates as **ranges, not false decimals**, and never
  build a food-database search as the primary input path.
- **Photos are never persisted.** CEO decision, 2026-10-21. The image goes to the vision API
  in-memory and is discarded after estimation; we store only kcal, nutrients and the identified foods.
  No Storage bucket, no signed URLs. Do not add image persistence without a new decision.
- **Rate-cap gains** to 0.25–0.5% bodyweight/week so a lean bulk can't quietly become a fat one.
- **Single user.** No multi-tenancy, no invite flows, no sharing.
- **Not medical advice.** Keep the disclaimer. Never imply the app substitutes for a GP — persistent
  underweight warrants real bloodwork.

## Engineering bar

- **Stack:** Next.js (App Router) + **TypeScript strict** (no `any`) + Tailwind + Supabase. On Vercel.
- **Done means green:** `npm run typecheck && npm run lint && npm run test && npm run test:e2e &&
  npm run build` all pass. A bug fix adds a regression test.
- **Mobile is the default, not an afterthought.** He uses this one-handed, in a kitchen, on an
  iPhone 15. No horizontal scroll at 360–390px. Overlays/cards fit the phone: `max-width:100%`,
  centered with a viewport-edge gutter, `max-height` with internal scroll, safe-area insets respected.
  Long unbreakable strings wrap (`overflow-wrap:anywhere`) or truncate — never force the page wider.
  Every new user-facing route/state goes into `tests/e2e/responsive.spec.ts`.
- **Colour is semantic.** Bar hues live in `tailwind.config.ts` (`fuel`/`protein`/`training`/
  `recovery`/`greenday`). Retune them there, never with hex codes in components.
- **Design every state** — loading, empty, error, success. Accessibility is non-negotiable (labels,
  contrast, keyboard, ≥44px targets). A failed vision call must fall through to manual entry, never a
  dead end.
- **Free tier is a constraint, not a detail:** Supabase free = 500MB DB. Claude vision is
  pay-as-you-go on a separate API key — no runaway loops over images.
- **Environments are isolated:** Preview and Production have separate env/secrets. Real secrets live
  in Vercel env vars, never in the repo.
- **Ask before anything irreversible** (deleting data, spending money, publishing externally).
