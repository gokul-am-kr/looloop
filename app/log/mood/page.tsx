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

import { Suspense, useEffect, useState } from 'react'
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

  const supabase = createBrowserClient()

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
  }, [date])

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

  return (
    <main className="min-h-screen pb-36">
      {/* Header */}
      <div className="px-5 pt-14 flex items-center gap-3 mb-8">
        <button onClick={() => router.back()} style={{ color: '#7A7A86' }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div>
          <h1 className="text-white text-xl font-bold">How are you feeling?</h1>
          <p className="text-sm mt-0.5" style={{ color: '#7A7A86' }}>{dateLabel}</p>
        </div>
      </div>

      {loading ? (
        <p className="px-5 text-sm text-muted">Loading…</p>
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
                      ? m === 5 ? 'var(--char-accent10)' : `${MOOD_COLORS[m]}18`
                      : 'rgba(18,18,22,0.52)',
                    backdropFilter: 'blur(24px) saturate(160%)',
                    WebkitBackdropFilter: 'blur(24px) saturate(160%)',
                    border: `1px solid ${active
                      ? m === 5 ? 'var(--char-accent22)' : `${MOOD_COLORS[m]}55`
                      : 'rgba(255,255,255,0.07)'}`,
                    boxShadow: '0 4px 24px rgba(0,0,0,0.40)',
                  }}
                >
                  <span className="text-2xl">{MOOD_EMOJI[m]}</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">{MOOD_LABELS[m]}</p>
                  </div>
                  {active && (
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: m === 5 ? 'var(--char-accent)' : MOOD_COLORS[m] }}
                    />
                  )}
                </button>
              )
            })}
          </div>

          {/* Note */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">Note (optional)</p>
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
            className="w-full rounded-2xl py-3.5 text-sm font-semibold text-black disabled:opacity-40 transition-opacity"
            style={{ background: mood > 0 ? (mood === 5 ? 'var(--char-accent)' : MOOD_COLORS[mood]) : '#3A3A3C' }}
          >
            {saved ? 'Saved ✓' : saving ? 'Saving…' : 'Save mood'}
          </button>
        </div>
      )}

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
