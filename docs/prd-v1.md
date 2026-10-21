# PRD — Vita v1: the daily gain loop

> Staging location. Moves to `app-vita/docs/prd-v1.md` when `/new-app` scaffolds the repo.

**Issue:** TBD (no repo yet) · **App:** `Vascotri/app-vita` · **Author:** pm · **Date:** 2026-10-21

## Problem / user need

A single user (the CEO) is data-driven and disciplined at work, and consistently undisciplined about
his own health. At 62kg / 183cm he's at BMI 18.5 — the underweight line — and names weight and muscle
mass as his #1 personal gap. He is not short on knowledge; he's short on **doing it daily**. Every
mainstream tracker is built for the opposite problem (eat *less*), frames logging as admin, and uses
guilt as the motivator. He needs a system that makes eating *more* feel like winning, with low enough
friction to survive a founder's day.

## Outcome

He hits his intake target on most days without willpower being the mechanism — the game loop carries
it. Downstream: bodyweight trending up 150–300 g/week, sustained over months rather than days.

## Scope

**In (v1):**
- **Setup, once:** age / height / weight / activity → computed kcal + protein targets, rate-capped to
  0.25–0.5% bodyweight/week. Recommends a **training environment** (he owns nothing yet).
- **The bars** — four Sims-style "motives", the home screen and the whole point:
  **Fuel** (kcal) · **Protein** · **Training** · **Recovery** (sleep hours). Reset at midnight.
  All four filled = a **green day**. Consecutive green days = the streak.
- **Morning weigh-in** — one number, one tap, surfaced as the first action of the day.
- **Meal logging by photo** → Claude vision estimate → editable → fills Fuel/Protein. The photo is
  **transient**: estimated in-memory, never stored. Persisted record = kcal, nutrients, foods.
  **Saved meals** for repeats (he cooks most meals, so repetition is the speed unlock).
- **Meal timing** — a simple daily schedule telling him what to eat when.
- **Training** — one recommended starter program, today's session as a checklist, tick to complete,
  simple linear load progression. No exercise library, no periodisation.
- **Weekly recalibration** — adaptive TDEE derived from the weight trend; adjusts the target.
- **Health-data ingest seam** — endpoint + schema only, no UI.
- Medical disclaimer + a one-time prompt to get bloodwork.

**Out (later):** Apple Watch / Health sync UI · multi-user · food-database search · barcode scanning ·
carb/fat targets (v1 tracks kcal + protein only) · recipes & shopping lists · progress photos ·
auto-periodisation · anything social · native app · supplements.

## UX

Mobile-first, one-handed, iPhone 15 in a kitchen. 375px is the design target, not a breakpoint.

- **Home (the bars)** — four bars, today's number under each, primary action = log. *Empty:* bars
  drained at 00:00 with the day's plan visible. *Loading:* skeleton bars, never a spinner on the hero.
  *Success:* bar fills with motion + the green-day state when all four land.
- **Log a meal** — camera-first. *Loading:* photo shown immediately with an "estimating…" shimmer on
  the numbers. *Success:* an editable estimate as a **range**, not false precision. *Error:* vision
  fails → fall straight through to manual kcal/protein entry, photo still on screen (client-side
  only, never uploaded). Never a dead end.
- **Weigh-in** — number pad, remembers yesterday as the starting value.
- **Trend** — weight as a smoothed trend line (raw daily weight is noisy and demotivating), with the
  current target and what the last recalibration changed.
- **Today's session** — the exercises, sets, target load, tick to complete.

## Success measure

**Adherence: % of days in a trailing 14-day window where the Fuel bar hits ≥95% of target.**
Target ≥80% by week 4. Adherence — not weight — because adherence is what the app controls; weight is
the outcome it buys. Secondary signal: trend slope inside the 150–300 g/week band.

## Risks / unknowns

- **Logging fatigue is the #1 killer.** Mitigation: ≤10 seconds to log a meal, saved meals, camera as
  the default entry point. If logging a meal ever feels like data entry, v1 has failed.
- **Novelty decay.** Gamification typically fades at 2–3 weeks. The streak and the visible weekly
  recalibration have to take over from novelty. **This is the real unknown in the product** — worth an
  explicit check-in at week 3.
- **Photo accuracy is ±20–40%.** Acceptable by design: the weight trend is ground truth and the weekly
  recalibration absorbs systematic error. Risk is *perceived* inaccuracy demotivating him — hence
  ranges, not fake decimals.
- **Supabase storage: solved by decision (CEO, 2026-10-21).** Photos are **never persisted** — the
  image goes to the vision API in-memory and is discarded after estimation. We keep only the
  structured record: kcal, nutrients, and the identified foods. No Storage bucket, no signed URLs, no
  cleanup job in v1. Accepted tradeoff: meal history is text-only, so a past estimate can't be
  re-checked against its photo.
- **Claude vision is pay-as-you-go** and does *not* run on the Claude Code subscription — the app needs
  its own API key. ~4 photos/day ≈ 120 calls/month ≈ low single-digit €/month. Small, but it's a real
  meter and the project has hit a monthly cap before.
- **Medical:** persistent underweight despite normal eating warrants a GP visit and bloodwork
  (thyroid, coeliac, malabsorption). The app must prompt this once and never position itself as a
  substitute.
- **Open — CEO input:** age (setup field, not a blocker) · does he own a **smart scale**, which decides
  how much friction sits on the single most important daily action.
- **Needs sign-off:** the four-bar set and the green-day win condition (the core new affordance);
  trend-line over raw weight.

## Slices

| # | Slice | Why here |
|---|---|---|
| 1 | **Daily loop, manual.** Setup + targets, four-bar home, weigh-in, manual kcal/protein quick-log, green day + streak. | Smallest thing that is already a playable daily game. Ships and gets used from day one. |
| 2 | **Photo logging.** Camera → Claude vision → editable range → saved meals. | The friction killer. Protects the adherence metric before novelty fades. |
| 3 | **Training.** Recommended setup, starter program, today's session, linear progression. | Second half of the goal, and it can run while weight data accrues. |
| 4 | **Adaptive engine.** Trend EMA, weekly TDEE recalibration, rate-capped target changes, trend chart. | Needs ~14 days of weigh-ins to say anything — so it *can't* come earlier. |
| 5 | **Meal timing.** Daily schedule + nudges. | Refinement once the what is solved. |
| 6 | **Health ingest seam.** Endpoint + schema, no UI. | Unblocks the Watch later without a rewrite. |

Each slice is its own PR behind the normal gates. Slice 1 is deployable on its own.
