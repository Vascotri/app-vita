import { Suspense } from 'react'
import LoginForm from './LoginForm'

/**
 * `useSearchParams` in LoginForm needs a Suspense boundary, otherwise Next
 * bails out of static rendering for this route at build time.
 */
export default function LoginPage() {
  return (
    <main className="grid min-h-[100dvh] place-items-center px-4 py-10">
      <Suspense fallback={<div className="w-full max-w-sm" aria-hidden="true" />}>
        <LoginForm />
      </Suspense>
    </main>
  )
}
