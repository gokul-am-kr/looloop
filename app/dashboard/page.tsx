export const dynamic = 'force-dynamic'

import { createServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { characters } from '@/lib/characters'
import { computeStreak } from '@/lib/streak'
import { type Edition } from '@/types'
import { ActivityRings } from '@/components/ui/activity-rings'
import { BottomNav } from '@/components/ui/bottom-nav'
import { CharacterChat } from '@/components/ui/character-chat'
import { WeekStrip } from '@/components/ui/week-strip'
import { MoodQuickLog } from '@/components/ui/mood-quick-log'


function MiniRing({ progress, color, filterId }: { progress: number; color: string; filterId: string }) {
  const r    = 14
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - Math.min(Math.max(progress, 0), 1))
  return (
    <svg width={36} height={36} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <defs>
        <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" in="SourceGraphic" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <circle cx={18} cy={18} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={3} />
      <circle cx={18} cy={18} r={r} fill="none"
        stroke={color} strokeWidth={3} strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset}
        filter={`url(#${filterId})`}
      />
    </svg>
  )
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
  const today        = new Date().toISOString().split('T')[0]
  const yesterday    = new Date(Date.now() - 86_400_000).toISOString().split('T')[0]

  const ninetyDaysAgo = new Date(Date.now() - 90 * 86_400_000).toISOString().split('T')[0]
  const nowIso = new Date().toISOString()
  const [{ data: habitLogs }, { data: sleepLogs }, { data: premiumRow }, { data: todayMoodRow }] = await Promise.all([
    supabase.from('habit_logs').select('date, habits').eq('user_id', user.id)
      .gte('date', ninetyDaysAgo).order('date', { ascending: false }),
    supabase.from('sleep_logs').select('date, bedtime, wake_time, quality').eq('user_id', user.id).gte('date', ninetyDaysAgo),
    supabase.from('premium_access').select('expires_at').eq('user_id', user.id)
      .gt('expires_at', nowIso).order('expires_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('mood_logs').select('mood').eq('user_id', user.id).eq('date', today).maybeSingle(),
  ])
  const isPremium   = !!premiumRow
  const todayMood   = todayMoodRow?.mood ?? 0

  const streak       = computeStreak((habitLogs ?? []).map(l => l.date))
  const habitByDate  = Object.fromEntries((habitLogs ?? []).map(l => [l.date, l.habits as Record<string, boolean>]))
  const sleepByDate  = Object.fromEntries((sleepLogs ?? []).map(l => [l.date, l]))

  const todayHabits  = habitByDate[today] ?? {}
  const todayDone    = habitNames.filter(h => todayHabits[h]).length
  const habitProgress = totalHabits > 0 ? todayDone / totalHabits : 0

  const lastSleep    = sleepByDate[yesterday] ?? sleepByDate[today]
  const sleepHrs     = lastSleep?.bedtime && lastSleep?.wake_time
    ? calcSleepHrs(lastSleep.bedtime, lastSleep.wake_time)
    : 0
  const sleepProgress = sleepHrs / 8   // intentionally > 1 when over goal — shows overlap

  async function signOut() {
    'use server'
    const supabase = await createServerClient()
    await supabase.auth.signOut()
    redirect('/auth')
  }

  const CARD_STYLE = {
    background: 'var(--card-bg)',
    borderTop: '0.5px solid var(--card-border-t)',
    borderLeft: '0.5px solid var(--card-border-l)',
    borderRight: '0.5px solid var(--card-border-r)',
    borderBottom: '0.5px solid var(--card-border-r)',
    boxShadow: 'var(--card-shadow)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
  } as const

  const QUICK_LINK_STYLE = {
    background: 'linear-gradient(145deg, rgba(255,255,255,0.11), rgba(255,255,255,0.04))',
    borderTop: '0.5px solid rgba(255,255,255,0.24)',
    borderLeft: '0.5px solid rgba(255,255,255,0.16)',
    borderRight: '0.5px solid rgba(255,255,255,0.04)',
    borderBottom: '0.5px solid rgba(255,255,255,0.04)',
    boxShadow: '0 8px 28px rgba(0,0,0,0.50), 0 2px 8px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.12)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
  } as const


  return (
    <main className="min-h-screen relative" style={{ background: 'var(--bg)', overflow: 'clip', paddingBottom: 140 }}>
      {/* Background orbs */}
      <div style={{ position: 'absolute', zIndex: 0, width: 300, height: 300, borderRadius: '50%', background: 'var(--orb1-color)', opacity: 0.60, filter: 'blur(90px)', top: -90, left: -80, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', zIndex: 0, width: 240, height: 240, borderRadius: '50%', background: 'var(--orb2-color)', opacity: 0.45, filter: 'blur(75px)', top: 140, right: -70, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', zIndex: 0, width: 240, height: 240, borderRadius: '50%', background: 'var(--orb3-color)', opacity: 0.25, filter: 'blur(100px)', bottom: 60, left: -20, pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div className="px-5 pt-14 pb-2 flex items-center justify-between">
          <h1 className="text-white text-base font-medium">{formattedToday()}</h1>
          <form action={signOut}>
            <button type="submit" className="text-xs transition-colors" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Sign out
            </button>
          </form>
        </div>

        {/* Week strip */}
        <WeekStrip
          habitByDate={habitByDate}
          sleepByDate={sleepByDate}
          habitNames={habitNames}
          totalHabits={totalHabits}
        />

        {/* Big concentric rings */}
        <div className="flex flex-col items-center mt-8">
          {/* Drop-shadow wrapper */}
          <div style={{ filter: 'drop-shadow(0 24px 64px rgba(0,0,0,0.75)) drop-shadow(0 0 32px hsla(var(--hue),60%,60%,0.14))' }}>
            {/* Circular glass card */}
            <div style={{
              width: 290,
              height: 290,
              borderRadius: '50%',
              background: 'radial-gradient(circle at 40% 35%, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.05) 40%, rgba(255,255,255,0.01) 100%)',
              borderTop: '0.5px solid rgba(255,255,255,0.22)',
              borderLeft: '0.5px solid rgba(255,255,255,0.14)',
              borderRight: '0.5px solid rgba(255,255,255,0.04)',
              borderBottom: '0.5px solid rgba(255,255,255,0.04)',
              boxShadow: '0 32px 80px rgba(0,0,0,0.80), 0 12px 40px rgba(0,0,0,0.60), 0 4px 12px rgba(0,0,0,0.40), inset 0 2px 0 rgba(255,255,255,0.12), inset 0 -2px 0 rgba(0,0,0,0.30), 0 0 60px hsla(var(--hue),60%,60%,0.12)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {/* Ring — smaller, floats inside the card */}
              <div style={{ width: 220, height: 220 }}>
                <ActivityRings
                  size={210}
                  strokeWidth={9}
                  gap={12}
                  centerBg="hsl(var(--hue),45%,5%)"
                  rings={[
                    { progress: habitProgress, color: 'var(--ring-done-1)', trackColor: 'rgba(255,255,255,0.04)', glowBlur: 10 },
                    { progress: sleepProgress, color: 'var(--ring-done-4)', trackColor: 'rgba(255,255,255,0.04)', glowBlur: 7 },
                  ]}
                >
                  <div className="text-center">
                    <p className="text-white text-3xl font-bold leading-none">
                      {todayDone}
                      <span className="text-xl font-medium" style={{ color: 'rgba(255,255,255,0.35)' }}>/{totalHabits}</span>
                    </p>
                    <p className="text-[11px] mt-1" style={{ color: 'rgba(255,255,255,0.38)' }}>habits</p>
                    <p className="mt-2 font-semibold leading-none" style={{ color: 'var(--accent)', fontSize: 15 }}>
                      {sleepHrs > 0 ? formatSleepHrs(sleepHrs) : '—'}
                    </p>
                    <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.38)' }}>sleep</p>
                  </div>
                </ActivityRings>
              </div>
            </div>
          </div>

          <p className="mt-3 text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>{character.name}</p>
          {streak > 0 && (
            <p className="mt-1 text-xs font-medium" style={{ color: 'var(--accent)' }}>🔥 {streak}-day streak</p>
          )}
        </div>

        {/* Metric cards */}
        <div className="px-5 mt-8 flex flex-col gap-2.5">
          {/* Habits + Sleep side by side */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {/* Habits card */}
            <Link href="/log/habits" style={{
              ...CARD_STYLE,
              borderRadius: 18,
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p style={{ color: 'var(--accent)', fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Habits</p>
                <MiniRing progress={habitProgress} color="hsl(var(--hue),85%,92%)" filterId="miniGlowHabits" />
              </div>
              <div>
                <p style={{ fontSize: 22, fontWeight: 500, color: '#ffffff', lineHeight: 1 }}>
                  {todayDone}<span style={{ fontSize: 14, fontWeight: 400, color: 'rgba(255,255,255,0.35)' }}>/{totalHabits}</span>
                </p>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>
                  {totalHabits === 0 ? 'Tap to set up' : `${totalHabits - todayDone} remaining`}
                </p>
              </div>
            </Link>

            {/* Sleep card */}
            <Link href="/log/sleep" style={{
              ...CARD_STYLE,
              borderRadius: 18,
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p style={{ color: 'var(--accent)', fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Sleep</p>
                <MiniRing progress={Math.min(sleepProgress, 1)} color="hsl(var(--hue),70%,80%)" filterId="miniGlowSleep" />
              </div>
              <div>
                {sleepHrs > 0 ? (
                  <>
                    <p style={{ fontSize: 22, fontWeight: 500, color: '#ffffff', lineHeight: 1 }}>
                      {formatSleepHrs(sleepHrs)}
                    </p>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>
                      {sleepHrs >= 8 ? 'Goal hit' : `${formatSleepHrs(8 - sleepHrs)} short`}
                    </p>
                  </>
                ) : (
                  <>
                    <p style={{ fontSize: 22, fontWeight: 500, color: 'rgba(255,255,255,0.25)', lineHeight: 1 }}>—</p>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>Log last night</p>
                  </>
                )}
              </div>
            </Link>
          </div>

          <MoodQuickLog
            userId={user.id}
            date={today}
            initialMood={todayMood}
          />
        </div>

        {/* Quick links */}
        <div className="px-5 mt-2.5 flex gap-2">
          <Link href="/certificate"
            className="flex-1 rounded-2xl text-center text-sm font-medium"
            style={{ ...QUICK_LINK_STYLE, color: 'rgba(255,255,255,0.75)', padding: '14px 18px' }}>
            Certificate
          </Link>
          {isPremium ? (
            <div className="flex-1 rounded-2xl text-center text-sm font-medium"
              style={{ ...QUICK_LINK_STYLE, color: 'var(--accent)', padding: '14px 18px' }}>
              Premium ✓
            </div>
          ) : (
            <Link href="/upgrade"
              className="flex-1 rounded-2xl text-center text-sm font-medium"
              style={{ ...QUICK_LINK_STYLE, color: 'var(--accent)', padding: '14px 18px' }}>
              Go Premium
            </Link>
          )}
        </div>
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
