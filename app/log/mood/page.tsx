'use client'

// Mood log page — daily mood picker (1–5 scale).
// Requires Supabase table:
//   create table mood_logs (
//     id uuid default gen_random_uuid() primary key,
//     user_id uuid references auth.users not null,
//     date date not null,
//     mood integer not null check (mood between 1 and 5),
//     note text,
//     created_at timestamptz default now(),
//     unique(user_id, date)
//   );
//   alter table mood_logs enable row level security;
//   create policy "own mood logs" on mood_logs
//     using (auth.uid() = user_id) with check (auth.uid() = user_id);

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import { BottomNav } from '@/components/ui/bottom-nav'
import { MOOD_COLORS, MOOD_EMOJI, MOOD_LABELS } from '@/components/ui/radial-mood-chart'

function MoodLogContent() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const dateParam    = searchParams.get('date')

  const today = new Date().toISOString().split('T')[0]
  const date  = dateParam ?? today

  const dateLabel = new Date(date + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  const [mood, setMood]       = useState<number>(0)
  const [note, setNote]       = useState('')
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [loading, setLoading] = useState(true)

  const supabase = useRef(createBrowserClient()).current

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }

      const { data } = await supabase
        .from('mood_logs')
        .select('mood, note')
        .eq('user_id', user.id)
        .eq('date', date)
        .maybeSingle()

      if (data) {
        setMood(data.mood ?? 0)
        setNote(data.note ?? '')
        setSaved(true)
      }
      setLoading(false)
    }
    load()
  }, [date, supabase, router])

  async function save() {
    if (mood === 0) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('mood_logs').upsert(
      { user_id: user.id, date, mood, note: note.trim() || null },
      { onConflict: 'user_id,date' },
    )
    setSaving(false)
    setSaved(true)
    setTimeout(() => router.back(), 600)
  }

  const moodColor = mood > 0 ? MOOD_COLORS[mood] : 'rgba(255,255,255,0.15)'
  const moodGlow  = mood > 0 ? `${MOOD_COLORS[mood]}55` : 'rgba(255,255,255,0.05)'

  return (
    <main className="min-h-screen pb-36" style={{ background: 'var(--bg)', overflow: 'clip', position: 'relative' }}>
      {/* Background orbs */}
      <div style={{ position: 'absolute', zIndex: 0, width: 300, height: 300, borderRadius: '50%', background: 'var(--orb1-color)', opacity: 0.60, filter: 'blur(90px)', top: -90, left: -80, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', zIndex: 0, width: 240, height: 240, borderRadius: '50%', background: 'var(--orb2-color)', opacity: 0.45, filter: 'blur(75px)', top: 140, right: -70, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', zIndex: 0, width: 240, height: 240, borderRadius: '50%', background: 'var(--orb3-color)', opacity: 0.25, filter: 'blur(100px)', bottom: 60, left: -20, pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
      {/* Header */}
      <div className="px-5 pt-14 flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} style={{ color: 'rgba(255,255,255,0.35)' }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div>
          <h1 className="text-white text-xl font-bold">How are you feeling?</h1>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.40)' }}>{dateLabel}</p>
        </div>
      </div>

      {/* Circular mood card */}
      <div className="flex flex-col items-center mb-6">
        <div style={{ filter: `drop-shadow(0 24px 64px rgba(0,0,0,0.75)) drop-shadow(0 0 32px ${moodGlow})` }}>
          <div style={{
            width: 220,
            height: 220,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 40% 35%, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.05) 40%, rgba(255,255,255,0.01) 100%)',
            borderTop: '0.5px solid rgba(255,255,255,0.22)',
            borderLeft: '0.5px solid rgba(255,255,255,0.14)',
            borderRight: '0.5px solid rgba(255,255,255,0.04)',
            borderBottom: '0.5px solid rgba(255,255,255,0.04)',
            boxShadow: `0 32px 80px rgba(0,0,0,0.80), 0 12px 40px rgba(0,0,0,0.60), inset 0 2px 0 rgba(255,255,255,0.12), inset 0 -2px 0 rgba(0,0,0,0.30), 0 0 60px ${moodGlow}`,
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            display: 'flex',
            flexDirection: 'column' as const,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            transition: 'box-shadow 0.3s ease',
          }}>
            <span style={{ fontSize: 64, lineHeight: 1, transition: 'all 0.2s ease' }}>
              {mood > 0 ? MOOD_EMOJI[mood] : '🫧'}
            </span>
            <p style={{
              fontSize: 15,
              fontWeight: 600,
              color: mood > 0 ? moodColor : 'rgba(255,255,255,0.25)',
              textShadow: mood > 0 ? `0 0 18px ${moodColor}88` : 'none',
              transition: 'all 0.2s ease',
            }}>
              {mood > 0 ? MOOD_LABELS[mood] : 'Pick a mood'}
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <p className="px-5 text-sm" style={{ color: 'rgba(255,255,255,0.40)' }}>Loading…</p>
      ) : (
        <div className="px-5 flex flex-col gap-6">
          {/* Mood picker */}
          <div className="flex flex-col gap-2">
            {[5, 4, 3, 2, 1].map(m => {
              const active = mood === m
              return (
                <button
                  key={m}
                  onClick={() => { setMood(m); setSaved(false) }}
                  className="flex items-center gap-4 rounded-2xl px-5 py-4 text-left transition-all active:scale-[0.98]"
                  style={{
                    background: active
                      ? `${MOOD_COLORS[m]}18`
                      : 'rgba(18,18,22,0.52)',
                    backdropFilter: 'blur(24px) saturate(160%)',
                    WebkitBackdropFilter: 'blur(24px) saturate(160%)',
                    border: `0.5px solid ${active ? `${MOOD_COLORS[m]}55` : 'rgba(255,255,255,0.07)'}`,
                    boxShadow: active ? `0 4px 24px rgba(0,0,0,0.40), 0 0 12px ${MOOD_COLORS[m]}22` : '0 4px 24px rgba(0,0,0,0.40)',
                  }}
                >
                  <span className="text-2xl">{MOOD_EMOJI[m]}</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">{MOOD_LABELS[m]}</p>
                  </div>
                  {active && (
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: MOOD_COLORS[m], boxShadow: `0 0 6px ${MOOD_COLORS[m]}` }}
                    />
                  )}
                </button>
              )
            })}
          </div>

          {/* Note */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--accent)', letterSpacing: '0.08em' }}>Note (optional)</p>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="What's on your mind?"
              maxLength={140}
              rows={3}
              className="glass-elevated w-full rounded-2xl px-4 py-3 text-sm text-white placeholder:text-muted outline-none resize-none"
            />
          </div>

          {/* Save */}
          <button
            onClick={save}
            disabled={mood === 0 || saving}
            className="w-full rounded-2xl py-3.5 text-sm font-semibold disabled:opacity-40 transition-opacity"
            style={{
              background: mood > 0 ? `linear-gradient(135deg, ${MOOD_COLORS[mood]}, ${MOOD_COLORS[mood]}cc)` : 'rgba(255,255,255,0.08)',
              color: mood > 0 ? '#07051a' : 'rgba(255,255,255,0.30)',
              boxShadow: mood > 0 ? `0 4px 20px ${MOOD_COLORS[mood]}55` : 'none',
            }}
          >
            {saved ? 'Saved ✓' : saving ? 'Saving…' : 'Save mood'}
          </button>
        </div>
      )}

      </div>
      <BottomNav />
    </main>
  )
}

export default function MoodLogPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-muted">Loading…</p>
      </div>
    }>
      <MoodLogContent />
    </Suspense>
  )
}
