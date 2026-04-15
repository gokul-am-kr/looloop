'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'

function ActivateContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const code = searchParams.get('code') ?? ''

  const [status, setStatus] = useState<'loading' | 'success' | 'already' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const [expiresAt, setExpiresAt] = useState('')

  useEffect(() => {
    if (!code) { setStatus('error'); setMessage('No activation code found.'); return }

    async function activate() {
      const supabase = createBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push(`/auth?redirect=/activate?code=${code}`); return }

      const res = await fetch('/api/activate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ code }),
      })
      const data = await res.json()

      if (res.ok && data.success) {
        setExpiresAt(new Date(data.expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }))
        setStatus('success')
      } else if (res.ok && data.already) {
        setExpiresAt(new Date(data.expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }))
        setStatus('already')
      } else {
        setStatus('error')
        setMessage(data.error ?? 'Activation failed.')
      }
    }

    activate()
  }, [code, router])

  if (status === 'loading') {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-muted text-sm">Activating your journal…</p>
      </main>
    )
  }

  if (status === 'success' || status === 'already') {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-8">
        <div className="w-full max-w-sm text-center">
          <div className="text-6xl mb-6">🎉</div>
          <h1 className="text-white text-2xl font-bold">
            {status === 'already' ? 'Already activated' : 'Premium unlocked!'}
          </h1>
          <p className="text-muted text-sm mt-3 leading-relaxed">
            {status === 'already'
              ? `Your journal is already linked. Premium access runs until ${expiresAt}.`
              : `90 days of premium access is yours. Enjoy every feature until ${expiresAt}.`}
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-8 w-full rounded-2xl py-3.5 text-sm font-semibold text-black"
            style={{ background: 'var(--char-accent)' }}
          >
            Go to dashboard
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-8">
      <div className="w-full max-w-sm text-center">
        <div className="text-6xl mb-6">😕</div>
        <h1 className="text-white text-2xl font-bold">Activation failed</h1>
        <p className="text-muted text-sm mt-3">{message}</p>
        <button
          onClick={() => router.push('/dashboard')}
          className="glass-elevated mt-8 w-full rounded-2xl py-3.5 text-sm font-semibold text-muted"
        >
          Go to dashboard
        </button>
      </div>
    </main>
  )
}

export default function ActivatePage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-muted text-sm">Loading…</p>
      </main>
    }>
      <ActivateContent />
    </Suspense>
  )
}
