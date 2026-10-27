/**
 * Bar state and streaks — the game layer's maths, with no React in sight.
 *
 * Two deliberate behaviours here, both from docs/design-slice-1.md:
 *
 *  1. OVERFILL IS NOT CAPPED AND NOT A WARNING. Going past the Fuel target is
 *     the point of a gain app, so `overfillPercent` is reported as a positive
 *     signal and there is no upper bound or flag. (CEO decision, 2026-10-26 —
 *     do not add one without a new decision.)
 *
 *  2. AN INCOMPLETE TODAY NEVER BREAKS THE STREAK. At 7am nothing is logged, so
 *     a naive "consecutive green days ending today" would read 0 every morning
 *     — the exact daily guilt hit the design forbids. `currentStreak` counts
 *     back from yesterday until today actually goes green.
 */

export type BarKey = 'fuel' | 'protein' | 'training' | 'recovery'

export const BAR_ORDER: readonly BarKey[] = ['fuel', 'protein', 'training', 'recovery']

/**
 * The window in which eating realistically happens, as local hours. Used only
 * to place the pace tick — the marker showing where he should be by now.
 */
export const DAY_START_HOUR = 7
export const DAY_END_HOUR = 22

export interface BarState {
  key: BarKey
  value: number
  target: number
  /** Fill as a percentage of target, capped at 100 for the bar's own width. */
  fillPercent: number
  /** How far past target, as a % of target. 0 when at or under. Never capped. */
  overfillPercent: number
  complete: boolean
}

/**
 * Where the pace tick sits, as a % across the bar, for a given local time.
 *
 * Linear across the eating window: 0% before it opens, 100% after it closes.
 * Only meaningful for the accumulating bars (Fuel, Protein) — Training and
 * Recovery are single events, so the UI omits their tick.
 */
export function pacePercent(at: Date): number {
  const hours = at.getHours() + at.getMinutes() / 60
  if (hours <= DAY_START_HOUR) return 0
  if (hours >= DAY_END_HOUR) return 100
  return ((hours - DAY_START_HOUR) / (DAY_END_HOUR - DAY_START_HOUR)) * 100
}

export function computeBar(key: BarKey, value: number, target: number): BarState {
  const safeValue = Number.isFinite(value) && value > 0 ? value : 0
  const safeTarget = Number.isFinite(target) && target > 0 ? target : 0

  if (safeTarget === 0) {
    return { key, value: safeValue, target: 0, fillPercent: 0, overfillPercent: 0, complete: false }
  }

  const ratio = safeValue / safeTarget

  return {
    key,
    value: safeValue,
    target: safeTarget,
    fillPercent: Math.min(100, ratio * 100),
    overfillPercent: Math.max(0, (ratio - 1) * 100),
    complete: safeValue >= safeTarget,
  }
}

/** A green day is all four bars complete. Nothing partial counts. */
export function isGreenDay(bars: readonly BarState[]): boolean {
  return BAR_ORDER.every((key) => bars.find((bar) => bar.key === key)?.complete === true)
}

/**
 * A local-date key, `YYYY-MM-DD`.
 *
 * Built from local calendar parts on purpose. `toISOString().slice(0, 10)` is
 * the obvious one-liner and it is WRONG here: it yields the UTC date, so east
 * of Greenwich a late-evening entry files under tomorrow, and west of it an
 * early-morning weigh-in files under yesterday. "Today" must mean his today.
 */
export function toDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** The date key `days` before `from` — negative values step forward. */
export function shiftDateKey(from: Date, days: number): string {
  const shifted = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  shifted.setDate(shifted.getDate() - days)
  return toDateKey(shifted)
}

/**
 * The run of green days ending now.
 *
 * If today is already green it is included and counting starts there.
 * Otherwise counting starts at yesterday, so an unfinished day is simply not
 * yet counted rather than treated as a break. A day only breaks the streak once
 * it is over.
 */
export function currentStreak(greenDayKeys: Iterable<string>, now: Date = new Date()): number {
  const green = new Set(greenDayKeys)
  const todayIsGreen = green.has(toDateKey(now))

  let streak = 0
  let offset = todayIsGreen ? 0 : 1

  while (green.has(shiftDateKey(now, offset))) {
    streak += 1
    offset += 1
  }

  return streak
}

/**
 * The longest run of green days ever. Shown beside a broken streak so a zero
 * reads as information rather than a verdict.
 */
export function bestStreak(greenDayKeys: Iterable<string>): number {
  const keys = Array.from(new Set(greenDayKeys)).sort()
  if (keys.length === 0) return 0

  let best = 1
  let run = 1

  for (let i = 1; i < keys.length; i += 1) {
    const previous = new Date(`${keys[i - 1]}T00:00:00`)
    previous.setDate(previous.getDate() + 1)
    if (toDateKey(previous) === keys[i]) {
      run += 1
      best = Math.max(best, run)
    } else {
      run = 1
    }
  }

  return best
}
