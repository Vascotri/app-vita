'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'

/**
 * The only public screen in the app.
 *
 * Two designed states beyond the default: `pending` while Google takes over,
 * and the access-denied case — which is not an error in the app but somebody
 * who is not the owner trying the URL. It says so plainly rather than
 * pretending something broke.
 */
export default function LoginForm() {
  const params = useSearchParams()
  const [pending, setPending] = useState(false)

  const error = params.get('error')
  const denied = error === 'AccessDenied'

  return (
    <div className="w-full max-w-sm">
      <h1 className="m-0 text-2xl font-semibold text-neutral-900">Vita</h1>
      <p className="mt-1 text-sm text-neutral-600">Fill the bars. Every day.</p>

      {denied ? (
        <p
          role="alert"
          className="mt-6 rounded-lg bg-neutral-100 px-4 py-3 text-sm text-neutral-700"
        >
          That account doesn&apos;t have access. Vita is a single-person app.
        </p>
      ) : null}

      {error && !denied ? (
        <p
          role="alert"
          className="mt-6 rounded-lg bg-neutral-100 px-4 py-3 text-sm text-neutral-700"
        >
          Sign-in didn&apos;t complete. Try again.
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => {
          setPending(true)
          void signIn('google', { callbackUrl: '/' })
        }}
        disabled={pending}
        className="mt-8 flex min-h-[56px] w-full items-center justify-center rounded-xl bg-neutral-900 px-4 text-base font-medium text-white transition-opacity duration-150 disabled:opacity-60"
      >
        {pending ? 'Opening Google…' : 'Continue with Google'}
      </button>

      <p className="mt-6 text-xs leading-relaxed text-neutral-500">
        Vita isn&apos;t medical advice. Persistent underweight despite normal eating is worth a GP
        visit and bloodwork.
      </p>
    </div>
  )
}
