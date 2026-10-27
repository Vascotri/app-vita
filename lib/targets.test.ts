import { describe, it, expect } from 'vitest'
import {
  ACTIVITY_FACTORS,
  GAIN_RATE_OPTIONS,
  MAX_GAIN_RATE_PCT,
  MIN_GAIN_RATE_PCT,
  bmrMifflinStJeor,
  clampGainRate,
  computeTargets,
  dailySurplus,
  projectedGoalDate,
  proteinTargetG,
  tdee,
  type Profile,
} from './targets'

/** The CEO's actual starting profile — the regression anchor for this whole module. */
const CEO: Profile = {
  ageYears: 30,
  heightCm: 183,
  weightKg: 62,
  sex: 'male',
  activity: 'moderate',
  gainRatePctPerWeek: 0.4,
}

describe('bmrMifflinStJeor', () => {
  it('matches the hand-computed value for the CEO profile', () => {
    // 10(62) + 6.25(183) - 5(30) + 5 = 620 + 1143.75 - 150 + 5
    expect(bmrMifflinStJeor(CEO)).toBeCloseTo(1618.75, 2)
  })

  it('applies the female constant instead of the male one', () => {
    expect(bmrMifflinStJeor({ ...CEO, sex: 'female' })).toBeCloseTo(1452.75, 2)
  })

  it('falls as age rises, all else equal', () => {
    const younger = bmrMifflinStJeor({ ...CEO, ageYears: 25 })
    const older = bmrMifflinStJeor({ ...CEO, ageYears: 45 })
    expect(younger).toBeGreaterThan(older)
    // -5 kcal per year
    expect(younger - older).toBeCloseTo(100, 6)
  })
})

describe('tdee', () => {
  it('multiplies BMR by the activity factor', () => {
    expect(tdee(CEO)).toBeCloseTo(1618.75 * 1.55, 6)
  })

  it('rises monotonically across the four activity levels', () => {
    const levels = ['sedentary', 'light', 'moderate', 'active'] as const
    const values = levels.map((activity) => tdee({ ...CEO, activity }))
    for (let i = 1; i < values.length; i += 1) {
      expect(values[i]).toBeGreaterThan(values[i - 1])
    }
  })

  it('has a sedentary factor of 1.2 and an active factor of 1.725', () => {
    expect(ACTIVITY_FACTORS.sedentary).toBe(1.2)
    expect(ACTIVITY_FACTORS.active).toBe(1.725)
  })
})

describe('clampGainRate', () => {
  it('passes an in-range rate through', () => {
    expect(clampGainRate(0.4)).toBe(0.4)
  })

  it('clamps an over-ambitious rate down to the cap', () => {
    // The guard against a lean bulk quietly becoming a fat one.
    expect(clampGainRate(2)).toBe(MAX_GAIN_RATE_PCT)
  })

  it('clamps a pointlessly slow rate up to the floor', () => {
    expect(clampGainRate(0.01)).toBe(MIN_GAIN_RATE_PCT)
  })

  it('falls back to the floor for junk input rather than producing NaN targets', () => {
    expect(clampGainRate(Number.NaN)).toBe(MIN_GAIN_RATE_PCT)
    expect(clampGainRate(Number.POSITIVE_INFINITY)).toBe(MIN_GAIN_RATE_PCT)
  })

  it('offers only rates inside the cap at setup', () => {
    for (const rate of GAIN_RATE_OPTIONS) {
      expect(clampGainRate(rate)).toBe(rate)
    }
  })
})

describe('dailySurplus', () => {
  it('derives the daily surplus from %bw/week via 7700 kcal/kg', () => {
    // 62kg x 0.4% = 0.248 kg/wk -> x7700 = 1909.6 kcal/wk -> /7
    expect(dailySurplus(62, 0.4)).toBeCloseTo(272.8, 1)
  })

  it('scales with bodyweight at a fixed rate', () => {
    expect(dailySurplus(80, 0.4)).toBeGreaterThan(dailySurplus(62, 0.4))
  })

  it('respects the rate cap rather than honouring a reckless request', () => {
    expect(dailySurplus(62, 5)).toBeCloseTo(dailySurplus(62, MAX_GAIN_RATE_PCT), 6)
  })
})

describe('proteinTargetG', () => {
  it('uses 2.0 g/kg of current bodyweight', () => {
    expect(proteinTargetG(62)).toBeCloseTo(124, 6)
  })

  it('sits inside the 1.6-2.2 g/kg evidence range', () => {
    const perKg = proteinTargetG(62) / 62
    expect(perKg).toBeGreaterThanOrEqual(1.6)
    expect(perKg).toBeLessThanOrEqual(2.2)
  })
})

describe('computeTargets', () => {
  it('produces the headline numbers quoted to the CEO', () => {
    const t = computeTargets(CEO)
    expect(t.bmr).toBe(1619)
    expect(t.tdee).toBe(2509)
    expect(t.surplus).toBe(273)
    expect(t.kcal).toBe(2780)
    expect(t.proteinG).toBe(125)
    expect(t.gramsPerWeek).toBe(248)
  })

  it('lands inside the 2700-2900 kcal band across every offered pace', () => {
    // This band is what was promised in the PRD; if a constant drifts, this fails.
    for (const gainRatePctPerWeek of GAIN_RATE_OPTIONS) {
      const { kcal } = computeTargets({ ...CEO, gainRatePctPerWeek })
      expect(kcal).toBeGreaterThanOrEqual(2650)
      expect(kcal).toBeLessThanOrEqual(2900)
    }
  })

  it('never returns a target below TDEE — this is a gain app', () => {
    const levels = ['sedentary', 'light', 'moderate', 'active'] as const
    for (const activity of levels) {
      const t = computeTargets({ ...CEO, activity })
      expect(t.kcal).toBeGreaterThan(t.tdee)
      expect(t.surplus).toBeGreaterThan(0)
    }
  })

  it('raises kcal monotonically as the pace increases', () => {
    const slow = computeTargets({ ...CEO, gainRatePctPerWeek: 0.25 })
    const mid = computeTargets({ ...CEO, gainRatePctPerWeek: 0.4 })
    const fast = computeTargets({ ...CEO, gainRatePctPerWeek: 0.5 })
    expect(mid.kcal).toBeGreaterThan(slow.kcal)
    expect(fast.kcal).toBeGreaterThan(mid.kcal)
  })

  it('reports the clamped rate it actually used, not the one requested', () => {
    const t = computeTargets({ ...CEO, gainRatePctPerWeek: 3 })
    expect(t.gainRatePctPerWeek).toBe(MAX_GAIN_RATE_PCT)
  })

  it('rounds kcal to the nearest 10 and protein to the nearest 5', () => {
    const t = computeTargets(CEO)
    expect(t.kcal % 10).toBe(0)
    expect(t.proteinG % 5).toBe(0)
  })

  it('surfaces the activity factor so the maths screen can show the working', () => {
    expect(computeTargets(CEO).activityFactor).toBe(1.55)
  })
})

describe('weeksToGoal / projectedGoalDate', () => {
  it('reaches 70kg from 62kg in 31 weeks at 0.4%/week', () => {
    const date = projectedGoalDate(62, 70, 0.4, new Date('2026-10-26T00:00:00Z'))
    expect(date).not.toBeNull()
    const days = Math.round(
      (date!.getTime() - new Date('2026-10-26T00:00:00Z').getTime()) / 86_400_000,
    )
    expect(days).toBe(31 * 7)
  })

  it('compounds rather than extrapolating linearly', () => {
    // Linear would be (70-62)/(62*0.004) = 32.3 -> 33 weeks. Compounding gets
    // there sooner because each week's gain is a % of a HIGHER bodyweight.
    const date = projectedGoalDate(62, 70, 0.4, new Date('2026-10-26T00:00:00Z'))
    const weeks = Math.round(
      (date!.getTime() - new Date('2026-10-26T00:00:00Z').getTime()) / 86_400_000 / 7,
    )
    expect(weeks).toBeLessThan(33)
  })

  it('gets there sooner at a faster pace', () => {
    const from = new Date('2026-10-26T00:00:00Z')
    const slow = projectedGoalDate(62, 70, 0.25, from)!
    const fast = projectedGoalDate(62, 70, 0.5, from)!
    expect(fast.getTime()).toBeLessThan(slow.getTime())
  })

  it('returns null when the goal is at or below current weight', () => {
    expect(projectedGoalDate(62, 62, 0.4)).toBeNull()
    expect(projectedGoalDate(62, 60, 0.4)).toBeNull()
  })

  it('does not mutate the date it was handed', () => {
    const from = new Date('2026-10-26T00:00:00Z')
    const before = from.getTime()
    projectedGoalDate(62, 70, 0.4, from)
    expect(from.getTime()).toBe(before)
  })
})
