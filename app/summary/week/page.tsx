'use client'

import { useEffect, useMemo, useRef, useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import { BottomNav } from '@/components/ui/bottom-nav'

// ── Date helpers ──────────────────────────────────────────────────────────────

function getWeekStart(d: Date): Date {
  const date = new Date(d)
  const dow  = date.getDay()
  const diff = dow === 0 ? -6 : 1 - dow
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function toStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

// ── Sleep helpers ─────────────────────────────────────────────────────────────

const TIMELINE_START = 20 * 60
const TIMELINE_SPAN  = 14 * 60

function timeToMins(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function normalizeMins(m: number): number {
  return m < 12 * 60 ? m + 1440 : m
}

function sleepHrs(bedtime: string, wake_time: string): number {
  const bed  = normalizeMins(timeToMins(bedtime))
  let wake = normalizeMins(timeToMins(wake_time))
  if (wake <= bed) wake += 1440
  return (wake - bed) / 60
}

function getBarPos(bedtime: string, wake_time: string): { left: number; width: number } | null {
  if (!bedtime || !wake_time) return null
  const bed  = normalizeMins(timeToMins(bedtime))
  let wake = normalizeMins(timeToMins(wake_time))
  if (wake <= bed) wake += 1440
  const left  = ((bed - TIMELINE_START) / TIMELINE_SPAN) * 100
  const width = ((wake - bed) / TIMELINE_SPAN) * 100
  return { left: Math.max(0, left), width: Math.min(width, 100 - Math.max(0, left)) }
}

function fmtHrs(hrs: number): string {
  const h = Math.floor(hrs)
  const m = Math.round((hrs - h) * 60)
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

const DAY_INITIALS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const DAY_SHORT    = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const AXIS = [
  { label: '8p',  pct: 0 },
  { label: '10p', pct: (2 / 14) * 100 },
  { label: '12a', pct: (4 / 14) * 100 },
  { label: '2a',  pct: (6 / 14) * 100 },
  { label: '4a',  pct: (8 / 14) * 100 },
  { label: '6a',  pct: (10 / 14) * 100 },
  { label: '8a',  pct: (12 / 14) * 100 },
  { label: '10a', pct: 100 },
]

// ── Types ─────────────────────────────────────────────────────────────────────

interface SleepEntry { bedtime: string; wake_time: string; quality: number }

// ── Shared styles ─────────────────────────────────────────────────────────────

const ORB1: React.CSSProperties = {
  position: 'absolute', top: -90, left: -80,
  width: 300, height: 300, borderRadius: '50%',
  background: 'var(--orb1-color)', filter: 'blur(90px)',
  opacity: 0.55, pointerEvents: 'none',
}
const ORB2: React.CSSProperties = {
  position: 'absolute', top: 200, right: -70,
  width: 240, height: 240, borderRadius: '50%',
  background: 'var(--orb2-color)', filter: 'blur(75px)',
  opacity: 0.40, pointerEvents: 'none',
}
const ORB3: React.CSSProperties = {
  position: 'absolute', bottom: 60, left: -20,
  width: 240, height: 240, borderRadius: '50%',
  background: 'var(--orb3-color)', filter: 'blur(100px)',
  opacity: 0.20, pointerEvents: 'none',
}

const GLASS_GRID: React.CSSProperties = {
  background: 'linear-gradient(145deg, rgba(255,255,255,0.10), rgba(255,255,255,0.04))',
  borderTop: '0.5px solid rgba(255,255,255,0.22)',
  borderLeft: '0.5px solid rgba(255,255,255,0.14)',
  borderRight: '0.5px solid rgba(255,255,255,0.04)',
  borderBottom: '0.5px solid rgba(255,255,255,0.04)',
  boxShadow: '0 12px 40px rgba(0,0,0,0.55), 0 4px 12px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.12)',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  borderRadius: 18,
  padding: 16,
}

const STAT_CARD: React.CSSProperties = {
  background: 'linear-gradient(145deg, rgba(255,255,255,0.11), rgba(255,255,255,0.04))',
  borderTop: '0.5px solid rgba(255,255,255,0.24)',
  borderLeft: '0.5px solid rgba(255,255,255,0.16)',
  borderRight: '0.5px solid rgba(255,255,255,0.04)',
  borderBottom: '0.5px solid rgba(255,255,255,0.04)',
  boxShadow: '0 8px 28px rgba(0,0,0,0.50), 0 2px 8px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.12)',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  borderRadius: 16,
  padding: '12px 14px',
  flex: 1,
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function WeekSummaryPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <p className="text-sm text-muted">Loading…</p>
      </div>
    }>
      <WeekContent />
    </Suspense>
  )
}

function WeekContent() {
  const router   = useRouter()
  const now      = new Date()
  const todayStr = toStr(now)

  const [weekStart, setWeekStart]     = useState(() => getWeekStart(now))
  const [habitNames, setHabitNames]   = useState<string[]>([])
  const [habitByDate, setHabitByDate] = useState<Record<string, Record<string, boolean>>>({})
  const [sleepByDate, setSleepByDate] = useState<Record<string, SleepEntry>>({})
  const [loading, setLoading]         = useState(true)

  const supabase    = useRef(createBrowserClient()).current
  const namesLoaded = useRef(false)

  const weekDates   = useMemo(
    () => Array.from({ length: 7 }, (_, i) => toStr(addDays(weekStart, i))),
    [weekStart]
  )
  const weekEnd     = addDays(weekStart, 6)
  const isCurrentWk = toStr(getWeekStart(now)) === toStr(weekStart)

  const weekLabel = (() => {
    const s = weekStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    const e = weekEnd.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    return `${s} – ${e}`
  })()

  useEffect(() => {
    if (namesLoaded.current) return
    namesLoaded.current = true
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('users').select('habit_names').eq('id', user.id).single()
        .then(({ data }) => setHabitNames(data?.habit_names ?? []))
    })
  }, [supabase])

  useEffect(() => {
    setLoading(true)
    const [start, end] = [weekDates[0], weekDates[6]]

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return }

      const [{ data: hl }, { data: sl }] = await Promise.all([
        supabase.from('habit_logs').select('date, habits')
          .eq('user_id', user.id).gte('date', start).lte('date', end),
        supabase.from('sleep_logs').select('date, bedtime, wake_time, quality')
          .eq('user_id', user.id).gte('date', start).lte('date', end),
      ])

      const hbd: Record<string, Record<string, boolean>> = {}
      for (const l of hl ?? []) hbd[l.date] = l.habits

      const sbd: Record<string, SleepEntry> = {}
      for (const l of sl ?? []) sbd[l.date] = {
        bedtime:   l.bedtime   ?? '',
        wake_time: l.wake_time ?? '',
        quality:   l.quality   ?? 0,
      }

      setHabitByDate(hbd)
      setSleepByDate(sbd)
      setLoading(false)
    })
  }, [supabase, weekDates])

  // ── Stats ─────────────────────────────────────────────────────────────────

  const totalHabits     = habitNames.length
  const loggedHabitDays = weekDates.filter(d => habitByDate[d] && d <= todayStr).length
  const perfectDays     = weekDates.filter(d => {
    const log = habitByDate[d]
    return log && totalHabits > 0 && habitNames.every(h => log[h]) && d <= todayStr
  }).length
  const completionPct = loggedHabitDays > 0
    ? Math.round(
        weekDates
          .filter(d => d <= todayStr && habitByDate[d])
          .reduce((sum, d) => {
            const log = habitByDate[d]
            return sum + (log && totalHabits > 0 ? habitNames.filter(h => log[h]).length / totalHabits : 0)
          }, 0) / loggedHabitDays * 100
      )
    : 0

  const sleepDurs = weekDates
    .map(d => {
      const s = sleepByDate[d]
      return s?.bedtime && s?.wake_time ? sleepHrs(s.bedtime, s.wake_time) : 0
    })
    .filter(h => h > 0)
  const avgSleep  = sleepDurs.length > 0 ? sleepDurs.reduce((a, b) => a + b) / sleepDurs.length : 0
  const bestSleep = sleepDurs.length > 0 ? Math.max(...sleepDurs) : 0

  return (
    <main
      className="min-h-screen pb-28"
      style={{ background: 'var(--bg)', position: 'relative', overflow: 'clip' }}
    >
      <div style={ORB1} />
      <div style={ORB2} />
      <div style={ORB3} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* ── Header ── */}
        <div className="px-4 pt-12 flex items-center gap-2">
          <button
            onClick={() => setWeekStart(d => addDays(d, -7))}
            className="w-8 h-8 flex items-center justify-center shrink-0"
            style={{ color: 'rgba(255,255,255,0.35)' }}
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
              <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <p style={{ flex: 1, textAlign: 'center', fontSize: 15, fontWeight: 500, color: '#ffffff' }}>
            {weekLabel}
          </p>

          <button
            onClick={() => !isCurrentWk && setWeekStart(d => addDays(d, 7))}
            disabled={isCurrentWk}
            className="w-8 h-8 flex items-center justify-center shrink-0"
            style={{ color: isCurrentWk ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.35)' }}
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
              <path d="M7.5 5L12.5 10L7.5 15" stroke="currentColor" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <button
            onClick={() => router.push('/summary')}
            style={{
              marginLeft: 4, fontSize: 12, padding: '6px 14px', borderRadius: 20,
              background: 'linear-gradient(135deg, rgba(255,255,255,0.10), rgba(255,255,255,0.04))',
              borderTop: '0.5px solid rgba(255,255,255,0.22)',
              borderLeft: '0.5px solid rgba(255,255,255,0.14)',
              borderRight: '0.5px solid rgba(255,255,255,0.04)',
              borderBottom: '0.5px solid rgba(255,255,255,0.04)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.10)',
              color: 'rgba(255,255,255,0.60)',
              flexShrink: 0,
            }}
          >
            Monthly
          </button>
        </div>

        {loading ? (
          <p className="px-5 mt-8 text-sm text-muted">Loading…</p>
        ) : (
          <>
            {/* ── Habits section ── */}
            <div className="px-4 mt-6">
              <p style={{
                fontSize: 11, fontWeight: 500, letterSpacing: '0.10em',
                textTransform: 'uppercase', color: 'hsl(var(--hue),70%,80%)',
                marginBottom: 12,
              }}>Habits</p>

              {habitNames.length === 0 ? (
                <p className="text-sm text-muted">No habits set up yet.</p>
              ) : (
                <div style={GLASS_GRID}>
                  {/* Day header row */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '72px repeat(7, 1fr)',
                    paddingBottom: 8,
                    borderBottom: '0.5px solid rgba(255,255,255,0.07)',
                    marginBottom: 4,
                  }}>
                    <div />
                    {weekDates.map((date, i) => {
                      const dayNum  = new Date(date + 'T00:00:00').getDate()
                      const isToday = date === todayStr
                      return (
                        <div key={date} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 400 }}>
                            {DAY_INITIALS[i]}
                          </span>
                          <span style={{
                            fontSize: 11, fontWeight: isToday ? 500 : 400,
                            width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            borderRadius: '50%',
                            background: isToday ? 'rgba(255,255,255,0.12)' : 'transparent',
                            border: isToday ? '0.5px solid rgba(255,255,255,0.25)' : 'none',
                            boxShadow: isToday ? 'inset 0 1px 0 rgba(255,255,255,0.15)' : 'none',
                            color: isToday ? '#ffffff' : 'rgba(255,255,255,0.45)',
                          }}>
                            {dayNum}
                          </span>
                        </div>
                      )
                    })}
                  </div>

                  {/* Habit rows */}
                  {habitNames.map((name, rowIdx) => (
                    <div
                      key={name}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '72px repeat(7, 1fr)',
                        alignItems: 'center',
                        borderBottom: rowIdx < habitNames.length - 1
                          ? '0.5px solid rgba(255,255,255,0.05)'
                          : 'none',
                        padding: '6px 0',
                      }}
                    >
                      <div style={{ paddingRight: 8, overflow: 'hidden' }}>
                        <span style={{
                          fontSize: 13, color: 'rgba(255,255,255,0.75)',
                          fontWeight: 400, display: 'block',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>{name}</span>
                      </div>

                      {weekDates.map((date) => {
                        const isFuture = date > todayStr
                        const log      = habitByDate[date]
                        const done     = !isFuture && !!log?.[name]
                        const missed   = !isFuture && !!log && !log[name]
                        return (
                          <div
                            key={date}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px 0' }}
                            onClick={() => !isFuture && router.push(`/log/habits?date=${date}`)}
                          >
                            <div style={{
                              width: 26, height: 26, borderRadius: '50%',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              cursor: isFuture ? 'default' : 'pointer',
                              transition: 'transform 0.1s ease',
                              background: done
                                ? 'linear-gradient(135deg, hsl(var(--hue),80%,88%), hsl(var(--hue),70%,72%))'
                                : missed
                                  ? 'rgba(255,255,255,0.05)'
                                  : 'transparent',
                              border: done
                                ? 'none'
                                : missed
                                  ? '1px solid rgba(255,255,255,0.10)'
                                  : 'none',
                              boxShadow: done
                                ? '0 0 8px hsla(var(--hue),80%,80%,0.5), 0 0 3px hsla(var(--hue),80%,90%,0.7)'
                                : 'none',
                            }}>
                              {done && (
                                <svg width="11" height="8" viewBox="0 0 9 7" fill="none">
                                  <path d="M1 3.5L3.5 6L8 1"
                                    style={{ stroke: 'hsl(var(--hue),45%,12%)' }}
                                    strokeWidth="2"
                                    strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Habit stat cards */}
            {habitNames.length > 0 && (
              <div style={{ padding: '10px 16px 0', display: 'flex', gap: 8 }}>
                {[
                  { label: 'Completion', value: `${completionPct}%` },
                  { label: 'Logged',     value: `${loggedHabitDays}/7` },
                  { label: 'Perfect',    value: `${perfectDays}d` },
                ].map(({ label, value }) => (
                  <div key={label} style={STAT_CARD}>
                    <p style={{
                      fontSize: 9, color: 'rgba(255,255,255,0.40)',
                      letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4,
                    }}>{label}</p>
                    <p style={{
                      fontSize: 22, fontWeight: 500,
                      color: 'var(--accent)',
                      textShadow: '0 0 12px hsla(var(--hue),70%,80%,0.4)',
                    }}>{value}</p>
                  </div>
                ))}
              </div>
            )}

            {/* ── Sleep section ── */}
            <div className="px-4 mt-6">
              <p style={{
                fontSize: 11, fontWeight: 500, letterSpacing: '0.10em',
                textTransform: 'uppercase', color: 'hsl(var(--hue),70%,80%)',
                marginBottom: 12,
              }}>Sleep</p>

              <div style={{ ...GLASS_GRID, padding: 14 }}>
                {/* Time axis */}
                <div style={{ position: 'relative', height: 16, marginLeft: 36, marginBottom: 2 }}>
                  {AXIS.map(({ label, pct }) => (
                    <span
                      key={label}
                      style={{
                        position: 'absolute', left: `${pct}%`,
                        transform: 'translateX(-50%)',
                        fontSize: 9, color: 'rgba(255,255,255,0.22)',
                      }}
                    >
                      {label}
                    </span>
                  ))}
                </div>

                {/* Tick marks */}
                <div style={{ position: 'relative', height: 6, marginLeft: 36, marginBottom: 6 }}>
                  {AXIS.map(({ pct }) => (
                    <div
                      key={pct}
                      style={{
                        position: 'absolute', top: 0, bottom: 0, left: `${pct}%`,
                        width: '0.5px', background: 'rgba(255,255,255,0.04)',
                      }}
                    />
                  ))}
                </div>

                {/* Day rows */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {weekDates.map((date, i) => {
                    const entry    = sleepByDate[date]
                    const isToday  = date === todayStr
                    const isFuture = date > todayStr
                    const bar      = entry ? getBarPos(entry.bedtime, entry.wake_time) : null
                    const dur      = entry ? fmtHrs(sleepHrs(entry.bedtime, entry.wake_time)) : ''

                    return (
                      <button
                        key={date}
                        onClick={() => !isFuture && router.push(`/log/sleep?date=${date}`)}
                        disabled={isFuture}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                          padding: '3px 0',
                          borderBottom: i < 6 ? '0.5px solid rgba(255,255,255,0.04)' : 'none',
                          background: 'none', border: 'none', cursor: isFuture ? 'default' : 'pointer',
                          borderBottomColor: 'rgba(255,255,255,0.04)',
                          borderBottomStyle: i < 6 ? 'solid' : undefined,
                          borderBottomWidth: i < 6 ? '0.5px' : undefined,
                        }}
                      >
                        <span style={{
                          width: 32, textAlign: 'right', flexShrink: 0,
                          fontSize: 11, fontWeight: 400,
                          color: isToday ? '#ffffff' : 'rgba(255,255,255,0.40)',
                        }}>
                          {DAY_SHORT[i]}
                        </span>

                        <div style={{ flex: 1, position: 'relative', height: 24 }}>
                          {/* Row bg */}
                          <div style={{
                            position: 'absolute', inset: 0, borderRadius: 4,
                            background: 'rgba(255,255,255,0.025)',
                          }} />
                          {/* Grid lines */}
                          {AXIS.map(({ pct }) => (
                            <div key={pct} style={{
                              position: 'absolute', top: 0, bottom: 0, left: `${pct}%`,
                              width: '0.5px', background: 'rgba(255,255,255,0.04)',
                            }} />
                          ))}

                          {bar ? (
                            <div style={{
                              position: 'absolute', top: 2, bottom: 2,
                              left: `${bar.left}%`, width: `${bar.width}%`,
                              borderRadius: 6, overflow: 'hidden',
                              background: 'linear-gradient(90deg, hsl(var(--hue),80%,88%), hsl(var(--hue),70%,74%))',
                              boxShadow: '0 0 10px hsla(var(--hue),80%,80%,0.35), 0 2px 6px rgba(0,0,0,0.3)',
                              display: 'flex', alignItems: 'center',
                            }}>
                              {dur && (
                                <span style={{
                                  paddingLeft: 6, paddingRight: 6,
                                  fontSize: 11, fontWeight: 500,
                                  color: 'hsl(var(--hue),45%,12%)',
                                  whiteSpace: 'nowrap',
                                }}>
                                  {dur}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div style={{
                              position: 'absolute', inset: 0,
                              display: 'flex', alignItems: 'center', paddingLeft: 8,
                            }}>
                              {!isFuture && (
                                <span style={{
                                  fontSize: 11, color: 'rgba(255,255,255,0.15)',
                                  fontStyle: 'italic',
                                }}>tap to log</span>
                              )}
                            </div>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Sleep stat cards */}
            <div style={{ padding: '10px 16px 0', display: 'flex', gap: 8 }}>
              {[
                { label: 'Avg sleep', value: avgSleep  > 0 ? fmtHrs(avgSleep)  : '—' },
                { label: 'Logged',    value: `${sleepDurs.length}/7` },
                { label: 'Best',      value: bestSleep > 0 ? fmtHrs(bestSleep) : '—' },
              ].map(({ label, value }) => (
                <div key={label} style={STAT_CARD}>
                  <p style={{
                    fontSize: 9, color: 'rgba(255,255,255,0.40)',
                    letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4,
                  }}>{label}</p>
                  <p style={{
                    fontSize: 22, fontWeight: 500,
                    color: 'var(--accent)',
                    textShadow: '0 0 12px hsla(var(--hue),70%,80%,0.4)',
                  }}>{value}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <BottomNav />
    </main>
  )
}
