'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import { formatINR } from '@/lib/utils'
import { BottomNav } from '@/components/ui/bottom-nav'

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => { open(): void }
  }
}

interface RazorpayOptions {
  key:           string
  amount:        number
  currency:      string
  name:          string
  description:   string
  prefill:       { email: string }
  notes:         { user_id: string }
  theme:         { color: string }
  handler:       (response: { razorpay_payment_id: string }) => void
}

const AMOUNT_PAISE = 9900

const PERKS = [
  'Unlimited journal scans',
  'Full character dialogue — no daily cap',
  'Weekly sleep score cards',
  '90-day completion certificate',
  'Advanced sleep insights',
]

export default function UpgradePage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [userId, setUserId]     = useState('')
  const [loading, setLoading]   = useState(true)
  const [isPremium, setIsPremium] = useState(false)
  const [premiumUntil, setPremiumUntil] = useState('')

  useEffect(() => {
    async function load() {
      const supabase = createBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      setEmail(user.email ?? '')
      setUserId(user.id)

      const { data } = await supabase
        .from('premium_access')
        .select('expires_at')
        .eq('user_id', user.id)
        .gt('expires_at', new Date().toISOString())
        .order('expires_at', { ascending: false })
        .limit(1)
        .single()

      if (data) {
        setIsPremium(true)
        setPremiumUntil(new Date(data.expires_at).toLocaleDateString('en-IN', {
          day: 'numeric', month: 'long', year: 'numeric',
        }))
      }
      setLoading(false)
    }
    load()
  }, [router])

  function loadRazorpay(): Promise<void> {
    return new Promise(resolve => {
      if (window.Razorpay) { resolve(); return }
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.onload = () => resolve()
      document.body.appendChild(script)
    })
  }

  async function handleCheckout() {
    await loadRazorpay()
    const options: RazorpayOptions = {
      key:         process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? '',
      amount:      AMOUNT_PAISE,
      currency:    'INR',
      name:        'Looloop by Doo Doodle',
      description: 'Premium — 1 month',
      prefill:     { email },
      notes:       { user_id: userId },
      theme:       { color: 'var(--char-accent)' },
      handler:     () => { router.push('/dashboard?upgraded=1') },
    }
    new window.Razorpay(options).open()
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-sm" style={{ color: '#636366' }}>Loading…</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen pb-28">
      <div className="px-5 pt-14 mb-8">
        <h1 className="text-white text-2xl font-bold">Go Premium</h1>
        <p className="text-sm mt-1" style={{ color: '#636366' }}>Unlock the full Looloop experience.</p>
      </div>

      <div className="px-5 flex flex-col gap-3">
        {isPremium ? (
          <div className="glass rounded-2xl px-5 py-8 text-center">
            <div className="text-4xl mb-3">🎉</div>
            <p className="text-white font-semibold">You&apos;re already premium</p>
            <p className="text-sm mt-1" style={{ color: '#636366' }}>Access runs until {premiumUntil}</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="glass-elevated mt-6 w-full rounded-2xl py-3 text-sm font-medium"
              style={{ color: '#8E8E93' }}
            >
              Back to dashboard
            </button>
          </div>
        ) : (
          <>
            {/* Pricing card */}
            <div className="glass rounded-2xl px-5 py-6">
              <div className="flex items-baseline gap-1 mb-1">
                <p className="text-white text-4xl font-bold">{formatINR(99)}</p>
                <p className="text-sm" style={{ color: '#636366' }}>/month</p>
              </div>
              <p className="text-xs mb-6" style={{ color: '#636366' }}>Cancel anytime</p>

              <div className="flex flex-col gap-3">
                {PERKS.map(perk => (
                  <div key={perk} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: 'var(--char-accent10)' }}>
                      <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                        <path d="M1.5 5l2.5 2.5L8.5 2" strokeWidth="1.5"
                          strokeLinecap="round" strokeLinejoin="round"
                          style={{ stroke: 'var(--char-accent)' }} />
                      </svg>
                    </div>
                    <p className="text-sm text-white">{perk}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Journal note */}
            <div className="glass rounded-2xl px-4 py-3.5">
              <p className="text-sm" style={{ color: '#636366' }}>
                Got the journal? Scan the QR code inside to get{' '}
                <span className="text-white font-medium">3 months free</span> — no card needed.
              </p>
            </div>

            <button
              onClick={handleCheckout}
              className="w-full rounded-2xl py-3.5 text-sm font-semibold text-black"
              style={{ background: 'var(--char-accent)' }}
            >
              Upgrade for {formatINR(99)}/month
            </button>
          </>
        )}
      </div>

      <BottomNav />
    </main>
  )
}
