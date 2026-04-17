'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'

interface SleepEntry { bedtime: string; wake_time: string; quality: number }

interface Props {
  habitByDate:  Record<string, Record<string, boolean>>
  sleepByDate:  Record<string, SleepEntry>
  habitNames:   string[]
  totalHabits:  number
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

function dayLetter(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'narrow' })
}

function dayNum(dateStr: string): number {
  return new Date(dateStr + 'T00:00:00').getDate()
}

// Build calendar weeks (Mon–Sun) going back WEEKS_BACK from today's week
const WEEKS_BACK = 12

function buildWeeks(): string[][] {
  const today = new Date()
  const dow   = today.getDay()                          // 0=Sun…6=Sat
  const toMon = dow === 0 ? -6 : 1 - dow               // offset to this Monday
  const thisMon = new Date(today)
  thisMon.setDate(today.getDate() + toMon)

  const startMon = new Date(thisMon)
  startMon.setDate(thisMon.getDate() - WEEKS_BACK * 7)

  const weeks: string[][] = []
  for (let w = 0; w <= WEEKS_BACK; w++) {
    const week: string[] = []
    for (let d = 0; d < 7; d++) {
      const date = new Date(startMon)
      date.setDate(startMon.getDate() + w * 7 + d)
      week.push(date.toISOString().split('T')[0])
    }
    weeks.push(week)
  }
  return weeks
}

export function WeekStrip({ habitByDate, sleepByDate, habitNames, totalHabits }: Props) {
  const scrollRef  = useRef<HTMLDivElement>(null)
  const todayStr   = new Date().toISOString().split('T')[0]
  const weeks      = buildWeeks()                       // last entry = current week

  // Snap to the current (last) week on mount
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollLeft = el.clientWidth * (weeks.length - 1)
  }, [weeks.length])

  return (
    <div
      ref={scrollRef}
      className="mt-4 overflow-x-auto"
      style={{
        scrollSnapType: 'x mandatory',
        scrollBehavior: 'smooth',
        scrollbarWidth: 'none',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      <div className="flex" style={{ width: `${weeks.length * 100}%` }}>
        {weeks.map((week, wi) => (
          <div
            key={wi}
            className="flex justify-between px-5"
            style={{ width: `${100 / weeks.length}%`, scrollSnapAlign: 'start', flexShrink: 0 }}
          >
            {week.map(date => {
              const isToday  = date === todayStr
              const isFuture = date > todayStr

              const dayLog   = habitByDate[date] ?? {}
              const done     = !isFuture && totalHabits > 0
                ? habitNames.filter(h => dayLog[h]).length : 0
              const habitPct = totalHabits > 0 ? done / totalHabits : 0
              const slept    = sleepByDate[date]
              const sleptHrs = !isFuture && slept?.bedtime && slept?.wake_time
                ? calcSleepHrs(slept.bedtime, slept.wake_time) : 0
              const sleepPct = Math.min(sleptHrs / 8, 1)

              const rings = (
                <div className="flex flex-col items-center gap-1.5">
                  <span className="text-[10px] font-medium"
                    style={{ color: isFuture ? 'rgba(255,255,255,0.15)' : isToday ? '#ffffff' : 'rgba(255,255,255,0.45)' }}>
                    {dayLetter(date)}
                  </span>
                  <div className="relative" style={{
                    width: 32, height: 32,
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.05)',
                    border: isToday
                      ? '0.5px solid rgba(255,255,255,0.28)'
                      : '0.5px solid rgba(255,255,255,0.10)',
                    boxShadow: isToday
                      ? '0 4px 16px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.15)'
                      : '0 4px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)',
                  }}>
                    <svg width={32} height={32} style={{ transform: 'rotate(-90deg)' }}>
                      {/* Habit ring track */}
                      <circle cx={16} cy={16} r={13} fill="none"
                        stroke="rgba(255,255,255,0.07)" strokeWidth={3.5} />
                      {!isFuture && (
                        <circle cx={16} cy={16} r={13} fill="none" strokeWidth={3.5}
                          strokeLinecap="round"
                          strokeDasharray={2 * Math.PI * 13}
                          strokeDashoffset={2 * Math.PI * 13 * (1 - habitPct)}
                          stroke="var(--ring-done-1)"
                          style={{ opacity: habitPct > 0 ? 1 : 0.25 }}
                        />
                      )}
                      {/* Sleep ring track */}
                      <circle cx={16} cy={16} r={7.5} fill="none"
                        stroke="rgba(255,255,255,0.07)" strokeWidth={3.5} />
                      {!isFuture && (
                        <circle cx={16} cy={16} r={7.5} fill="none" strokeWidth={3.5}
                          strokeLinecap="round"
                          strokeDasharray={2 * Math.PI * 7.5}
                          strokeDashoffset={2 * Math.PI * 7.5 * (1 - sleepPct)}
                          stroke="var(--ring-done-4)"
                          style={{ opacity: sleepPct > 0 ? 1 : 0.25 }}
                        />
                      )}
                    </svg>
                    {isToday ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      </div>
                    ) : !isFuture ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[8px]" style={{ color: 'rgba(255,255,255,0.45)' }}>{dayNum(date)}</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              )

              return isFuture ? (
                <div key={date} style={{ cursor: 'default' }}>{rings}</div>
              ) : (
                <Link key={date} href="/log/habits">{rings}</Link>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
