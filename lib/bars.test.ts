import { describe, it, expect } from 'vitest'
import {
  BAR_ORDER,
  bestStreak,
  computeBar,
  currentStreak,
  isGreenDay,
  pacePercent,
  shiftDateKey,
  toDateKey,
} from './bars'

/** Local-midnight constructor — avoids the UTC parsing of `new Date('...Z')`. */
const local = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m - 1, d, h, min)

describe('computeBar', () => {
  it('fills proportionally below target', () => {
    const bar = computeBar('fuel', 1850, 2800)
    expect(bar.fillPercent).toBeCloseTo(66.07, 1)
    expect(bar.overfillPercent).toBe(0)
    expect(bar.complete).toBe(false)
  })

  it('completes exactly at target', () => {
    const bar = computeBar('protein', 125, 125)
    expect(bar.complete).toBe(true)
    expect(bar.fillPercent).toBe(100)
    expect(bar.overfillPercent).toBe(0)
  })

  it('reports overfill as a positive signal, never capped', () => {
    // The gain-app inversion: past target is a bigger win, not a warning.
    const bar = computeBar('fuel', 2910, 2800)
    expect(bar.complete).toBe(true)
    expect(bar.fillPercent).toBe(100)
    expect(bar.overfillPercent).toBeCloseTo(3.93, 1)
  })

  it('does not bound even an enormous overage', () => {
    const bar = computeBar('fuel', 8400, 2800)
    expect(bar.overfillPercent).toBeCloseTo(200, 6)
    expect(bar.complete).toBe(true)
  })

  it('keeps the bar width at 100% however large the overfill', () => {
    expect(computeBar('fuel', 99_999, 2800).fillPercent).toBe(100)
  })

  it('treats a zero or missing target as not-yet-configured rather than dividing by zero', () => {
    const bar = computeBar('fuel', 500, 0)
    expect(bar.fillPercent).toBe(0)
    expect(bar.complete).toBe(false)
    expect(Number.isNaN(bar.fillPercent)).toBe(false)
  })

  it('floors junk or negative values at zero', () => {
    expect(computeBar('fuel', -200, 2800).fillPercent).toBe(0)
    expect(computeBar('fuel', Number.NaN, 2800).fillPercent).toBe(0)
  })
})

describe('isGreenDay', () => {
  const bar = (key: 'fuel' | 'protein' | 'training' | 'recovery', done: boolean) =>
    computeBar(key, done ? 10 : 1, 10)

  it('is true only when all four bars are complete', () => {
    expect(isGreenDay(BAR_ORDER.map((k) => bar(k, true)))).toBe(true)
  })

  it('is false when any single bar is short', () => {
    for (const missing of BAR_ORDER) {
      const bars = BAR_ORDER.map((k) => bar(k, k !== missing))
      expect(isGreenDay(bars)).toBe(false)
    }
  })

  it('is false when a bar is absent entirely', () => {
    expect(isGreenDay([bar('fuel', true), bar('protein', true)])).toBe(false)
  })
})

describe('pacePercent', () => {
  it('is 0 before the eating window opens', () => {
    expect(pacePercent(local(2026, 10, 26, 5, 30))).toBe(0)
  })

  it('is near zero early in the morning, so an empty bar reads as "it is 7am"', () => {
    expect(pacePercent(local(2026, 10, 26, 7, 40))).toBeLessThan(10)
  })

  it('is high in the evening, so a half-empty bar reads as "move"', () => {
    expect(pacePercent(local(2026, 10, 26, 20, 10))).toBeCloseTo(87.8, 0)
  })

  it('is 100 once the window closes', () => {
    expect(pacePercent(local(2026, 10, 26, 23, 0))).toBe(100)
  })

  it('increases monotonically through the day', () => {
    let previous = -1
    for (let hour = 0; hour <= 23; hour += 1) {
      const value = pacePercent(local(2026, 10, 26, hour))
      expect(value).toBeGreaterThanOrEqual(previous)
      previous = value
    }
  })
})

describe('toDateKey', () => {
  it('formats as YYYY-MM-DD, zero-padded', () => {
    expect(toDateKey(local(2026, 1, 5))).toBe('2026-01-05')
  })

  it('uses the LOCAL calendar date, not the UTC one', () => {
    // The trap: toISOString().slice(0,10) on a late local evening east of
    // Greenwich reports tomorrow, filing the entry under the wrong day.
    const lateEvening = local(2026, 10, 26, 23, 30)
    expect(toDateKey(lateEvening)).toBe('2026-10-26')
  })

  it('uses the local date for an early-morning weigh-in too', () => {
    const earlyMorning = local(2026, 10, 26, 0, 20)
    expect(toDateKey(earlyMorning)).toBe('2026-10-26')
  })
})

describe('shiftDateKey', () => {
  it('steps back a day', () => {
    expect(shiftDateKey(local(2026, 10, 26), 1)).toBe('2026-10-25')
  })

  it('crosses a month boundary', () => {
    expect(shiftDateKey(local(2026, 11, 1), 1)).toBe('2026-10-31')
  })

  it('crosses a year boundary', () => {
    expect(shiftDateKey(local(2026, 1, 1), 1)).toBe('2025-12-31')
  })

  it('handles a leap day', () => {
    expect(shiftDateKey(local(2028, 3, 1), 1)).toBe('2028-02-29')
  })
})

describe('currentStreak', () => {
  const now = local(2026, 10, 26, 9, 0)

  it('counts today when today is already green', () => {
    expect(currentStreak(['2026-10-26', '2026-10-25', '2026-10-24'], now)).toBe(3)
  })

  it('does NOT reset to zero just because today is unfinished', () => {
    // The morning-guilt bug. At 9am nothing is logged; the run ending
    // yesterday must still show.
    expect(currentStreak(['2026-10-25', '2026-10-24', '2026-10-23'], now)).toBe(3)
  })

  it('is zero when yesterday was missed and today is not green yet', () => {
    expect(currentStreak(['2026-10-24', '2026-10-23'], now)).toBe(0)
  })

  it('still counts today when today is green but yesterday was missed', () => {
    expect(currentStreak(['2026-10-26'], now)).toBe(1)
  })

  it('stops at the first gap', () => {
    expect(currentStreak(['2026-10-25', '2026-10-24', '2026-10-22'], now)).toBe(2)
  })

  it('is zero for no history at all', () => {
    expect(currentStreak([], now)).toBe(0)
  })

  it('ignores duplicate keys', () => {
    expect(currentStreak(['2026-10-25', '2026-10-25', '2026-10-24'], now)).toBe(2)
  })
})

describe('bestStreak', () => {
  it('finds the longest run, not the most recent', () => {
    const days = [
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
      '2026-10-04',
      '2026-10-20',
      '2026-10-21',
    ]
    expect(bestStreak(days)).toBe(4)
  })

  it('is 1 for a single green day', () => {
    expect(bestStreak(['2026-10-26'])).toBe(1)
  })

  it('is 0 for no green days', () => {
    expect(bestStreak([])).toBe(0)
  })

  it('does not depend on input order', () => {
    expect(bestStreak(['2026-10-03', '2026-10-01', '2026-10-02'])).toBe(3)
  })

  it('counts a run that spans a month boundary', () => {
    expect(bestStreak(['2026-10-30', '2026-10-31', '2026-11-01'])).toBe(3)
  })

  it('is at least the current streak, so a 0 current can sit beside a real best', () => {
    const days = ['2026-10-01', '2026-10-02', '2026-10-03']
    const now = local(2026, 10, 26, 9, 0)
    expect(currentStreak(days, now)).toBe(0)
    expect(bestStreak(days)).toBe(3)
  })
})
