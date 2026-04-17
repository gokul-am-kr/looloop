'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import { BottomNav } from '@/components/ui/bottom-nav'
import { RadialHabitChart } from '@/components/ui/radial-habit-chart'
import { RadialSleepChart } from '@/components/ui/radial-sleep-chart'
import { RadialMoodChart, MOOD_LABELS, MOOD_EMOJI } from '@/components/ui/radial-mood-chart'
import { SleepScoreCard } from '@/components/ui/sleep-score-card'
import { computeSleepScore } from '@/lib/sleep-score'

type Tab = 'habits' | 'sleep' | 'mood'

const CHAR_EMOJI: Record<string, string> = { mochi: '🐱', pico: '🌵', jelli: '🪼', inko: '🐙' }
const CHAR_NAME:  Record<string, string> = {
  mochi: 'Mochi the Cat', pico: 'Pico the Cactus', jelli: 'Jelli the Jellyfish', inko: 'Inko the Octopus',
}

// Per-rank dot colors for habit list (rank 0 = highest completion = innermost ring)
const HABIT_DOT_COLORS = [
  { color: '#ffffff',  glow: '0 0 8px rgba(255,255,255,0.7), 0 0 3px rgba(255,255,255,0.7)' },
  { color: '#ebe9ff',  glow: '0 0 8px rgba(235,233,255,0.7), 0 0 3px rgba(235,233,255,0.7)' },
  { color: '#d2cefa',  glow: '0 0 8px rgba(210,206,250,0.7), 0 0 3px rgba(210,206,250,0.7)' },
  { color: '#b9b4f2',  glow: '0 0 8px rgba(185,180,242,0.7), 0 0 3px rgba(185,180,242,0.7)' },
  { color: '#918ae1',  glow: '0 0 8px rgba(145,138,225,0.7), 0 0 3px rgba(145,138,225,0.7)' },
]

const GLASS_CARD_STYLE = {
  background: 'linear-gradient(145deg, rgba(255,255,255,0.13) 0%, rgba(255,255,255,0.04) 60%, rgba(255,255,255,0.02) 100%)',
  borderTop: '0.5px solid rgba(255,255,255,0.28)',
  borderLeft: '0.5px solid rgba(255,255,255,0.18)',
  borderRight: '0.5px solid rgba(255,255,255,0.04)',
  borderBottom: '0.5px solid rgba(255,255,255,0.04)',
  boxShadow: '0 16px 48px rgba(0,0,0,0.65), 0 4px 12px rgba(0,0,0,0.45), 0 1px 3px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(0,0,0,0.20)',
  backdropFilter: 'blur(28px)',
  WebkitBackdropFilter: 'blur(28px)',
}

// ── Date helpers ─────────────────────────────────────────────────────────────

function getMonthRange(year: number, month: number) {
  const first = new Date(year, month, 1)
  const last  = new Date(year, month + 1, 0)
  return {
    start: first.toISOString().split('T')[0],
    end:   last.toISOString().split('T')[0],
    days:  last.getDate(),
  }
}


// ── Sleep helpers ─────────────────────────────────────────────────────────────

function sleepHrs(bedtime: string, wakeTime: string): number {
  const [bh, bm] = bedtime.split(':').map(Number)
  const [wh, wm] = wakeTime.split(':').map(Number)
  let bed  = bh * 60 + bm
  let wake = wh * 60 + wm
  if (bed  < 12 * 60) bed  += 1440
  if (wake < 12 * 60) wake += 1440
  if (wake <= bed)    wake += 1440
  return (wake - bed) / 60
}

function fmtHrs(hrs: number): string {
  const h = Math.floor(hrs)
  const m = Math.round((hrs - h) * 60)
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

// ── Types ────────────────────────────────────────────────────────────────────

interface HabitLog { date: string; habits: Record<string, boolean> }
interface SleepLog { date: string; bedtime: string; wake_time: string; quality: number }
interface MoodLog  { date: string; mood: number }

export default function SummaryPage() {
  const now   = new Date()
  const [year, setYear]   = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [tab, setTab]     = useState<Tab>('habits')

  const [habitNames, setHabitNames]   = useState<string[]>([])
  const [edition, setEdition]         = useState('mochi')
  const [habitLogs, setHabitLogs]     = useState<HabitLog[]>([])
  const [sleepLogs, setSleepLogs]     = useState<SleepLog[]>([])
  const [moodLogs, setMoodLogs]       = useState<MoodLog[]>([])
  const [loading, setLoading]         = useState(true)
  const [selectedHabit, setSelectedHabit] = useState<string | null>(null)

  const supabase    = createBrowserClient()
  const initialized = useRef(false)

  // Load habit names + edition once
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('users').select('habit_names, edition').eq('id', user.id).single()
        .then(({ data }) => {
          setHabitNames(data?.habit_names ?? [])
          setEdition(data?.edition ?? 'mochi')
        })
    })
  }, [])

  // Load logs whenever month/year changes
  useEffect(() => {
    setLoading(true)
    const { start, end } = getMonthRange(year, month)

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const [{ data: hl }, { data: sl }, { data: ml }] = await Promise.all([
        supabase.from('habit_logs').select('date, habits').eq('user_id', user.id).gte('date', start).lte('date', end),
        supabase.from('sleep_logs').select('date, bedtime, wake_time, quality').eq('user_id', user.id).gte('date', start).lte('date', end),
        supabase.from('mood_logs').select('date, mood').eq('user_id', user.id).gte('date', start).lte('date', end),
      ])
      setHabitLogs((hl ?? []) as HabitLog[])
      setSleepLogs((sl ?? []) as SleepLog[])
      setMoodLogs((ml ?? []) as MoodLog[])
      setLoading(false)
    })
  }, [year, month])

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth()
    if (isCurrentMonth) return
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  const router          = useRouter()
  const isCurrentMonth  = year === now.getFullYear() && month === now.getMonth()
  const monthLabel      = new Date(year, month).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
  const { days: daysInMonth } = getMonthRange(year, month)
  const todayDay        = isCurrentMonth ? now.getDate() : daysInMonth

  // Index logs by date
  const habitByDate  = Object.fromEntries(habitLogs.map(l => [l.date, l.habits]))
  const sleepByDate  = Object.fromEntries(sleepLogs.map(l => [l.date, l]))

  // ── Habit stats ────────────────────────────────────────────────────────────
  const totalHabits  = habitNames.length
  const trackedDays  = habitLogs.length
  const avgCompletion = trackedDays > 0
    ? Math.round(habitLogs.reduce((sum, l) => {
        const done = habitNames.filter(h => l.habits[h]).length
        return sum + (totalHabits > 0 ? done / totalHabits : 0)
      }, 0) / trackedDays * 100)
    : 0

  // ── Sleep stats ────────────────────────────────────────────────────────────
  const sleepTracked = sleepLogs.length
  const durations    = sleepLogs.map(l => sleepHrs(l.bedtime, l.wake_time))
  const avgSleep     = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0
  const avgQuality   = sleepLogs.length > 0
    ? sleepLogs.reduce((a, l) => a + l.quality, 0) / sleepLogs.length
    : 0
  const goalNights   = durations.filter(d => d >= 8).length

  // Last 7 logs for score card (uses month data, sorted desc)
  const last7Sleep   = [...sleepLogs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7)
  const sleepScore   = computeSleepScore(last7Sleep, 7)

  // ── Sorted habits ────────────────────────────────────────────────────────────
  const sortedHabits = [...habitNames].sort((a, b) => {
    const pct = (h: string) => {
      if (todayDay === 0) return 0
      const done = Array.from({ length: todayDay }, (_, i) => i + 1).filter(d => {
        const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
        return habitByDate[ds]?.[h] ?? false
      }).length
      return done / todayDay
    }
    return pct(b) - pct(a)
  })

  // ── Mood stats ───────────────────────────────────────────────────────────────
  const moodTracked  = moodLogs.length
  const avgMood      = moodTracked > 0
    ? moodLogs.reduce((a, l) => a + l.mood, 0) / moodTracked
    : 0
  const topMood      = moodTracked > 0
    ? moodLogs.reduce((best, l) => l.mood > best ? l.mood : best, 0)
    : 0

  return (
    <main className="min-h-screen pb-28 relative" style={{ background: '#07051a', overflow: 'clip' }}>
      {/* Background orbs */}
      <div style={{ position: 'absolute', zIndex: 0, width: 300, height: 300, borderRadius: '50%', background: '#7F77DD', opacity: 0.65, filter: 'blur(90px)', top: -90, left: -80, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', zIndex: 0, width: 240, height: 240, borderRadius: '50%', background: '#534AB7', opacity: 0.50, filter: 'blur(75px)', top: 140, right: -70, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', zIndex: 0, width: 240, height: 240, borderRadius: '50%', background: '#AFA9EC', opacity: 0.30, filter: 'blur(100px)', bottom: 50, left: -20, pointerEvents: 'none' }} />

      {/* ── Header — minimal, elegant ── */}
      <div className="px-5 pt-12 flex flex-col gap-4" style={{ position: 'relative', zIndex: 1 }}>
        {/* Month nav */}
        <div className="flex items-center justify-between">
          <button onClick={prevMonth}
            className="w-8 h-8 flex items-center justify-center rounded-full transition-colors"
            style={{ color: '#7A7A86' }}>
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
              <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.6"
                strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <div className="text-center">
            <p className="text-white font-light tracking-widest text-sm uppercase"
              style={{ letterSpacing: '0.18em' }}>{monthLabel}</p>
          </div>

          <div className="flex items-center gap-1">
            <button onClick={nextMonth} disabled={isCurrentMonth}
              className="w-8 h-8 flex items-center justify-center rounded-full transition-colors"
              style={{ color: isCurrentMonth ? '#2A2A32' : '#7A7A86' }}>
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                <path d="M7.5 5L12.5 10L7.5 15" stroke="currentColor" strokeWidth="1.6"
                  strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button onClick={() => router.push('/summary/week')}
              className="text-[10px] px-2.5 py-1 rounded-lg font-medium tracking-wide"
              style={{ background: 'rgba(255,255,255,0.05)', color: '#7A7A86', border: '1px solid rgba(255,255,255,0.06)' }}>
              Weekly
            </button>
          </div>
        </div>

        {/* Tab toggle — glass */}
        <div className="flex gap-1.5">
          {(['habits', 'sleep', 'mood'] as Tab[]).map(t => {
            const isActive = tab === t
            return (
              <button key={t} onClick={() => setTab(t)}
                className="flex-1 py-2 text-xs font-semibold capitalize rounded-[20px] transition-all duration-200"
                style={isActive ? {
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.16), rgba(255,255,255,0.06))',
                  borderTop: '0.5px solid rgba(255,255,255,0.32)',
                  borderLeft: '0.5px solid rgba(255,255,255,0.20)',
                  borderRight: '0.5px solid rgba(255,255,255,0.05)',
                  borderBottom: '0.5px solid rgba(255,255,255,0.05)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.50), 0 1px 4px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.15)',
                  color: '#ffffff',
                  letterSpacing: '0.05em',
                } : {
                  background: 'transparent',
                  border: '0.5px solid rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.28)',
                  letterSpacing: '0.05em',
                }}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            )
          })}
        </div>
      </div>

      {loading ? (
        <p className="px-5 mt-8 text-sm text-muted" style={{ position: 'relative', zIndex: 1 }}>Loading…</p>
      ) : (
        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Chart area */}
          {tab === 'habits' ? (
            <div className="flex flex-col">
              {/* Fan chart — 92% width, centered */}
              <div className="mt-2 mx-auto" style={{ width: '92%' }}>
                <RadialHabitChart
                  habitNames={habitNames}
                  habitByDate={habitByDate}
                  year={year}
                  month={month}
                  edition={edition}
                  onDayClick={(date) => router.push(`/log/habits?date=${date}`)}
                />
              </div>

              {/* Summary — below the chart */}
              <div className="px-5 mt-4 flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <PremiumStatCard
                    label="DAYS LOGGED"
                    value={`${trackedDays}`}
                    sub={`of ${todayDay} days`}
                    color="var(--char-accent)"
                  />
                  <PremiumStatCard
                    label="AVG DONE"
                    value={`${avgCompletion}%`}
                    sub="completion"
                    color="var(--char-accent)"
                  />
                </div>
                {sortedHabits.length > 0 && (
                  <div className="rounded-[20px]" style={GLASS_CARD_STYLE}>
                    {sortedHabits.map((habit, rank) => (
                      <HabitCard
                        key={habit}
                        habit={habit}
                        rank={rank}
                        isLast={rank === sortedHabits.length - 1}
                        year={year}
                        month={month}
                        daysInMonth={daysInMonth}
                        todayDay={todayDay}
                        habitByDate={habitByDate}
                        onSelect={() => setSelectedHabit(habit)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : tab === 'sleep' ? (
            <div className="px-3 mt-3 flex flex-col gap-4">
              <RadialSleepChart
                sleepByDate={sleepByDate}
                year={year}
                month={month}
                onDayClick={(date) => router.push(`/log/sleep?date=${date}`)}
              />
            </div>
          ) : (
            <div className="px-3 mt-3">
              <RadialMoodChart
                logs={moodLogs}
                year={year}
                month={month}
                edition={edition}
                onDayClick={(date) => router.push(`/log/mood?date=${date}`)}
              />
            </div>
          )}

          {/* Stats */}
          {tab === 'habits' ? null : tab === 'sleep' ? (
            <div className="px-5 mt-6 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <StatCard label="Avg sleep" value={avgSleep > 0 ? fmtHrs(avgSleep) : '—'}
                  sub="per night" color="#5AC8FA" />
                <StatCard label="Days logged" value={`${sleepTracked}`}
                  sub={`of ${todayDay} days`} color="#5AC8FA" />
                <StatCard label="Avg quality" value={avgQuality > 0 ? avgQuality.toFixed(1) : '—'}
                  sub="out of 5" color="#5AC8FA" />
                <StatCard label="Goal nights" value={`${goalNights}`}
                  sub="8h or more" color="#5AC8FA" />
              </div>
              {sleepScore.nightsLogged > 0 && (
                <SleepScoreCard
                  score={sleepScore}
                  charName={CHAR_NAME[edition] ?? 'Mochi the Cat'}
                  charEmoji={CHAR_EMOJI[edition] ?? '🐱'}
                  streak={0}
                />
              )}
            </div>
          ) : (
            <div className="px-5 mt-6 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <StatCard label="Days logged" value={`${moodTracked}`}
                  sub={`of ${todayDay} days`} color="#BF5AF2" />
                <StatCard label="Avg mood" value={avgMood > 0 ? avgMood.toFixed(1) : '—'}
                  sub="out of 5" color="#BF5AF2" />
                <StatCard label="Best mood" value={topMood > 0 ? MOOD_EMOJI[topMood] : '—'}
                  sub={topMood > 0 ? MOOD_LABELS[topMood] : 'no data'} color="#BF5AF2" />
                <StatCard label="This month" value={moodTracked > 0 ? `${Math.round(moodTracked / todayDay * 100)}%` : '—'}
                  sub="days tracked" color="#BF5AF2" />
              </div>
              <button
                onClick={() => router.push('/log/mood')}
                className="w-full rounded-2xl py-3.5 text-sm font-semibold text-black"
                style={{ background: '#BF5AF2' }}
              >
                Log today&apos;s mood
              </button>
            </div>
          )}
        </div>
      )}

      {/* Per-habit detail sheet */}
      {selectedHabit !== null && (
        <HabitDetailSheet
          habit={selectedHabit}
          year={year}
          month={month}
          monthLabel={monthLabel}
          daysInMonth={daysInMonth}
          todayDay={todayDay}
          habitByDate={habitByDate}
          onClose={() => setSelectedHabit(null)}
        />
      )}

      <BottomNav />
    </main>
  )
}

function HabitCard({
  habit, year, month, daysInMonth: _daysInMonth, todayDay, habitByDate, onSelect, rank, isLast,
}: {
  habit: string
  year: number
  month: number
  daysInMonth: number
  todayDay: number
  habitByDate: Record<string, Record<string, boolean>>
  onSelect: () => void
  rank: number
  isLast: boolean
}) {
  const daysDone = Array.from({ length: todayDay }, (_, i) => i + 1).filter(d => {
    const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    return habitByDate[ds]?.[habit] ?? false
  }).length
  const pct = todayDay > 0 ? Math.round(daysDone / todayDay * 100) : 0
  const dot = HABIT_DOT_COLORS[Math.min(rank, HABIT_DOT_COLORS.length - 1)]

  return (
    <div
      onClick={onSelect}
      className="px-4 py-3.5 flex items-center gap-3 cursor-pointer active:opacity-70 transition-opacity"
      style={isLast ? {} : { borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}
    >
      <div style={{ width: 11, height: 11, borderRadius: '50%', flexShrink: 0, background: dot.color, boxShadow: dot.glow }} />
      <p className="flex-1 text-sm font-medium truncate" style={{ color: 'rgba(255,255,255,0.88)' }}>{habit}</p>
      <p className="text-sm font-medium shrink-0" style={{ color: 'rgba(255,255,255,0.35)' }}>{pct}%</p>
    </div>
  )
}

function StatCard({ label, value, sub, color: _color }: {
  label: string; value: string; sub: string; color: string
}) {
  return (
    <div className="rounded-[20px] px-4 py-4" style={GLASS_CARD_STYLE}>
      <p className="text-[10px] uppercase tracking-[0.08em] mb-1.5" style={{ color: 'rgba(175,169,236,0.90)' }}>{label}</p>
      <p className="text-[26px] font-medium leading-none" style={{ color: '#ffffff', textShadow: '0 2px 12px rgba(175,169,236,0.30)' }}>{value}</p>
      {sub && <p className="text-[10px] mt-1" style={{ color: 'rgba(175,169,236,0.45)' }}>{sub}</p>}
    </div>
  )
}

function PremiumStatCard({ label, value, sub, color: _color }: {
  label: string; value: string; sub: string; color: string
}) {
  return (
    <div className="rounded-[20px] px-4 py-4" style={GLASS_CARD_STYLE}>
      <p className="text-[10px] uppercase tracking-[0.08em] mb-1.5" style={{ color: 'rgba(175,169,236,0.90)' }}>{label}</p>
      <p className="text-[26px] font-medium leading-none" style={{ color: '#ffffff', textShadow: '0 2px 12px rgba(175,169,236,0.30)' }}>{value}</p>
      {sub && <p className="text-[10px] mt-1" style={{ color: 'rgba(175,169,236,0.45)' }}>{sub}</p>}
    </div>
  )
}

// ── Fan chart helpers (same geometry as RadialHabitChart) ────────────────────
const SF_START = 100
const SF_END   = 260
const SF_SPAN  = SF_END - SF_START  // 160°
const SF_R1    = 30   // inner radius of ring
const SF_R2    = 54   // outer radius of ring
const SF_RLBL  = 19   // radius for day labels (inside ring)

function sfXY(cx: number, cy: number, r: number, deg: number): [number, number] {
  const rad = (deg * Math.PI) / 180
  return [cx + r * Math.cos(rad), cy - r * Math.sin(rad)]
}

function sfSeg(cx: number, cy: number, a1: number, a2: number): string {
  const [ax, ay]   = sfXY(cx, cy, SF_R1, a1)
  const [bx, by]   = sfXY(cx, cy, SF_R1, a2)
  const [ccx, ccy] = sfXY(cx, cy, SF_R2, a2)
  const [dx, dy]   = sfXY(cx, cy, SF_R2, a1)
  const large = (a2 - a1 > 180) ? 1 : 0
  return (
    `M ${ax.toFixed(2)} ${ay.toFixed(2)} ` +
    `A ${SF_R1} ${SF_R1} 0 ${large} 0 ${bx.toFixed(2)} ${by.toFixed(2)} ` +
    `L ${ccx.toFixed(2)} ${ccy.toFixed(2)} ` +
    `A ${SF_R2} ${SF_R2} 0 ${large} 1 ${dx.toFixed(2)} ${dy.toFixed(2)} Z`
  )
}

function computeHabitStreak(
  habit: string,
  habitByDate: Record<string, Record<string, boolean>>,
  year: number,
  month: number,
  daysInMonth: number,
  todayDay: number,
): number {
  let best = 0
  let cur  = 0
  const limit = todayDay
  for (let d = 1; d <= limit; d++) {
    const ds   = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const done = habitByDate[ds]?.[habit] ?? false
    if (done) { cur++; best = Math.max(best, cur) } else { cur = 0 }
  }
  return best
}



function HabitDetailSheet({
  habit, year, month, monthLabel, daysInMonth, todayDay, habitByDate, onClose,
}: {
  habit: string
  year: number
  month: number
  monthLabel: string
  daysInMonth: number
  todayDay: number
  habitByDate: Record<string, Record<string, boolean>>
  onClose: () => void
}) {
  const daysDone   = Array.from({ length: todayDay }, (_, i) => i + 1)
    .filter(d => {
      const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      return habitByDate[ds]?.[habit] ?? false
    }).length
  const pct        = todayDay > 0 ? Math.round(daysDone / todayDay * 100) : 0
  const bestStreak = computeHabitStreak(habit, habitByDate, year, month, daysInMonth, todayDay)

  // Fan chart geometry
  const anglePerDay   = SF_SPAN / daysInMonth
  const days          = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const showLbl       = (d: number) => d === 1 || d % 5 === 0 || d === daysInMonth
  const CX            = SF_R2 + 8
  const CY            = Math.ceil(SF_R2 * Math.sin((SF_START * Math.PI) / 180)) + 16
  const vbW           = CX + 72   // room for completion label on right
  const vbH           = CY + SF_R2 + 16

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.5)' }}
        onClick={onClose}
      />
      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl px-4 pt-4 pb-8"
        style={{
          background: 'rgba(5,5,7,0.92)',
          backdropFilter: 'blur(48px) saturate(200%)',
          WebkitBackdropFilter: 'blur(48px) saturate(200%)',
          border: '1px solid rgba(255,255,255,0.08)',
          maxHeight: '58vh',
          overflowY: 'auto',
        }}
      >
        {/* Handle */}
        <div className="w-8 h-1 rounded-full mx-auto mb-3" style={{ background: 'rgba(255,255,255,0.15)' }} />

        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-white text-base font-bold truncate">{habit}</p>
            <p className="text-[11px] text-muted">{monthLabel}</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center text-muted">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
              <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Stats + chart side by side */}
        <div className="flex items-center gap-3">
          {/* Fan chart — constrained width */}
          <div style={{ width: '52%', flexShrink: 0 }}>
            <svg
              viewBox={`0 0 ${vbW} ${vbH}`}
              width="100%"
              style={{ overflow: 'visible' }}
            >

          {days.map((day) => {
            const a1       = SF_START + (day - 1) * anglePerDay
            const a2       = SF_START + day * anglePerDay
            const aMid     = SF_START + (day - 0.5) * anglePerDay
            const ds       = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const done     = habitByDate[ds]?.[habit] ?? false
            const isFuture = day > todayDay
            const [lx, ly] = sfXY(CX, CY, SF_RLBL, aMid)
            return (
              <g key={day}>
                <path
                  d={sfSeg(CX, CY, a1, a2)}
                  fill={isFuture ? '#111111' : done ? 'var(--char-accent)' : '#2C2C2E'}
                  stroke="#000"
                  strokeWidth="0.6"
                />
                {showLbl(day) && (
                  <text
                    x={lx} y={ly}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#7A7A86"
                    fontSize="6"
                    fontFamily="-apple-system, BlinkMacSystemFont, sans-serif"
                  >
                    {day}
                  </text>
                )}
              </g>
            )
          })}

          {/* Completion % at pivot */}
          <text
            x={CX} y={CY - 5}
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ fill: 'var(--char-accent)' }}
            fontSize="11"
            fontWeight="700"
            fontFamily="-apple-system, BlinkMacSystemFont, sans-serif"
          >
            {pct}%
          </text>
          <text
            x={CX} y={CY + 7}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#7A7A86"
            fontSize="6.5"
            fontFamily="-apple-system, BlinkMacSystemFont, sans-serif"
          >
            done
          </text>
            </svg>
          </div>

          {/* Side stats */}
          <div className="flex-1 flex flex-col gap-3">
            {[
              { label: 'Completion', value: `${pct}%`, accent: true },
              { label: 'Days done',  value: `${daysDone}/${todayDay}`, accent: false },
              { label: 'Best streak', value: `${bestStreak}d`, accent: false },
            ].map(({ label, value, accent }) => (
              <div key={label} className="rounded-xl px-3 py-2.5"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.07)',
                }}>
                <p className="text-[9px] text-muted uppercase tracking-widest">{label}</p>
                <p className="text-lg font-bold leading-tight mt-0.5"
                  style={{ color: accent ? 'var(--char-accent)' : '#fff' }}>{value}</p>
              </div>
            ))}

            {/* Legend */}
            <div className="flex flex-col gap-1 mt-1">
              {[
                { label: 'Done',   bg: 'var(--char-accent)' },
                { label: 'Missed', bg: '#2C2C2E' },
                { label: 'Future', bg: '#111111' },
              ].map(({ label, bg }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-sm" style={{ background: bg }} />
                  <span className="text-[10px] text-muted">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
