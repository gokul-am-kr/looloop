'use client'

import { useEffect, useRef, useState, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import { ProgressRing } from '@/components/ui/progress-ring'
import { BottomNav } from '@/components/ui/bottom-nav'

type Mode = 'loading' | 'setup' | 'log' | 'edit' | 'single'

const MAX_HABITS = 10
const DEFAULT_COUNT = 5
const DAYS_SHOWN = 7

function getPastDates(count: number): string[] {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - i)
    return d.toISOString().split('T')[0]
  })
}

function dayLetter(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'narrow' })
}

function dayNum(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric' })
}

function formattedDate(dateStr: string, index: number): string {
  if (index === 0) return 'Today'
  if (index === 1) return 'Yesterday'
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'short',
  })
}

export default function HabitsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm" style={{ color: '#636366' }}>Loading…</p>
      </div>
    }>
      <HabitsContent />
    </Suspense>
  )
}

function HabitsContent() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const dateParam    = searchParams.get('date')
  const dates = getPastDates(DAYS_SHOWN)

  const [mode, setMode] = useState<Mode>('loading')
  const [habitNames, setHabitNames] = useState<string[]>([])
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [checksByDate, setChecksByDate] = useState<Record<string, Record<string, boolean>>>({})
  const [editNames, setEditNames] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createBrowserClient()
  const initialized = useRef(false)

  const selectedDate = dates[selectedIdx]
  const checks = checksByDate[selectedDate] ?? {}

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('users')
        .select('habit_names')
        .eq('id', user.id)
        .single()

      const names: string[] = profile?.habit_names ?? []

      if (names.length === 0) {
        setEditNames(Array(DEFAULT_COUNT).fill(''))
        setMode('setup')
        return
      }

      setHabitNames(names)

      const { data: logs } = await supabase
        .from('habit_logs')
        .select('date, habits')
        .eq('user_id', user.id)
        .in('date', dates)

      const byDate: Record<string, Record<string, boolean>> = {}
      for (const date of dates) {
        const log = logs?.find(l => l.date === date)
        const dayChecks: Record<string, boolean> = {}
        for (const name of names) {
          dayChecks[name] = (log?.habits as Record<string, boolean>)?.[name] ?? false
        }
        byDate[date] = dayChecks
      }
      if (dateParam && !dates.includes(dateParam)) {
        const { data: extraLog } = await supabase
          .from('habit_logs').select('habits').eq('user_id', user.id).eq('date', dateParam).maybeSingle()
        const extraChecks: Record<string, boolean> = {}
        for (const name of names) {
          extraChecks[name] = (extraLog?.habits as Record<string, boolean>)?.[name] ?? false
        }
        byDate[dateParam] = extraChecks
      }

      setChecksByDate(byDate)
      setMode(dateParam ? 'single' : 'log')
    }

    load()
  }, [])

  async function saveHabitNames(names: string[], nextMode: Mode) {
    const filtered = names.map(n => n.trim()).filter(Boolean)
    if (filtered.length === 0) { setError('Name at least one habit.'); return }
    setSaving(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error: err } = await supabase
      .from('users').update({ habit_names: filtered }).eq('id', user.id)

    if (err) { setError('Could not save. Try again.'); setSaving(false); return }

    const newByDate: Record<string, Record<string, boolean>> = {}
    for (const date of dates) {
      const dayChecks: Record<string, boolean> = {}
      for (const name of filtered) dayChecks[name] = checksByDate[date]?.[name] ?? false
      newByDate[date] = dayChecks
    }
    setHabitNames(filtered)
    setChecksByDate(newByDate)
    setSaving(false)
    setMode(nextMode)
  }

  async function toggleHabit(name: string) {
    const current = checksByDate[selectedDate] ?? {}
    const next = { ...current, [name]: !current[name] }
    setChecksByDate(prev => ({ ...prev, [selectedDate]: next }))

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('habit_logs').upsert(
      { user_id: user.id, date: selectedDate, habits: next },
      { onConflict: 'user_id,date' }
    )
  }

  function updateField(i: number, value: string) {
    const next = [...editNames]; next[i] = value; setEditNames(next)
  }

  const doneCount  = Object.values(checks).filter(Boolean).length
  const totalCount = habitNames.length

  // ── Loading ────────────────────────────────────────────────────────────────
  if (mode === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm" style={{ color: '#636366' }}>Loading…</p>
      </div>
    )
  }

  // ── Setup / Edit form ──────────────────────────────────────────────────────
  if (mode === 'setup' || mode === 'edit') {
    const isSetup = mode === 'setup'
    return (
      <main className="min-h-screen px-5 pt-14 pb-28">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-white text-2xl font-bold">
              {isSetup ? 'Name your habits' : 'Edit habits'}
            </h1>
            {isSetup && <p className="text-sm mt-1" style={{ color: '#636366' }}>Up to {MAX_HABITS}. Edit anytime.</p>}
          </div>
          {!isSetup && (
            <button onClick={() => { setMode('log'); setError(null) }}
              className="text-sm" style={{ color: '#636366' }}>
              Cancel
            </button>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {editNames.map((name, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                value={name}
                onChange={e => updateField(i, e.target.value)}
                placeholder={`Habit ${i + 1}`}
                className="glass-elevated flex-1 rounded-xl px-4 py-3 text-sm text-white placeholder:text-muted outline-none"
              />
              {editNames.length > 1 && (
                <button
                  onClick={() => setEditNames(editNames.filter((_, idx) => idx !== i))}
                  className="text-xl leading-none w-8 text-center"
                  style={{ color: '#636366' }}
                >×</button>
              )}
            </div>
          ))}
        </div>

        {editNames.length < MAX_HABITS && (
          <button onClick={() => setEditNames([...editNames, ''])}
            className="mt-4 text-sm" style={{ color: '#636366' }}>
            + Add habit
          </button>
        )}

        {error && <p className="mt-3 text-sm" style={{ color: '#FF453A' }}>{error}</p>}

        <button
          onClick={() => saveHabitNames(editNames, 'log')}
          disabled={saving}
          className="mt-8 w-full rounded-2xl py-3.5 text-sm font-semibold text-black disabled:opacity-40"
          style={{ background: 'var(--char-accent)' }}
        >
          {saving ? 'Saving…' : isSetup ? 'Start tracking' : 'Save habits'}
        </button>
        <BottomNav />
      </main>
    )
  }

  // ── Single date (from summary) ─────────────────────────────────────────────
  const singleDate   = dateParam ?? ''
  const singleChecks = checksByDate[singleDate] ?? {}
  const doneSingle   = Object.values(singleChecks).filter(Boolean).length

  async function toggleSingle(name: string) {
    const next = { ...singleChecks, [name]: !singleChecks[name] }
    setChecksByDate(prev => ({ ...prev, [singleDate]: next }))
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('habit_logs').upsert(
      { user_id: user.id, date: singleDate, habits: next },
      { onConflict: 'user_id,date' }
    )
  }

  if (mode === 'single' && dateParam) {
    const dateLabel = new Date(dateParam + 'T00:00:00').toLocaleDateString('en-IN', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    })

    return (
      <main className="min-h-screen pb-28">
        <div className="px-5 pt-14 flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} style={{ color: '#636366' }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div>
            <h1 className="text-white text-xl font-bold">Habits</h1>
            <p className="text-sm mt-0.5" style={{ color: '#636366' }}>{dateLabel}</p>
          </div>
        </div>

        <div className="px-5 flex flex-col gap-2">
          {habitNames.map((name) => {
            const done = singleChecks[name]
            return (
              <HabitRow key={name} name={name} done={done} onToggle={() => toggleSingle(name)} />
            )
          })}
        </div>

        <p className="px-5 mt-5 text-xs" style={{ color: '#636366' }}>
          {doneSingle} of {habitNames.length} done
        </p>

        <BottomNav />
      </main>
    )
  }

  // ── Daily log ──────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen pb-28">
      {/* Header */}
      <div className="px-5 pt-14 flex items-center justify-between">
        <h1 className="text-white text-2xl font-bold">Habits</h1>
        <button
          onClick={() => { setEditNames([...habitNames]); setError(null); setMode('edit') }}
          className="text-sm" style={{ color: '#636366' }}
        >
          Edit
        </button>
      </div>

      {/* Week strip */}
      <div className="px-5 mt-6 flex justify-between">
        {dates.map((date, i) => {
          const dayLog = checksByDate[date] ?? {}
          const done = habitNames.filter(h => dayLog[h]).length
          const pct = totalCount > 0 ? done / totalCount : 0
          const isSelected = i === selectedIdx

          return (
            <button
              key={date}
              onClick={() => setSelectedIdx(i)}
              className="flex flex-col items-center gap-1.5"
            >
              <span className="text-[11px] font-medium"
                style={{ color: isSelected ? '#ffffff' : '#636366' }}>
                {dayLetter(date)}
              </span>
              <ProgressRing
                progress={pct}
                size={36}
                strokeWidth={4}
                color="var(--char-accent)"
                trackColor={isSelected ? '#2C2C2E' : '#1A1A1A'}
              >
                <span className="text-[10px] font-semibold"
                  style={{ color: isSelected ? '#ffffff' : '#636366' }}>
                  {dayNum(date)}
                </span>
              </ProgressRing>
            </button>
          )
        })}
      </div>

      {/* Selected date + count */}
      <div className="px-5 mt-6 flex items-baseline justify-between">
        <p className="text-sm" style={{ color: '#636366' }}>{formattedDate(selectedDate, selectedIdx)}</p>
        <p className="text-sm font-medium" style={{ color: doneCount === totalCount && totalCount > 0 ? 'var(--char-accent)' : '#636366' }}>
          {doneCount === totalCount && totalCount > 0 ? 'All done ✓' : `${doneCount}/${totalCount}`}
        </p>
      </div>

      {/* Habit list */}
      <div className="px-5 mt-3 flex flex-col gap-2">
        {habitNames.map((name) => (
          <HabitRow key={name} name={name} done={checks[name]} onToggle={() => toggleHabit(name)} />
        ))}
      </div>

      <BottomNav />
    </main>
  )
}

function HabitRow({ name, done, onToggle }: { name: string; done: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-4 rounded-2xl px-4 py-4 text-left transition-all active:scale-[0.98]"
      style={{
        background: done ? 'var(--char-accent10)' : 'rgba(18,18,22,0.52)',
        backdropFilter: 'blur(24px) saturate(160%)',
        WebkitBackdropFilter: 'blur(24px) saturate(160%)',
        border: `1px solid ${done ? 'var(--char-accent22)' : 'rgba(255,255,255,0.07)'}`,
        boxShadow: '0 4px 24px rgba(0,0,0,0.40)',
      }}
    >
      <span
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors"
        style={{
          borderColor: done ? 'var(--char-accent)' : '#3A3A3C',
          background: done ? 'var(--char-accent)' : 'transparent',
        }}
      >
        {done && (
          <svg width="11" height="9" viewBox="0 0 12 10" fill="none">
            <path d="M1.5 5L4.5 8L10.5 1.5" stroke="white" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span className="text-sm font-medium flex-1"
        style={{ color: done ? 'var(--char-accent)' : '#FFFFFF' }}>
        {name}
      </span>
    </button>
  )
}
