/**
 * The target engine: profile in, daily kcal + protein out, with the working shown.
 *
 * Vita is a GAIN app. Everything here points one way — toward a surplus — and the
 * only thing that bounds it is the weekly rate cap. See docs/prd-v1.md §Scope and
 * docs/design-slice-1.md §0.
 *
 * `computeTargets` deliberately returns every intermediate step, not just the
 * final numbers: the setup flow ends on a "here's the maths" screen, and showing
 * the derivation is what buys trust in the weekly recalibration later (slice 4).
 */

export type Sex = 'male' | 'female'

/**
 * Plain-language activity levels. The labels live in the UI; these are the
 * Harris-Benedict style multipliers applied to BMR to get TDEE.
 */
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active'

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
}

/**
 * Energy per kg of body mass gained. 7700 kcal/kg is the conventional figure.
 * It is an approximation — real lean-vs-fat partitioning varies — which is
 * exactly why slice 4 recalibrates from the observed weight trend rather than
 * trusting this number forever.
 */
export const KCAL_PER_KG = 7700

/** Protein for muscle gain. 1.6-2.2 g/kg is the evidence range; 2.0 is our default. */
export const PROTEIN_G_PER_KG = 2.0

/**
 * The rate cap, in % of bodyweight per week. Below this a bulk is pointless;
 * above it the surplus is mostly fat. PRD-mandated — do not widen without a
 * product decision.
 */
export const MIN_GAIN_RATE_PCT = 0.25
export const MAX_GAIN_RATE_PCT = 0.5

/** The three paces offered at setup. */
export const GAIN_RATE_OPTIONS = [0.25, 0.4, 0.5] as const

export interface Profile {
  ageYears: number
  heightCm: number
  weightKg: number
  sex: Sex
  activity: ActivityLevel
  /** % of bodyweight per week. Clamped to the cap before use. */
  gainRatePctPerWeek: number
}

export interface Targets {
  /** Basal metabolic rate, kcal/day. */
  bmr: number
  /** Total daily energy expenditure — BMR x activity factor, kcal/day. */
  tdee: number
  /** The activity factor actually applied, so the UI can show it. */
  activityFactor: number
  /** Daily surplus on top of TDEE, kcal/day. */
  surplus: number
  /** The rate used after clamping — may differ from what was asked for. */
  gainRatePctPerWeek: number
  /** Expected gain in grams per week at this rate. */
  gramsPerWeek: number
  /** The headline number: kcal/day to eat, rounded to the nearest 10. */
  kcal: number
  /** Protein target in grams/day, rounded to the nearest 5. */
  proteinG: number
}

/** Clamp a requested rate into the sane-bulk window. */
export function clampGainRate(ratePctPerWeek: number): number {
  if (!Number.isFinite(ratePctPerWeek)) return MIN_GAIN_RATE_PCT
  return Math.min(MAX_GAIN_RATE_PCT, Math.max(MIN_GAIN_RATE_PCT, ratePctPerWeek))
}

/**
 * Mifflin-St Jeor — the best-validated BMR estimator for the general population,
 * and the one most calculators he might cross-check against use.
 */
export function bmrMifflinStJeor(profile: Profile): number {
  const { weightKg, heightCm, ageYears, sex } = profile
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears
  return base + (sex === 'male' ? 5 : -161)
}

export function tdee(profile: Profile): number {
  return bmrMifflinStJeor(profile) * ACTIVITY_FACTORS[profile.activity]
}

/** Daily kcal surplus required to gain at `ratePctPerWeek` for a given bodyweight. */
export function dailySurplus(weightKg: number, ratePctPerWeek: number): number {
  const kgPerWeek = weightKg * (clampGainRate(ratePctPerWeek) / 100)
  return (kgPerWeek * KCAL_PER_KG) / 7
}

/**
 * Protein scales off CURRENT bodyweight, not goal weight. As he gains, this
 * rises with him — self-correcting, and it avoids prescribing an intimidating
 * number on day one.
 */
export function proteinTargetG(weightKg: number): number {
  return weightKg * PROTEIN_G_PER_KG
}

export function computeTargets(profile: Profile): Targets {
  const gainRatePctPerWeek = clampGainRate(profile.gainRatePctPerWeek)
  const bmr = bmrMifflinStJeor(profile)
  const activityFactor = ACTIVITY_FACTORS[profile.activity]
  const total = bmr * activityFactor
  const surplus = dailySurplus(profile.weightKg, gainRatePctPerWeek)

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(total),
    activityFactor,
    surplus: Math.round(surplus),
    gainRatePctPerWeek,
    gramsPerWeek: Math.round(profile.weightKg * (gainRatePctPerWeek / 100) * 1000),
    kcal: Math.round((total + surplus) / 10) * 10,
    proteinG: Math.round(proteinTargetG(profile.weightKg) / 5) * 5,
  }
}

/**
 * Weeks to reach `goalKg`, stepping a week at a time.
 *
 * Iterative rather than a single division because the weekly gain is a
 * PERCENTAGE of bodyweight — so it grows as he does, and a linear estimate
 * would overstate the time. Returns null if the goal is unreachable upward
 * (already there, or below current weight).
 */
export function weeksToGoal(
  currentKg: number,
  goalKg: number,
  ratePctPerWeek: number,
  maxWeeks = 520,
): number | null {
  if (!(goalKg > currentKg)) return null

  const rate = clampGainRate(ratePctPerWeek) / 100
  let weight = currentKg
  let weeks = 0

  while (weight < goalKg && weeks < maxWeeks) {
    weight += weight * rate
    weeks += 1
  }

  return weight >= goalKg ? weeks : null
}

/** The date he reaches `goalKg` at this pace, for the setup pace screen. */
export function projectedGoalDate(
  currentKg: number,
  goalKg: number,
  ratePctPerWeek: number,
  from: Date = new Date(),
): Date | null {
  const weeks = weeksToGoal(currentKg, goalKg, ratePctPerWeek)
  if (weeks === null) return null

  const date = new Date(from.getTime())
  date.setDate(date.getDate() + weeks * 7)
  return date
}
