import { createServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { characters } from '@/lib/characters'
import { computeStreak } from '@/lib/streak'
import { type Edition } from '@/types'
import { ActivityRings } from '@/components/ui/activity-rings'
import { BottomNav } from '@/components/ui/bottom-nav'
import { CharacterChat } from '@/components/ui/character-chat'

function getPast7Dates(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d.toISOString().split('T')[0]
  })
}

function dayLetter(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'narrow' })
}

function formattedToday(): string {
  return new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'short',
  })
}

function calcSleepHrs(bedtime: string, wakeTime: string): number {
  const [bh, bm] = bedtime.split(':').map(Number)
  const [wh, wm] = wakeTime.split(':').map(Number)
  let bed  = bh * 60 + bm
  let wake = wh * 60 + wm
  if (bed  < 12 * 60) bed  += 1440
  if (wake < 12 * 60) wake += 1440
  if (wake <= bed)    wake += 1440
  return (wake - bed) / 60
}

function formatSleepHrs(hrs: number): string {
  const h = Math.floor(hrs)
  const m = Math.round((hrs - h) * 60)
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

export default async function DashboardPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth')

  const { data: profile } = await supabase
    .from('users')
    .select('edition, habit_names')
    .eq('id', user.id)
    .single()

  if (!profile?.edition) redirect('/quiz')

  const character    = characters[profile.edition as Edition]
  const habitNames: string[] = profile.habit_names ?? []
  const totalHabits  = habitNames.length
  const dates        = getPast7Dates()
  const today        = dates[dates.length - 1]

  const ninetyDaysAgo = new Date(Date.now() - 90 * 86_400_000).toISOString().split('T')[0]
  const nowIso = new Date().toISOString()
  const [{ data: habitLogs }, { data: sleepLogs }, { data: premiumRow }] = await Promise.all([
    supabase.from('habit_logs').select('date, habits').eq('user_id', user.id)
      .gte('date', ninetyDaysAgo).order('date', { ascending: false }),
    supabase.from('sleep_logs').select('date, bedtime, wake_time, quality').eq('user_id', user.id).in('date', dates),
    supabase.from('premium_access').select('expires_at').eq('user_id', user.id)
      .gt('expires_at', nowIso).order('expires_at', { ascending: false }).limit(1).maybeSingle(),
  ])
  const isPremium = !!premiumRow

  const streak       = computeStreak((habitLogs ?? []).map(l => l.date))
  const habitByDate  = Object.fromEntries((habitLogs ?? []).map(l => [l.date, l.habits as Record<string, boolean>]))
  const sleepByDate  = Object.fromEntries((sleepLogs ?? []).map(l => [l.date, l]))

  const todayHabits  = habitByDate[today] ?? {}
  const todayDone    = habitNames.filter(h => todayHabits[h]).length
  const habitProgress = totalHabits > 0 ? todayDone / totalHabits : 0

  const todaySleep   = sleepByDate[today]
  const sleepHrs     = todaySleep?.bedtime && todaySleep?.wake_time
    ? calcSleepHrs(todaySleep.bedtime, todaySleep.wake_time)
    : 0
  const sleepProgress = Math.min(sleepHrs / 8, 1)

  async function signOut() {
    'use server'
    const supabase = await createServerClient()
    await supabase.auth.signOut()
    redirect('/auth')
  }

  return (
    <main className="min-h-screen pb-24">
      {/* Header */}
      <div className="px-5 pt-14 pb-2 flex items-center justify-between">
        <h1 className="text-white text-base font-medium">{formattedToday()}</h1>
        <form action={signOut}>
          <button type="submit" className="text-xs transition-colors" style={{ color: '#636366' }}>
            Sign out
          </button>
        </form>
      </div>

      {/* Week strip */}
      <div className="px-5 mt-4 flex justify-between">
        {dates.map((date, i) => {
          const isToday    = i === 6
          const dayLog     = habitByDate[date] ?? {}
          const done       = habitNames.filter(h => dayLog[h]).length
          const habitPct   = totalHabits > 0 ? done / totalHabits : 0
          const slept      = sleepByDate[date]
          const sleptHrs   = slept?.bedtime && slept?.wake_time ? calcSleepHrs(slept.bedtime, slept.wake_time) : 0
          const sleepPct   = Math.min(sleptHrs / 8, 1)

          return (
            <Link key={date} href="/log/habits" className="flex flex-col items-center gap-1.5">
              <span className="text-[11px] font-medium" style={{ color: isToday ? '#ffffff' : '#636366' }}>
                {dayLetter(date)}
              </span>
              <div className="relative" style={{ width: 32, height: 32 }}>
                <svg width={32} height={32} style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx={16} cy={16} r={13} fill="none" stroke="#1A1A1A" strokeWidth={3.5} />
                  <circle cx={16} cy={16} r={13} fill="none" strokeWidth={3.5}
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 13}
                    strokeDashoffset={2 * Math.PI * 13 * (1 - habitPct)}
                    style={{ stroke: 'var(--char-accent)', opacity: habitPct > 0 ? 1 : 0.3 }}
                  />
                  <circle cx={16} cy={16} r={7.5} fill="none" stroke="#111" strokeWidth={3.5} />
                  <circle cx={16} cy={16} r={7.5} fill="none" stroke="#5AC8FA" strokeWidth={3.5}
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 7.5}
                    strokeDashoffset={2 * Math.PI * 7.5 * (1 - sleepPct)}
                    style={{ opacity: sleepPct > 0 ? 1 : 0.3 }}
                  />
                </svg>
                {isToday && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  </div>
                )}
              </div>
            </Link>
          )
        })}
      </div>

      {/* Big concentric rings */}
      <div className="flex flex-col items-center mt-10">
        <ActivityRings
          size={210}
          strokeWidth={18}
          gap={10}
          rings={[
            { progress: habitProgress, color: 'var(--char-accent)', trackColor: '#1A1A1A' },
            { progress: sleepProgress, color: '#5AC8FA', trackColor: '#111' },
          ]}
        >
          <div className="text-center">
            <p className="text-white text-3xl font-bold leading-none">
              {todayDone}
              <span className="text-xl font-medium" style={{ color: '#636366' }}>/{totalHabits}</span>
            </p>
            <p className="text-[11px] mt-1" style={{ color: '#636366' }}>habits</p>
            <p className="mt-2 font-semibold leading-none" style={{ color: '#5AC8FA', fontSize: 15 }}>
              {sleepHrs > 0 ? formatSleepHrs(sleepHrs) : '—'}
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: '#636366' }}>sleep</p>
          </div>
        </ActivityRings>

        <p className="mt-3 text-sm" style={{ color: '#636366' }}>{character.name}</p>
        {streak > 0 && (
          <p className="mt-1 text-xs font-medium" style={{ color: 'var(--char-accent)' }}>🔥 {streak}-day streak</p>
        )}
      </div>

      {/* Metric cards */}
      <div className="px-5 mt-8 flex flex-col gap-2.5">
        <Link href="/log/habits" className="glass rounded-2xl px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium" style={{ color: 'var(--char-accent)' }}>Habits</p>
            <p className="text-white text-3xl font-bold mt-1 leading-none">
              {todayDone}
              <span className="text-lg font-medium" style={{ color: '#636366' }}>/{totalHabits}</span>
            </p>
            {totalHabits === 0 && <p className="text-xs mt-1" style={{ color: '#636366' }}>Tap to set up your habits</p>}
          </div>
          <div className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: 'var(--char-accent10)' }}>
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
              <path d="M2 9l4.5 4.5L16 4" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round"
                style={{ stroke: 'var(--char-accent)' }} />
            </svg>
          </div>
        </Link>

        <Link href="/log/sleep" className="glass rounded-2xl px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium" style={{ color: '#5AC8FA' }}>Sleep</p>
            {sleepHrs > 0 ? (
              <>
                <p className="text-white text-3xl font-bold mt-1 leading-none">
                  {formatSleepHrs(sleepHrs)}
                </p>
                <p className="text-xs mt-1" style={{ color: '#636366' }}>
                  Quality {todaySleep?.quality}/5 · {sleepHrs >= 8 ? 'Goal hit' : `${formatSleepHrs(8 - sleepHrs)} short`}
                </p>
              </>
            ) : (
              <p className="text-sm mt-1" style={{ color: '#636366' }}>Log last night's sleep</p>
            )}
          </div>
          <div className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: '#5AC8FA15' }}>
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
              <path d="M15.5 9.66A7.5 7.5 0 1 1 8.34 2.5 5.5 5.5 0 0 0 15.5 9.66z"
                stroke="#5AC8FA" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </div>
        </Link>
      </div>

      {/* Quick links */}
      <div className="px-5 mt-2.5 flex gap-2">
        <Link href="/certificate"
          className="glass flex-1 rounded-2xl py-3 text-center text-xs font-medium"
          style={{ color: '#636366' }}>
          Certificate
        </Link>
        {isPremium ? (
          <div className="glass flex-1 rounded-2xl py-3 text-center text-xs font-medium"
            style={{ color: 'var(--char-accent)' }}>
            Premium ✓
          </div>
        ) : (
          <Link href="/upgrade"
            className="glass flex-1 rounded-2xl py-3 text-center text-xs font-medium"
            style={{ color: 'var(--char-accent)' }}>
            Go Premium
          </Link>
        )}
      </div>

      <BottomNav />

      <CharacterChat
        edition={profile.edition as Edition}
        charName={character.name}
        streak={streak}
      />
    </main>
  )
}
