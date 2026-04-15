'use client'

import { useEffect, useRef, useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import { BottomNav } from '@/components/ui/bottom-nav'

// ── Date helpers ──────────────────────────────────────────────────────────────

function getWeekStart(d: Date): Date {
  const date = new Date(d)
  const dow  = date.getDay()
  const diff = dow === 0 ? -6 : 1 - dow   // Monday = 0
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

const TIMELINE_START = 20 * 60   // 8 pm
const TIMELINE_SPAN  = 14 * 60   // 8 pm → 10 am

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

function barColor(quality: number): string {
  if (quality >= 4) return '#5AC8FA'
  if (quality === 3) return '#3A8FA8'
  return '#1E5F7A'
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

// ── Page ─────────────────────────────────────────────────────────────────────

export default function WeekSummaryPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-muted">Loading…</p>
      </div>
    }>
      <WeekContent />
    </Suspense>
  )
}

function WeekContent() {
  const router  = useRouter()
  const now     = new Date()
  const todayStr = toStr(now)

  const [weekStart, setWeekStart] = useState(() => getWeekStart(now))
  const [habitNames, setHabitNames]   = useState<string[]>([])
  const [habitByDate, setHabitByDate] = useState<Record<string, Record<string, boolean>>>({})
  const [sleepByDate, setSleepByDate] = useState<Record<string, SleepEntry>>({})
  const [loading, setLoading]         = useState(true)

  const supabase   = createBrowserClient()
  const namesLoaded = useRef(false)

  const weekDates   = Array.from({ length: 7 }, (_, i) => toStr(addDays(weekStart, i)))
  const weekEnd     = addDays(weekStart, 6)
  const isCurrentWk = toStr(getWeekStart(now)) === toStr(weekStart)

  const weekLabel = (() => {
    const s = weekStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    const e = weekEnd.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    return `${s} – ${e}`
  })()

  // Load habit names once
  useEffect(() => {
    if (namesLoaded.current) return
    namesLoaded.current = true
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('users').select('habit_names').eq('id', user.id).single()
        .then(({ data }) => setHabitNames(data?.habit_names ?? []))
    })
  }, [])

  // Load week logs whenever weekStart changes
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
  }, [weekStart])

  // ── Stats ─────────────────────────────────────────────────────────────────

  const totalHabits   = habitNames.length
  const loggedHabitDays = weekDates.filter(d => habitByDate[d] && d <= todayStr).length
  const perfectDays   = weekDates.filter(d => {
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
    <main className="min-h-screen pb-28">

      {/* ── Header ── */}
      <div className="px-4 pt-12 flex items-center gap-2">
        <button onClick={() => setWeekStart(d => addDays(d, -7))}
          className="w-7 h-7 flex items-center justify-center text-muted hover:text-white shrink-0">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
            <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <p className="text-white text-sm font-semibold flex-1 text-center">{weekLabel}</p>

        <button
          onClick={() => !isCurrentWk && setWeekStart(d => addDays(d, 7))}
          disabled={isCurrentWk}
          className={`w-7 h-7 flex items-center justify-center transition-colors shrink-0 ${
            isCurrentWk ? 'text-dim' : 'text-muted hover:text-white'
          }`}>
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
            <path d="M7.5 5L12.5 10L7.5 15" stroke="currentColor" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <button
          onClick={() => router.push('/summary')}
          className="ml-1 text-xs px-2.5 py-1 rounded-lg font-medium shrink-0"
          style={{ background: '#1C1C1E', color: '#8E8E93' }}>
          Monthly
        </button>
      </div>

      {loading ? (
        <p className="px-5 mt-8 text-sm text-muted">Loading…</p>
      ) : (
        <>
          {/* ── Habits grid ── */}
          <div className="px-4 mt-5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted mb-2">Habits</p>

            {habitNames.length === 0 ? (
              <p className="text-sm text-muted">No habits set up yet.</p>
            ) : (
              <div className="bg-card rounded-2xl overflow-hidden">
                {/* Day header */}
                <div
                  className="border-b"
                  style={{ display: 'grid', gridTemplateColumns: '80px repeat(7, 1fr)', borderColor: '#111' }}
                >
                  <div />
                  {weekDates.map((date, i) => {
                    const dayNum  = new Date(date + 'T00:00:00').getDate()
                    const isToday = date === todayStr
                    return (
                      <div key={date} className="flex flex-col items-center py-2 gap-0.5">
                        <span className="text-[9px] font-medium" style={{ color: '#636366' }}>
                          {DAY_INITIALS[i]}
                        </span>
                        <span
                          className="text-[11px] font-semibold w-5 h-5 flex items-center justify-center rounded-full"
                          style={{
                            background: isToday ? 'var(--char-accent)' : 'transparent',
                            color:      isToday ? '#000'    : '#8E8E93',
                          }}
                        >
                          {dayNum}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {/* One row per habit */}
                {habitNames.map(name => (
                  <div
                    key={name}
                    className="border-b last:border-0"
                    style={{ display: 'grid', gridTemplateColumns: '80px repeat(7, 1fr)', borderColor: '#111' }}
                  >
                    <div className="px-3 py-3 flex items-center">
                      <span className="text-[11px] font-medium text-white truncate">{name}</span>
                    </div>
                    {weekDates.map((date) => {
                      const isFuture = date > todayStr
                      const log      = habitByDate[date]
                      const done     = !isFuture && !!log?.[name]
                      const missed   = !isFuture && !!log && !log[name]
                      return (
                        <div
                          key={date}
                          className="flex items-center justify-center py-3"
                          onClick={() => !isFuture && router.push(`/log/habits?date=${date}`)}
                          style={{ cursor: isFuture ? 'default' : 'pointer' }}
                        >
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center transition-colors"
                            style={{
                              background: done ? 'var(--char-accent)' : missed ? '#2C2C2E' : '#111',
                            }}
                          >
                            {done && (
                              <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                                <path d="M1 3.5L3.5 6L8 1" stroke="#000" strokeWidth="1.5"
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

          {/* Habit stat pills */}
          {habitNames.length > 0 && (
            <div className="px-4 mt-2 flex gap-2">
              {[
                { label: 'Completion', value: `${completionPct}%` },
                { label: 'Logged',     value: `${loggedHabitDays}/7` },
                { label: 'Perfect',    value: `${perfectDays}d` },
              ].map(({ label, value }) => (
                <div key={label} className="flex-1 bg-card rounded-xl px-3 py-3">
                  <p className="text-[9px] font-semibold uppercase tracking-wide text-muted">{label}</p>
                  <p className="text-lg font-bold mt-0.5" style={{ color: 'var(--char-accent)' }}>{value}</p>
                </div>
              ))}
            </div>
          )}

          {/* ── Sleep section ── */}
          <div className="px-4 mt-5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted mb-2">Sleep</p>

            {/* Time axis */}
            <div className="relative h-4 ml-8 mb-1">
              {AXIS.map(({ label, pct }) => (
                <span
                  key={label}
                  className="absolute text-[9px] text-muted -translate-x-1/2"
                  style={{ left: `${pct}%` }}
                >
                  {label}
                </span>
              ))}
            </div>

            {/* Tick lines */}
            <div className="relative h-1.5 ml-8 mb-2">
              {AXIS.map(({ pct }) => (
                <div key={pct} className="absolute top-0 bottom-0 w-px bg-dim" style={{ left: `${pct}%` }} />
              ))}
            </div>

            {/* Day rows */}
            <div className="flex flex-col gap-1.5">
              {weekDates.map((date, i) => {
                const entry   = sleepByDate[date]
                const isToday = date === todayStr
                const isFuture = date > todayStr
                const bar     = entry ? getBarPos(entry.bedtime, entry.wake_time) : null
                const color   = entry ? barColor(entry.quality) : '#5AC8FA'
                const dur     = entry ? fmtHrs(sleepHrs(entry.bedtime, entry.wake_time)) : ''

                return (
                  <button
                    key={date}
                    onClick={() => !isFuture && router.push(`/log/sleep?date=${date}`)}
                    disabled={isFuture}
                    className="flex items-center gap-2 w-full"
                  >
                    <span
                      className="w-7 text-right shrink-0 text-[10px] font-medium"
                      style={{ color: isToday ? '#fff' : '#636366' }}
                    >
                      {DAY_SHORT[i]}
                    </span>
                    <div className="flex-1 relative h-7">
                      <div className="absolute inset-0 rounded-sm" style={{ background: '#111' }} />
                      {bar ? (
                        <div
                          className="absolute top-0.5 bottom-0.5 rounded-sm flex items-center overflow-hidden"
                          style={{ left: `${bar.left}%`, width: `${bar.width}%`, background: color }}
                        >
                          {dur && (
                            <span className="px-1.5 text-[10px] font-semibold text-black whitespace-nowrap">
                              {dur}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="absolute inset-0 flex items-center pl-2">
                          <span className="text-[9px] text-muted">
                            {isFuture ? '' : 'tap to log'}
                          </span>
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Sleep stat pills */}
          <div className="px-4 mt-2 flex gap-2">
            {[
              { label: 'Avg sleep', value: avgSleep  > 0 ? fmtHrs(avgSleep)  : '—' },
              { label: 'Logged',    value: `${sleepDurs.length}/7` },
              { label: 'Best',      value: bestSleep > 0 ? fmtHrs(bestSleep) : '—' },
            ].map(({ label, value }) => (
              <div key={label} className="flex-1 bg-card rounded-xl px-3 py-3">
                <p className="text-[9px] font-semibold uppercase tracking-wide text-muted">{label}</p>
                <p className="text-lg font-bold mt-0.5" style={{ color: '#5AC8FA' }}>{value}</p>
              </div>
            ))}
          </div>
        </>
      )}

      <BottomNav />
    </main>
  )
}
