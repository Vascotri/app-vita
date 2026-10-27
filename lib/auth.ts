import type { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'

/**
 * Google sign-in, for exactly one person.
 *
 * Deliberately much thinner than app-lime's equivalent. That app needs
 * server-side Google Calendar access, so it asks for calendar scopes,
 * `access_type: offline` and a forced consent screen to obtain a refresh token,
 * then persists those tokens. Vita needs none of that — the only question it
 * asks Google is "is this Vasco?". Carrying over the refresh-token machinery
 * would be cargo-culting, and every extra scope is a permission we'd be asking
 * for and not using.
 *
 * The allowed address lives in the environment, NOT in the source: this repo is
 * public (Vercel Hobby won't deploy private org repos), and a hardcoded address
 * in a public repo is free food for scrapers.
 */

/** Read at call time, not module load, so a missing value can't be baked into a build. */
function allowedEmails(): string[] {
  return (process.env.VITA_ALLOWED_EMAIL ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.length > 0)
}

/**
 * Is this address allowed in?
 *
 * **Fails closed.** With `VITA_ALLOWED_EMAIL` unset the list is empty and
 * nobody gets in — including the owner. A misconfigured deploy must lock us
 * out, never open his weight and eating history to whoever finds the URL.
 */
export function isAllowedEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return allowedEmails().includes(email.trim().toLowerCase())
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      // Default scopes only (openid, email, profile). No calendar, no offline
      // access — we want identity and nothing more.
    }),
  ],
  session: {
    strategy: 'jwt',
    // A habit app is opened several times a day; being bounced to a sign-in
    // screen is friction on the one action we are trying to make effortless.
    maxAge: 60 * 60 * 24 * 90,
  },
  callbacks: {
    async signIn({ user }) {
      return isAllowedEmail(user.email)
    },
    async jwt({ token }) {
      return token
    },
    async session({ session }) {
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
}
