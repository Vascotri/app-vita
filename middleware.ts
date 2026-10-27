import { withAuth } from 'next-auth/middleware'

/**
 * Everything is private except the login page itself.
 *
 * `withAuth` with an explicit `pages.signIn` rather than the bare
 * `export { default } from 'next-auth/middleware'`: the default sends an
 * unauthenticated visitor to next-auth's own `/api/auth/signin` scaffold, which
 * is not the designed login screen.
 */
export default withAuth({
  pages: { signIn: '/login' },
})

export const config = {
  /**
   * Guard page routes only.
   *
   * `/api/*` is excluded deliberately. next-auth's middleware answers an
   * unauthenticated request with a 307 to the HTML login page, so a `fetch`
   * from the app would follow the redirect and then choke parsing HTML as JSON
   * — surfacing as a baffling error instead of an honest "not signed in".
   * Every API handler checks the session itself and returns a JSON 401, so
   * excluding them here costs no protection and gives clients a truthful
   * status code. (Learning carried over from app-lime.)
   */
  matcher: ['/((?!api|login|_next/static|_next/image|favicon.ico).*)'],
}
