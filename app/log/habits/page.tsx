'use client'

import { useEffect, useRef, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import { BottomNav } from '@/components/ui/bottom-nav'

type Mode = 'loading' | 'setup' | 'log' | 'edit' | 'single'

const MAX_HABITS    = 10
const DEFAULT_COUNT = 5
const DAYS_SHOWN    = 7

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

const ORB1 = { position: 'absolute' as const, zIndex: 0, width: 300, height: 300, borderRadius: '50%', background: 'var(--orb1-color)', opacity: 0.60, filter: 'blur(90px)', top: -90, left: -80, pointerEvents: 'none' as const }
const ORB2 = { position: 'absolute' as const, zIndex: 0, width: 240, height: 240, borderRadius: '50%', background: 'var(--orb2-color)', opacity: 0.45, filter: 'blur(75px)', top: 100, right: -70, pointerEvents: 'none' as const }
const ORB3 = { position: 'absolute' as const, zIndex: 0, width: 240, height: 240, borderRadius: '50%', background: 'var(--orb3-color)', opacity: 0.25, filter: 'blur(100px)', bottom: 60, left: -20, pointerEvents: 'none' as const }

export default function HabitsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>Loading…</p>
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

  const [mode, setMode]           = useState<Mode>('loading')
  const [habitNames, setHabitNames] = useState<string[]>([])
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [checksByDate, setChecksByDate] = useState<Record<string, Record<string, boolean>>>({})
  const [editNames, setEditNames] = useState<string[]>([])
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState<string | null>(null)

  const supabase    = createBrowserClient()
  const initialized = useRef(false)

  const selectedDate = dates[selectedIdx]
  const checks       = checksByDate[selectedDate] ?? {}

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('users').select('habit_names').eq('id', user.id).single()

      const names: string[] = profile?.habit_names ?? []

      if (names.length === 0) {
        setEditNames(Array(DEFAULT_COUNT).fill(''))
        setMode('setup')
        return
      }

      setHabitNames(names)

      const { data: logs } = await supabase
        .from('habit_logs').select('date, habits').eq('user_id', user.id).in('date', dates)

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

  // Per-habit streak: consecutive days from today going back
  const habitStreaks: Record<string, number> = {}
  for (const name of habitNames) {
    let s = 0
    for (const date of dates) {
      if (checksByDate[date]?.[name]) s++
      else break
    }
    habitStreaks[name] = s
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (mode === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>Loading…</p>
      </div>
    )
  }

  // ── Setup / Edit form ──────────────────────────────────────────────────────
  if (mode === 'setup' || mode === 'edit') {
    const isSetup = mode === 'setup'
    return (
      <main className="min-h-screen relative" style={{ background: 'var(--bg)', overflow: 'clip', paddingBottom: 140 }}>
        <div style={ORB1} /><div style={ORB2} /><div style={ORB3} />
        <div style={{ position: 'relative', zIndex: 1 }} className="px-5 pt-14">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 style={{ fontSize: 26, fontWeight: 500, color: '#ffffff' }}>
                {isSetup ? 'Name your habits' : 'Edit habits'}
              </h1>
              {isSetup && (
                <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.40)' }}>
                  Up to {MAX_HABITS}. Edit anytime.
                </p>
              )}
            </div>
            {!isSetup && (
              <button onClick={() => { setMode('log'); setError(null) }}
                style={{ color: 'var(--accent)', fontSize: 14 }}>
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
                  className="flex-1 rounded-xl px-4 py-3 text-sm text-white outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.07)',
                    border: '0.5px solid rgba(255,255,255,0.14)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                  }}
                />
                {editNames.length > 1 && (
                  <button
                    onClick={() => setEditNames(editNames.filter((_, idx) => idx !== i))}
                    className="text-xl leading-none w-8 text-center"
                    style={{ color: 'rgba(255,255,255,0.35)' }}
                  >×</button>
                )}
              </div>
            ))}
          </div>

          {editNames.length < MAX_HABITS && (
            <button onClick={() => setEditNames([...editNames, ''])}
              className="mt-4 text-sm" style={{ color: 'var(--accent)' }}>
              + Add habit
            </button>
          )}

          {error && <p className="mt-3 text-sm" style={{ color: '#FF453A' }}>{error}</p>}

          <button
            onClick={() => saveHabitNames(editNames, 'log')}
            disabled={saving}
            className="mt-8 w-full rounded-2xl py-3.5 text-sm font-semibold disabled:opacity-40"
            style={{ background: 'var(--accent)', color: 'hsl(var(--hue), 45%, 8%)' }}
          >
            {saving ? 'Saving…' : isSetup ? 'Start tracking' : 'Save habits'}
          </button>
        </div>
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
      <main className="min-h-screen relative" style={{ background: 'var(--bg)', overflow: 'clip', paddingBottom: 140 }}>
        <div style={ORB1} /><div style={ORB2} /><div style={ORB3} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="px-5 pt-14 flex items-center gap-3 mb-6">
            <button onClick={() => router.back()} style={{ color: 'rgba(255,255,255,0.45)' }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.8"
                  strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <div>
              <h1 style={{ fontSize: 26, fontWeight: 500, color: '#ffffff' }}>Habits</h1>
              <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.40)' }}>{dateLabel}</p>
            </div>
          </div>

          <div className="px-5 flex flex-col gap-2">
            {habitNames.map(name => (
              <HabitRow key={name} name={name} done={singleChecks[name]} streak={habitStreaks[name] ?? 0} onToggle={() => toggleSingle(name)} />
            ))}
          </div>

          <p className="px-5 mt-5 text-xs" style={{ color: 'var(--accent)' }}>
            {doneSingle} of {habitNames.length} done
          </p>
        </div>
        <BottomNav />
      </main>
    )
  }

  // ── Daily log ──────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen relative" style={{ background: 'var(--bg)', overflow: 'clip', paddingBottom: 140 }}>
      <div style={ORB1} /><div style={ORB2} /><div style={ORB3} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div className="px-5 pt-14 flex items-center justify-between">
          <h1 style={{ fontSize: 26, fontWeight: 500, color: '#ffffff' }}>Habits</h1>
          <button
            onClick={() => { setEditNames([...habitNames]); setError(null); setMode('edit') }}
            style={{ color: 'var(--accent)', fontSize: 14 }}
          >
            Edit
          </button>
        </div>

        {/* Week strip */}
        <div className="px-5 mt-6 flex justify-between">
          {dates.map((date, i) => {
            const dayLog     = checksByDate[date] ?? {}
            const done       = habitNames.filter(h => dayLog[h]).length
            const pct        = totalCount > 0 ? done / totalCount : 0
            const isSelected = i === selectedIdx
            const isToday    = i === 0
            const circ       = 2 * Math.PI * 14

            return (
              <button
                key={date}
                onClick={() => setSelectedIdx(i)}
                className="flex flex-col items-center gap-1.5"
              >
                <span style={{
                  fontSize: 11, fontWeight: 500,
                  color: isSelected ? '#ffffff' : 'rgba(255,255,255,0.35)',
                }}>
                  {dayLetter(date)}
                </span>

                {/* Circle with ring */}
                <div style={{ position: 'relative', width: 36, height: 36 }}>
                  {/* Glass background */}
                  <div style={{
                    position: 'absolute', inset: 0, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.05)',
                    border: isSelected
                      ? '0.5px solid rgba(255,255,255,0.28)'
                      : '0.5px solid rgba(255,255,255,0.10)',
                    boxShadow: isSelected
                      ? '0 4px 16px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.15)'
                      : '0 4px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)',
                  }} />
                  {/* Progress ring */}
                  <svg width={36} height={36} style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
                    <circle cx={18} cy={18} r={14} fill="none"
                      stroke="rgba(255,255,255,0.07)" strokeWidth={3} />
                    {pct > 0 && (
                      <circle cx={18} cy={18} r={14} fill="none"
                        stroke="hsl(var(--hue),80%,88%)"
                        strokeWidth={3} strokeLinecap="round"
                        strokeDasharray={circ}
                        strokeDashoffset={circ * (1 - Math.min(pct, 1))}
                        style={{ transition: 'stroke-dashoffset 0.4s ease' }}
                      />
                    )}
                  </svg>
                  {/* Center: white dot for today, day number otherwise */}
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {isToday ? (
                      <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#ffffff' }} />
                    ) : (
                      <span style={{
                        fontSize: 10,
                        color: isSelected ? '#ffffff' : 'rgba(255,255,255,0.50)',
                        fontWeight: isSelected ? 500 : 400,
                      }}>
                        {dayNum(date)}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Date label + count */}
        <div className="px-5 mt-5 flex items-baseline justify-between">
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>
            {formattedDate(selectedDate, selectedIdx)}
          </p>
          <p style={{ color: 'var(--accent)', fontSize: 13, fontWeight: 500 }}>
            {doneCount === totalCount && totalCount > 0 ? 'All done ✓' : `${doneCount}/${totalCount}`}
          </p>
        </div>

        {/* Habit list */}
        <div className="px-5 mt-3 flex flex-col gap-2">
          {habitNames.map(name => (
            <HabitRow key={name} name={name} done={checks[name]} streak={habitStreaks[name] ?? 0} onToggle={() => toggleHabit(name)} />
          ))}
        </div>
      </div>

      <BottomNav />
    </main>
  )
}

function HabitRow({ name, done, streak, onToggle }: {
  name: string; done: boolean; streak: number; onToggle: () => void
}) {
  const streakLabel = done ? (streak === 0 ? '1d 🔥' : `${streak}d 🔥`) : '—'

  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-4 text-left transition-all active:scale-[0.98]"
      style={{
        borderRadius: 16,
        padding: '16px 18px',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        background: done
          ? 'linear-gradient(145deg, hsla(var(--hue),50%,30%,0.35), hsla(var(--hue),40%,20%,0.20))'
          : 'linear-gradient(145deg, rgba(255,255,255,0.07), rgba(255,255,255,0.03))',
        borderTop: done ? '0.5px solid hsla(var(--hue),70%,80%,0.35)' : '0.5px solid rgba(255,255,255,0.14)',
        borderLeft: done ? '0.5px solid hsla(var(--hue),70%,80%,0.22)' : '0.5px solid rgba(255,255,255,0.10)',
        borderRight: done ? '0.5px solid hsla(var(--hue),70%,80%,0.05)' : '0.5px solid rgba(255,255,255,0.03)',
        borderBottom: done ? '0.5px solid hsla(var(--hue),70%,80%,0.05)' : '0.5px solid rgba(255,255,255,0.03)',
        boxShadow: done
          ? '0 6px 24px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.10), 0 0 20px hsla(var(--hue),60%,60%,0.08)'
          : '0 4px 16px rgba(0,0,0,0.40), 0 1px 4px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.07)',
      }}
    >
      {/* Checkbox */}
      <div style={{
        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: done
          ? 'linear-gradient(135deg, hsl(var(--hue),80%,88%), hsl(var(--hue),70%,72%))'
          : 'rgba(255,255,255,0.05)',
        border: done ? 'none' : '1.5px solid rgba(255,255,255,0.18)',
        boxShadow: done
          ? '0 0 12px hsla(var(--hue),80%,80%,0.50), 0 0 4px hsla(var(--hue),80%,90%,0.80)'
          : 'none',
      }}>
        {done && (
          <svg width="13" height="10" viewBox="0 0 13 10" fill="none">
            <path d="M1.5 5L5 8.5L11.5 1.5"
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ stroke: 'hsl(var(--hue),45%,12%)' }}
            />
          </svg>
        )}
      </div>

      {/* Habit name */}
      <span style={{
        flex: 1,
        minWidth: 0,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        fontSize: 16,
        fontWeight: done ? 500 : 400,
        color: done ? 'hsl(var(--hue),80%,92%)' : 'rgba(255,255,255,0.75)',
      }}>
        {name}
      </span>

      {/* Streak info */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
        <span style={{
          fontSize: 12,
          fontWeight: 500,
          color: done ? 'hsl(var(--hue),80%,88%)' : 'rgba(255,255,255,0.20)',
          textShadow: done ? '0 0 8px hsla(var(--hue),80%,80%,0.5)' : 'none',
        }}>
          {streakLabel}
        </span>
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)' }}>streak</span>
      </div>
    </button>
  )
}
