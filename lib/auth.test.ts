import { describe, it, expect, afterEach } from 'vitest'
import { isAllowedEmail } from './auth'

const ORIGINAL = process.env.VITA_ALLOWED_EMAIL

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.VITA_ALLOWED_EMAIL
  else process.env.VITA_ALLOWED_EMAIL = ORIGINAL
})

describe('isAllowedEmail', () => {
  it('admits the configured address', () => {
    process.env.VITA_ALLOWED_EMAIL = 'owner@example.com'
    expect(isAllowedEmail('owner@example.com')).toBe(true)
  })

  it('rejects anybody else', () => {
    process.env.VITA_ALLOWED_EMAIL = 'owner@example.com'
    expect(isAllowedEmail('stranger@example.com')).toBe(false)
  })

  it('FAILS CLOSED when the variable is missing', () => {
    // A misconfigured deploy must lock everyone out rather than expose his
    // weight and eating history on a public URL.
    delete process.env.VITA_ALLOWED_EMAIL
    expect(isAllowedEmail('owner@example.com')).toBe(false)
  })

  it('fails closed when the variable is empty or whitespace', () => {
    process.env.VITA_ALLOWED_EMAIL = '   '
    expect(isAllowedEmail('owner@example.com')).toBe(false)
  })

  it('rejects a null or undefined email from the provider', () => {
    process.env.VITA_ALLOWED_EMAIL = 'owner@example.com'
    expect(isAllowedEmail(null)).toBe(false)
    expect(isAllowedEmail(undefined)).toBe(false)
    expect(isAllowedEmail('')).toBe(false)
  })

  it('is case-insensitive, since Google may return a different casing', () => {
    process.env.VITA_ALLOWED_EMAIL = 'Owner@Example.com'
    expect(isAllowedEmail('owner@example.com')).toBe(true)
    expect(isAllowedEmail('OWNER@EXAMPLE.COM')).toBe(true)
  })

  it('tolerates whitespace around the configured value', () => {
    process.env.VITA_ALLOWED_EMAIL = '  owner@example.com  '
    expect(isAllowedEmail('owner@example.com')).toBe(true)
  })

  it('supports a comma-separated list, should a second person ever be added', () => {
    process.env.VITA_ALLOWED_EMAIL = 'owner@example.com, other@example.com'
    expect(isAllowedEmail('other@example.com')).toBe(true)
    expect(isAllowedEmail('nope@example.com')).toBe(false)
  })

  it('does not admit a substring or lookalike address', () => {
    process.env.VITA_ALLOWED_EMAIL = 'owner@example.com'
    expect(isAllowedEmail('owner@example.com.attacker.net')).toBe(false)
    expect(isAllowedEmail('notowner@example.com')).toBe(false)
  })

  it('reads the environment at call time, not at module load', () => {
    // So a value set after import still applies — and so a missing value can't
    // be baked into a build artifact.
    delete process.env.VITA_ALLOWED_EMAIL
    expect(isAllowedEmail('late@example.com')).toBe(false)
    process.env.VITA_ALLOWED_EMAIL = 'late@example.com'
    expect(isAllowedEmail('late@example.com')).toBe(true)
  })
})
