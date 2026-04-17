'use client'

import { useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null)

  const supabase = createBrowserClient()
  const isDev = process.env.NODE_ENV === 'development'

  async function handleDevLogin() {
    setLoading(true)
    setError(null)
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: 'gokulk975@gmail.com',
      password: 'devlocal123',
    })
    if (signInError) { setError(signInError.message) } else { window.location.href = '/dashboard' }
    setLoading(false)
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback` },
    })
    if (signInError) { setError(signInError.message) } else { setSubmitted(true) }
    setLoading(false)
  }

  async function handleOAuth(provider: 'google' | 'apple') {
    setOauthLoading(provider)
    setError(null)
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback` },
    })
    if (oauthError) { setError(oauthError.message); setOauthLoading(null) }
  }

  if (submitted) {
    return (
      <main className="flex min-h-screen items-center justify-center px-8">
        <div className="max-w-sm text-center">
          <div className="glass w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M3 8l7.89 5.26a2 2 0 0 0 2.22 0L21 8M5 19h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2z"
                stroke="#8E8E93" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="text-xl font-semibold text-white">Check your email</p>
          <p className="mt-2 text-sm text-muted leading-relaxed">
            We sent a magic link to <span className="text-white">{email}</span>
          </p>
        </div>
      </main>
    )
  }

  const busy = oauthLoading !== null || loading

  return (
    <main className="flex min-h-screen flex-col justify-between px-6 pt-20 pb-12">
      {/* Brand */}
      <div>
        <p className="text-[11px] font-medium tracking-widest text-muted uppercase">Looloop by Doo Doodle</p>
        <h1 className="mt-3 text-4xl font-bold text-white leading-tight tracking-tight">
          Close the<br />loop.
        </h1>
        <p className="mt-3 text-sm text-muted">Your 90-day habit &amp; sleep journal companion.</p>
      </div>

      {/* Sign-in options */}
      <div className="flex flex-col gap-3">
        {isDev && (
          <button
            type="button"
            onClick={handleDevLogin}
            disabled={busy}
            className="w-full rounded-2xl py-3 text-xs font-mono text-white border border-dashed disabled:opacity-40 active:opacity-70 cursor-pointer"
            style={{ borderColor: '#FF9F0A', color: '#FF9F0A', background: 'rgba(255,159,10,0.08)' }}
          >
            {loading ? 'Sending…' : 'Dev login — gokulk975@gmail.com'}
          </button>
        )}

        {/* Google — primary */}
        <button
          onClick={() => handleOAuth('google')}
          disabled={busy}
          className="glass flex w-full items-center justify-center gap-3 rounded-2xl py-3.5 text-sm font-semibold text-white disabled:opacity-40 transition-opacity"
        >
          <GoogleIcon />
          {oauthLoading === 'google' ? 'Redirecting…' : 'Continue with Google'}
        </button>

<div className="flex items-center gap-3 py-1">
          <div className="h-px flex-1" style={{ background: '#2C2C2E' }} />
          <span className="text-xs text-muted">or</span>
          <div className="h-px flex-1" style={{ background: '#2C2C2E' }} />
        </div>

        {/* Magic link */}
        <form onSubmit={handleMagicLink} className="flex flex-col gap-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="glass w-full rounded-2xl px-4 py-3.5 text-sm text-white placeholder:text-muted outline-none"
          />
          <button
            type="submit"
            disabled={busy}
            className="glass w-full rounded-2xl py-3.5 text-sm font-medium text-muted disabled:opacity-40 transition-opacity"
          >
            {loading ? 'Sending…' : 'Send magic link'}
          </button>
        </form>

        {error && <p className="text-sm text-center" style={{ color: '#FF453A' }}>{error}</p>}
      </div>
    </main>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853" />
      <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05" />
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 6.293C4.672 4.166 6.656 3.58 9 3.58z" fill="#EA4335" />
    </svg>
  )
}

function AppleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 814 1000" aria-hidden="true" fill="black">
      <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 380.8 31 298.7 31 218.1 31 94.3 104.1 29 176.1 29c65.9 0 120 45.8 164.9 45.8 42.5 0 109.1-49.7 181.6-49.7 32.3 0 128.3 5.1 198.5 101.4zm-234.9-206.3c30.1-35.9 51.9-86.7 51.9-137.4 0-7.2-.6-14.5-1.9-20.7-48.7 1.9-108.2 32.5-143.5 73.4-27.3 31.9-53.2 82.2-53.2 133.6 0 7.8 1.3 15.5 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 44.1 0 100.9-29.1 131.2-68.3z" />
    </svg>
  )
}
