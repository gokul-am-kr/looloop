'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import { computeStreak } from '@/lib/streak'
import { CompletionCertificate } from '@/components/ui/completion-certificate'
import { BottomNav } from '@/components/ui/bottom-nav'
import type { Edition } from '@/types'

const CHAR_EMOJI: Record<Edition, string> = { mochi: '🐱', pico: '🌵', jelli: '🪼', inko: '🐙' }
const CHAR_NAME:  Record<Edition, string> = {
  mochi: 'Mochi the Cat', pico: 'Pico the Cactus', jelli: 'Jelli the Jellyfish', inko: 'Inko the Octopus',
}

interface Stats {
  edition:        Edition
  totalHabits:    number
  daysLogged:     number
  bestStreak:     number
  totalTicks:     number
}

export default function CertificatePage() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }

      const [{ data: profile }, { data: habitLogs }, { data: scanLogs }] = await Promise.all([
        supabase.from('users').select('edition, habit_names').eq('id', user.id).single(),
        supabase.from('habit_logs').select('date, habits').eq('user_id', user.id).order('date', { ascending: false }),
        supabase.from('journal_scans').select('tick_count').eq('user_id', user.id),
      ])

      const edition      = (profile?.edition ?? 'mochi') as Edition
      const habitNames   = (profile?.habit_names ?? []) as string[]
      const dates        = (habitLogs ?? []).map(l => l.date)
      const bestStreak   = computeStreak(dates)

      // Count total ticks from habit logs
      let totalTicks = 0
      for (const log of habitLogs ?? []) {
        const habits = log.habits as Record<string, boolean>
        totalTicks += Object.values(habits).filter(Boolean).length
      }
      // Add scan-detected ticks
      for (const scan of scanLogs ?? []) totalTicks += scan.tick_count ?? 0

      setStats({
        edition,
        totalHabits:  habitNames.length,
        daysLogged:   (habitLogs ?? []).length,
        bestStreak,
        totalTicks,
      })
      setLoading(false)
    }
    load()
  }, [router])

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-muted text-sm">Building your certificate…</p>
      </main>
    )
  }

  if (!stats) return null

  const daysLogged    = stats.daysLogged
  const progressPct   = Math.round((daysLogged / 90) * 100)

  return (
    <main className="min-h-screen pb-36">
      <div className="px-5 pt-14">
        <h1 className="text-white text-2xl font-bold">Your Certificate</h1>
        <p className="text-muted text-sm mt-1">
          {daysLogged >= 90
            ? 'You closed the loop. All 90 days.'
            : `${progressPct}% there — keep going.`}
        </p>
      </div>

      <div className="px-5 mt-6">
        {daysLogged >= 90 ? (
          <CompletionCertificate
            charEmoji={CHAR_EMOJI[stats.edition]}
            charName={CHAR_NAME[stats.edition]}
            totalHabits={stats.totalHabits}
            totalDaysLogged={daysLogged}
            bestStreak={stats.bestStreak}
            totalTicks={stats.totalTicks}
          />
        ) : (
          <div className="glass rounded-2xl px-5 py-8 text-center">
            {/* Progress ring */}
            <svg width={120} height={120} viewBox="0 0 120 120" className="mx-auto">
              <circle cx={60} cy={60} r={52} fill="none" stroke="#2C2C2E" strokeWidth={8} />
              <circle cx={60} cy={60} r={52} fill="none" strokeWidth={8}
                style={{ stroke: 'var(--char-accent)' }}
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 52}
                strokeDashoffset={2 * Math.PI * 52 * (1 - progressPct / 100)}
                transform="rotate(-90 60 60)"
              />
              <text x={60} y={56} textAnchor="middle" fill="#fff" fontSize={22} fontWeight="700">{progressPct}%</text>
              <text x={60} y={72} textAnchor="middle" fill="#8E8E93" fontSize={10}>{daysLogged}/90 days</text>
            </svg>
            <p className="text-white font-semibold mt-5">Certificate locked</p>
            <p className="text-muted text-sm mt-2 leading-relaxed">
              Log {90 - daysLogged} more {90 - daysLogged === 1 ? 'day' : 'days'} to unlock your completion certificate.
            </p>
            <p className="text-2xl mt-4">{CHAR_EMOJI[stats.edition]}</p>
          </div>
        )}
      </div>

      <BottomNav />
    </main>
  )
}
