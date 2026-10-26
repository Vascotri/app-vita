# Design spec — slice 1: the daily loop

**App:** `Vascotri/app-vita` · **Author:** designer · **Date:** 2026-10-26 · **Mode:** producing (pre-build)

**Scope:** PRD slice 1 — setup + targets, four-bar home, weigh-in, manual kcal/protein log, green day
+ streak. Bar: `hq/standards/design.md`. Product invariants: [`../CLAUDE.md`](../CLAUDE.md).

---

## 0. The inversion engineering must not undo

Vita is a **gain** app. Every tracker convention is built for restriction and must be inverted:

- **Exceeding the Fuel target is a WIN, never a warning.** No red at 100%+. No "over budget". No
  scolding copy. Overfill renders as a *brighter continuation* of the bar.
- **An empty bar in the morning is not failure** — it's 7am. The design must not open with guilt.
  That's the behaviour we're trying to fix, and a daily guilt hit is how he abandons this in week two.
- Only above ~130% of Fuel does a neutral note appear ("big day — that's fine"). Never red, never
  blocking.

If a change makes logging slower but the numbers more accurate, that is a **regression**.

---

## 1. Screens

```
first run ──▶ Setup (one-time, 4 steps + maths) ──▶ Home
                                                     │
                            ┌────────────────────────┼────────────────────────┐
                            ▼                        ▼                        ▼
                     Weigh-in sheet             Log sheet            Green-day moment
```

Four surfaces. No nav bar, no tabs, no settings screen in slice 1 — Home *is* the app.

---

## 2. Home anatomy (375px first)

Single column, 16px side gutter. Top to bottom:

1. **Weigh-in slot.** Today's weight is the first action of the day, so it owns the top.
   - *Not recorded:* a tappable card — "Weigh in" with yesterday's value as context. The only
     element allowed to look like a prompt.
   - *Recorded:* collapses to one quiet line — `62.4 kg · up 0.2 this week`. No chart in slice 1.
2. **Streak**, small, top-right. A sprout glyph (Vita = life), not a flame.
3. **The four bars**, stacked full-width, fixed order: **Fuel · Protein · Training · Recovery**.
   Each row carries:
   - label (left) + `value / target` (right), both in the bar's `dark` token
   - the bar: 12px tall, fully rounded, track = `light` token, fill = `dark` token
   - a **pace tick** — a 2px vertical marker at where he should be by this hour. This is what makes
     an empty bar read "fine, it's early" at 8am and "move" at 8pm. Without it, a bar is decoration.
     Cheap to build (one absolutely-positioned div) and the *only* thing to cut if slice 1 runs long.
   - a check glyph replacing the numbers when complete — **never colour alone**
4. **Today's entries** — plain list, each row tappable to edit, long-press to delete.
   *Empty:* one neutral line, "Nothing logged yet." No illustration, no sad face.
5. **Primary action** — fixed bottom, full-width, 56px tall, inside `env(safe-area-inset-bottom)`:
   **`+ Log`**. Thumb-reachable one-handed, which is the real use position (kitchen, phone in hand).

**Why stacked bars and not Apple-Fitness rings:** he asked to "fill the bars", `value / target` reads
instantly at 375px, and a ring can't carry the pace tick. Honour his mental model.

---

## 3. Training and Recovery in slice 1 — the honest answer

The four-bar game must exist from day one or the mechanic doesn't land. But the training *program* is
slice 3 and Health sync is slice 6. So for slice 1:

- **Training** fills from a single manual tick — "Trained today?". Slice 3 swaps the tick for the
  prescribed session; the bar's contract never changes.
- **Recovery** fills from one number — hours slept, entered on the weigh-in sheet, so it stays one
  morning ritual rather than two. Slice 6 lets Apple Health write it instead.

Green day = all four, from the first commit, with no throwaway UI.

---

## 4. Every state

### Setup (one-time, one question per screen, back always available)

1. Age → 2. Height / weight (prefilled 183cm / 62.0kg) → 3. Activity level (four plain-language
options, no MET jargon) → 4. Pace (0.25 / 0.4 / 0.5 %bw per week, each labelled with the actual
g/week **and** the projected date he reaches 70kg).

Then a **"here's the maths" screen**: BMR, TDEE, surplus, final kcal and protein, each line showing
its derivation. He is data-driven — showing the working is what buys trust in every later
recalibration. One button: "Start".

*Validation:* inline, on blur, never a modal. Out-of-range (height < 100 or > 250cm) shows an inline
hint, keeps focus, and Continue carries an explanatory label rather than being a dead grey button.

### Home

- *Loading:* skeleton bars at the real geometry. No spinner, no layout shift when data lands.
- *Morning / empty:* bars at 0, pace ticks near the left, weigh-in card prominent. Neutral tone.
- *Partial:* the normal case. Fills animate from the previous value, never from 0.
- *Green day:* see §7.
- *Error (data unreachable):* a dismissible inline strip above the bars — "Can't reach your data.
  Retry." Never full-screen, never a blocking modal. Last-known values stay on screen.
- *Offline / write failed:* keep the entry locally, show it with a small pending dot, and fill the
  bar optimistically anyway. Logging must never feel like it failed.

### Log sheet (bottom sheet — he's mid-kitchen, not sitting down)

- Two fields: **kcal** and **protein (g)**, both `inputmode="numeric"`, kcal focused on open.
- One optional free-text "what was it?" line. No autocomplete, no database. It seeds slice 2's saved
  meals. **Do not build food search.**
- *Saving:* the button shows progress, the sheet stays put, the bar updates optimistically behind it.
- *Error:* sheet stays open, values preserved, inline message. Never lose his typing.
- *Guard:* Save stays disabled until kcal > 0, with the reason in text, not just a grey button.

### Weigh-in sheet

- One decimal weight field + hours-slept field. Prefilled with yesterday's weight, so the common
  case is a ±0.2 nudge rather than typing from scratch.
- *Already recorded today:* opens in edit mode on today's value. No duplicate rows.

---

## 5. Tokens — and a contrast bug to fix first

`tailwind.config.ts` defines `fuel` / `protein` / `training` / `recovery` / `greenday`, each with
`light` / `DEFAULT` / `dark`. **Computed contrast shows the obvious pairing fails:**

| Pairing | Ratio | Verdict |
|---|---|---|
| `fuel.DEFAULT` `#f59e0b` fill on `fuel.light` `#fef3c7` track | **1.93:1** | fails (needs ≥ 3:1) |
| `fuel.DEFAULT` `#f59e0b` on white | **2.15:1** | fails as text or graphic |
| `fuel.dark` `#b45309` fill on `fuel.light` track | 4.49:1 | passes |
| `protein.dark` on `protein.light` | 5.29:1 | passes |
| `training.dark` on `training.light` | 5.96:1 | passes |
| `recovery.dark` on `recovery.light` | 5.07:1 | passes |
| `greenday.dark` on `greenday.light` | 4.88:1 | passes |

**Binding rule: fill = `dark`, track = `light`, label text = `dark`.** The `DEFAULT` mid-tones are
for large decorative fills only — never a bar fill, never text, never a 2px pace tick.

Overfill segment = `dark` at full opacity plus a subtle diagonal pattern — a *pattern*, not merely a
lighter tint, so it survives greyscale and colour-blind vision.

Everything else uses Tailwind's own scale. **No magic numbers:** bar height, gutter, sheet radius and
the 56px action all come from the spacing/radius scale.

---

## 6. Accessibility — specific, non-negotiable

- Each bar is `role="progressbar"` with `aria-valuenow` / `aria-valuemin` / `aria-valuemax` and an
  `aria-label` carrying real numbers: `"Fuel: 1,850 of 2,800 calories"`. A screen reader must get
  the state without seeing a colour.
- Completion is announced by **check glyph + text**, not hue. Meaning never lives in colour alone.
- Every tap target ≥ 44px: `+ Log` (56px), weigh-in card, entry rows, delete affordance, sheet close.
  Number inputs get a 44px min-height.
- Full keyboard path: Tab reaches weigh-in → each entry → `+ Log`. The sheet traps focus, `Esc`
  closes it, focus returns to the trigger.
- **Reduced motion:** `prefers-reduced-motion` makes bar fills and the green-day moment instant
  state changes. No transform, no confetti.
- Works at 200% zoom and with iOS Dynamic Type: the label/value row wraps *above* the bar rather
  than squeezing it. Bars must never clip or overlap their labels.
- The pace tick must not be the only signal of being behind — pair it with the numeric value.

---

## 7. The green-day moment

The single delight beat in slice 1. When the fourth bar completes:

- All four bars shift to `greenday` tones over **220ms**, staggered 40ms apart so it reads as a sweep.
- A centred card: "**Green day.**" plus the streak count. Auto-dismisses after 2s or on tap. It
  **never blocks** and never needs an OK button.
- Once per day. Re-opening Home later shows a calm persistent green header, not a re-celebration.
- Under `prefers-reduced-motion`: the card appears without animation and bars change colour instantly.

**The streak must not punish.** A broken streak shows `0` beside `best 12` — never a red zero, never
"you lost your streak". The number is information, not a verdict.

---

## 8. Motion

| Thing | Duration | Easing |
|---|---|---|
| Bar fill | 200ms | ease-out |
| Sheet in / out | 220ms | ease-out / ease-in |
| Green-day sweep | 220ms, 40ms stagger | ease-out |
| Button press | 120ms | ease-out |

Nothing blocks input. All of it disabled under `prefers-reduced-motion`.

---

## 9. Decisions — locked (CEO, 2026-10-26)

1. **Bars fill up from empty at midnight** — his words were "fill the bars". Not Sims-style draining
   from full: an empty bar is a to-do, a draining bar is a nag.
2. **Pace tick is IN.** ✅ Approved.
3. **All four bars ship in slice 1 with manual inputs** — Training = a "trained today?" tick,
   Recovery = hours slept. ✅ Approved. Green day works from day one; slice 3 swaps the tick for the
   prescribed session without changing the bar's contract.
4. **Overfill is celebrated with NO upper flag.** ✅ Approved, with the CEO's reasoning recorded:
   *"the focus is to move past those bars — as I want to gain weight I see it good to go beyond on the
   calories goal."* So there is deliberately **no 130% warning, no cap, no neutral note** — going over
   is simply a bigger win. **Do not add an upper bound later without a new decision.**
5. **Hours slept is asked at weigh-in**, not separately — one morning ritual, not two.

> **Note for slice 4 (the adaptive engine), not a change to decision 4:** because overfill is
> uncapped and encouraged, sustained large overages are a legitimate signal that true TDEE is higher
> than estimated — but the recalibration must not chase them into a runaway surplus. The PRD's
> 0.25–0.5 %bw/week rate cap is what bounds this, and it applies to the *computed target*, not to
> what he is allowed to eat on any given day. Keep those two ideas separate when building slice 4.

---

## 10. Out of scope for slice 1 — do not build

Food search · barcode · photo logging · saved meals · trend chart · training program · macro split
beyond kcal and protein · Health sync · settings screen · notifications · any image upload or storage.
