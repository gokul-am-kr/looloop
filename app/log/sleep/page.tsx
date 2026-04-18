'use client'

import { useEffect, useRef, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import { BottomNav } from '@/components/ui/bottom-nav'
import { TimePicker } from '@/components/ui/time-picker'

// Timeline: 8pm → 10am = 14 hours
const TIMELINE_START_MINS = 20 * 60  // 8pm in minutes from midnight
const TIMELINE_SPAN_MINS  = 14 * 60  // 14 hours

const AXIS: { label: string; pct: number }[] = [
  { label: '8p',  pct: 0 },
  { label: '10p', pct: (2 / 14) * 100 },
  { label: '12a', pct: (4 / 14) * 100 },
  { label: '2a',  pct: (6 / 14) * 100 },
  { label: '4a',  pct: (8 / 14) * 100 },
  { label: '6a',  pct: (10 / 14) * 100 },
  { label: '8a',  pct: (12 / 14) * 100 },
  { label: '10a', pct: 100 },
]

const QUALITY_LABELS = ['Terrible', 'Poor', 'OK', 'Good', 'Great']

interface SleepEntry {
  bedtime: string
  wake_time: string
  quality: number
  notes: string
}

const EMPTY: SleepEntry = { bedtime: '', wake_time: '', quality: 0, notes: '' }

type Mode = 'chart' | 'edit'

const ORB1: React.CSSProperties = {
  position: 'absolute', top: -60, left: -60,
  width: 300, height: 300, borderRadius: '50%',
  background: 'var(--orb1-color)',
  filter: 'blur(90px)',
  opacity: 0.65, zIndex: 0, pointerEvents: 'none',
}
const ORB2: React.CSSProperties = {
  position: 'absolute', top: '38%', right: -60,
  width: 240, height: 240, borderRadius: '50%',
  background: 'var(--orb2-color)',
  filter: 'blur(75px)',
  opacity: 0.50, zIndex: 0, pointerEvents: 'none',
}
const ORB3: React.CSSProperties = {
  position: 'absolute', bottom: 80, left: -40,
  width: 240, height: 240, borderRadius: '50%',
  background: 'var(--orb3-color)',
  filter: 'blur(100px)',
  opacity: 0.30, zIndex: 0, pointerEvents: 'none',
}

const GLASS_CARD: React.CSSProperties = {
  background: 'linear-gradient(145deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 60%, rgba(255,255,255,0.02) 100%)',
  borderTop: '0.5px solid rgba(255,255,255,0.22)',
  borderLeft: '0.5px solid rgba(255,255,255,0.14)',
  borderRight: '0.5px solid rgba(255,255,255,0.04)',
  borderBottom: '0.5px solid rgba(255,255,255,0.04)',
  boxShadow: '0 12px 40px rgba(0,0,0,0.55), 0 4px 12px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.10)',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  borderRadius: 20,
}

// Returns days 1 → today for current month, most recent first
function getMonthDays(): string[] {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const today = now.getDate()
  return Array.from({ length: today }, (_, i) => {
    const d = new Date(year, month, today - i)
    return d.toISOString().split('T')[0]
  })
}

function timeToMins(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

// Normalize minutes to account for overnight crossing
function normalizeMins(mins: number): number {
  if (mins < 12 * 60) return mins + 1440  // before noon = next day
  return mins
}

function getBarPosition(bedtime: string, wake_time: string): { left: number; width: number } | null {
  if (!bedtime || !wake_time) return null
  const bed  = normalizeMins(timeToMins(bedtime))
  let wake = normalizeMins(timeToMins(wake_time))
  if (wake <= bed) wake += 1440

  const left  = ((bed - TIMELINE_START_MINS) / TIMELINE_SPAN_MINS) * 100
  const width = ((wake - bed) / TIMELINE_SPAN_MINS) * 100
  return { left: Math.max(0, left), width: Math.min(width, 100 - Math.max(0, left)) }
}

function getDurationLabel(bedtime: string, wake_time: string): string {
  if (!bedtime || !wake_time) return ''
  const bed  = normalizeMins(timeToMins(bedtime))
  let wake = normalizeMins(timeToMins(wake_time))
  if (wake <= bed) wake += 1440
  const hrs = (wake - bed) / 60
  const rounded = Math.round(hrs * 2) / 2
  return rounded % 1 === 0 ? `${rounded}` : `${rounded}`
}

// Returns background + boxShadow based on quality tier
function getBarStyle(quality: number): React.CSSProperties {
  if (quality >= 4) return {
    background: 'linear-gradient(90deg, hsl(var(--hue),70%,72%), hsl(var(--hue),80%,82%))',
    boxShadow: '0 2px 12px hsla(var(--hue),70%,60%,0.45)',
  }
  if (quality === 3) return {
    background: 'linear-gradient(90deg, hsl(var(--hue),55%,52%), hsl(var(--hue),60%,62%))',
    boxShadow: '0 2px 8px hsla(var(--hue),55%,45%,0.35)',
  }
  return {
    background: 'linear-gradient(90deg, hsl(var(--hue),35%,30%), hsl(var(--hue),40%,38%))',
    boxShadow: '0 2px 6px hsla(var(--hue),35%,25%,0.30)',
  }
}

export default function SleepPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <p className="text-muted text-sm">Loading…</p>
      </div>
    }>
      <SleepContent />
    </Suspense>
  )
}

function SleepContent() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const dateParam    = searchParams.get('date')
  const days = getMonthDays()
  const todayStr = days[0]

  const [mode, setMode] = useState<Mode>('chart')
  const [logByDate, setLogByDate] = useState<Record<string, SleepEntry>>({})
  const [selectedDate, setSelectedDate] = useState(todayStr)
  const [editEntry, setEditEntry] = useState<SleepEntry>({ ...EMPTY })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const supabase = createBrowserClient()
  const initialized = useRef(false)

  const now = new Date()
  const monthLabel = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: logs } = await supabase
        .from('sleep_logs')
        .select('date, bedtime, wake_time, quality, notes')
        .eq('user_id', user.id)
        .in('date', days)

      const byDate: Record<string, SleepEntry> = {}
      for (const log of logs ?? []) {
        byDate[log.date] = {
          bedtime:  log.bedtime  ?? '',
          wake_time: log.wake_time ?? '',
          quality:  log.quality  ?? 0,
          notes:    log.notes    ?? '',
        }
      }
      setLogByDate(byDate)
      setLoading(false)

      // Auto-open edit for the requested date (may be outside current month)
      if (dateParam) {
        let entry = byDate[dateParam]
        if (!entry) {
          const { data: extra } = await supabase
            .from('sleep_logs').select('bedtime, wake_time, quality, notes')
            .eq('user_id', user.id).eq('date', dateParam).maybeSingle()
          entry = extra
            ? { bedtime: extra.bedtime ?? '', wake_time: extra.wake_time ?? '', quality: extra.quality ?? 0, notes: extra.notes ?? '' }
            : { bedtime: '22:00', wake_time: '07:00', quality: 0, notes: '' }
          setLogByDate(prev => ({ ...prev, [dateParam]: entry }))
        }
        setSelectedDate(dateParam)
        setEditEntry(entry ?? { bedtime: '22:00', wake_time: '07:00', quality: 0, notes: '' })
        setMode('edit')
      }
    }

    load()
  }, [])

  function openEdit(date: string) {
    setSelectedDate(date)
    setEditEntry(logByDate[date] ?? { bedtime: '22:00', wake_time: '07:00', quality: 0, notes: '' })
    setMode('edit')
  }

  function updateEdit(fields: Partial<SleepEntry>) {
    setEditEntry(prev => ({ ...prev, ...fields }))
  }

  async function handleSave() {
    if (!editEntry.bedtime || !editEntry.wake_time || !editEntry.quality) return
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('sleep_logs').upsert(
      {
        user_id:   user.id,
        date:      selectedDate,
        bedtime:   editEntry.bedtime,
        wake_time: editEntry.wake_time,
        quality:   editEntry.quality,
        notes:     editEntry.notes || null,
      },
      { onConflict: 'user_id,date' }
    )

    setLogByDate(prev => ({ ...prev, [selectedDate]: { ...editEntry } }))
    setSaving(false)
    setMode('chart')
  }

  // ── Edit view ─────────────────────────────────────────────────────────────
  if (mode === 'edit') {
    const dateLabel = new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', {
      weekday: 'long', day: 'numeric', month: 'short',
    })
    const canSave = !!editEntry.bedtime && !!editEntry.wake_time && !!editEntry.quality
    const dur = getDurationLabel(editEntry.bedtime, editEntry.wake_time)

    return (
      <main
        className="min-h-screen pb-36"
        style={{ background: 'var(--bg)', position: 'relative', overflow: 'clip' }}
      >
        <div style={ORB1} />
        <div style={ORB2} />
        <div style={ORB3} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Header */}
          <div className="px-5 pt-14 flex items-center gap-4">
            <button
              onClick={() => dateParam ? router.back() : setMode('chart')}
              style={{ color: 'rgba(255,255,255,0.45)' }}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.8"
                  strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <div>
              <h1 style={{ color: '#ffffff', fontSize: 20, fontWeight: 600 }}>{dateLabel}</h1>
              {dur && (
                <p style={{ color: 'var(--accent)', fontSize: 13, marginTop: 2 }}>
                  {dur} hours
                </p>
              )}
            </div>
          </div>

          <div className="px-5 mt-8 flex flex-col gap-3">
            {/* Bedtime */}
            <div style={{ ...GLASS_CARD, padding: '16px 16px 20px' }}>
              <p style={{
                fontSize: 10, fontWeight: 600, letterSpacing: '0.09em',
                textTransform: 'uppercase', color: 'rgba(255,255,255,0.40)',
                marginBottom: 16, textAlign: 'center',
              }}>Bedtime</p>
              <TimePicker
                value={editEntry.bedtime}
                onChange={v => updateEdit({ bedtime: v })}
                accentColor="var(--accent)"
              />
            </div>

            {/* Wake time */}
            <div style={{ ...GLASS_CARD, padding: '16px 16px 20px' }}>
              <p style={{
                fontSize: 10, fontWeight: 600, letterSpacing: '0.09em',
                textTransform: 'uppercase', color: 'rgba(255,255,255,0.40)',
                marginBottom: 16, textAlign: 'center',
              }}>Wake time</p>
              <TimePicker
                value={editEntry.wake_time}
                onChange={v => updateEdit({ wake_time: v })}
                accentColor="var(--accent)"
              />
            </div>

            {/* Quality */}
            <div style={{ ...GLASS_CARD, padding: '16px 16px 18px' }}>
              <p style={{
                fontSize: 10, fontWeight: 600, letterSpacing: '0.09em',
                textTransform: 'uppercase', color: 'rgba(255,255,255,0.40)',
                marginBottom: 16,
              }}>Quality</p>
              <div className="flex justify-between gap-2">
                {QUALITY_LABELS.map((label, i) => {
                  const val = i + 1
                  const active = editEntry.quality === val
                  return (
                    <button key={val} onClick={() => updateEdit({ quality: val })}
                      className="flex flex-col items-center gap-1.5 flex-1">
                      <span
                        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                        style={{
                          transition: 'background 0.15s ease, box-shadow 0.15s ease, color 0.15s ease',
                          background: active
                            ? 'linear-gradient(135deg, hsl(var(--hue),80%,78%), hsl(var(--hue),70%,62%))'
                            : 'rgba(255,255,255,0.06)',
                          color: active ? 'hsl(var(--hue),45%,12%)' : 'rgba(255,255,255,0.35)',
                          boxShadow: active
                            ? '0 0 0 1.5px var(--accent-glow), 0 4px 14px hsla(var(--hue),70%,55%,0.45)'
                            : 'none',
                          border: active ? 'none' : '0.5px solid rgba(255,255,255,0.10)',
                        }}
                      >
                        {val}
                      </span>
                      <span style={{
                        fontSize: 9, color: active ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.28)',
                        textAlign: 'center', lineHeight: 1.2,
                        transition: 'color 0.15s ease',
                      }}>{label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Notes */}
            <div style={{ ...GLASS_CARD, padding: '16px' }}>
              <p style={{
                fontSize: 10, fontWeight: 600, letterSpacing: '0.09em',
                textTransform: 'uppercase', color: 'rgba(255,255,255,0.40)',
                marginBottom: 10,
              }}>Notes</p>
              <textarea
                value={editEntry.notes}
                onChange={e => updateEdit({ notes: e.target.value })}
                placeholder="Anything affecting your sleep?"
                rows={3}
                style={{
                  width: '100%', background: 'transparent', fontSize: 14,
                  color: '#ffffff', outline: 'none', resize: 'none',
                  fontFamily: 'inherit',
                }}
                className="placeholder:text-muted"
              />
            </div>

            <button
              onClick={handleSave}
              disabled={!canSave || saving}
              style={{
                width: '100%', borderRadius: 16, padding: '14px 0',
                fontSize: 14, fontWeight: 600,
                background: 'linear-gradient(135deg, hsl(var(--hue),80%,78%), hsl(var(--hue),70%,62%))',
                color: 'hsl(var(--hue),45%,10%)',
                opacity: (!canSave || saving) ? 0.38 : 1,
                boxShadow: canSave ? '0 4px 20px hsla(var(--hue),70%,55%,0.40)' : 'none',
                transition: 'opacity 0.2s ease, box-shadow 0.2s ease',
                border: 'none', cursor: canSave ? 'pointer' : 'default',
              }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>

        <BottomNav />
      </main>
    )
  }

  // ── Chart view ────────────────────────────────────────────────────────────
  return (
    <main
      className="min-h-screen pb-36"
      style={{ background: 'var(--bg)', position: 'relative', overflow: 'clip' }}
    >
      <div style={ORB1} />
      <div style={ORB2} />
      <div style={ORB3} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div className="px-5 pt-14 flex items-baseline justify-between">
          <h1 style={{ color: '#ffffff', fontSize: 26, fontWeight: 500 }}>Sleep</h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)' }}>{monthLabel}</p>
        </div>

        {loading ? (
          <p className="px-5 mt-8 text-sm text-muted">Loading…</p>
        ) : (
          <div className="mt-6 px-4">
            {/* Time axis labels */}
            <div className="ml-8 mb-1 relative h-5">
              {AXIS.map(({ label, pct }) => (
                <span
                  key={label}
                  className="absolute -translate-x-1/2"
                  style={{ left: `${pct}%`, fontSize: 10, color: 'rgba(255,255,255,0.25)' }}
                >
                  {label}
                </span>
              ))}
            </div>

            {/* Axis tick marks */}
            <div className="ml-8 mb-2 relative h-2">
              {AXIS.map(({ pct }) => (
                <div
                  key={pct}
                  className="absolute top-0 bottom-0"
                  style={{ left: `${pct}%`, width: '0.5px', background: 'rgba(255,255,255,0.08)' }}
                />
              ))}
            </div>

            {/* Day rows */}
            <div className="flex flex-col">
              {days.map((date) => {
                const entry = logByDate[date]
                const dayNum = new Date(date + 'T00:00:00').getDate()
                const isToday = date === todayStr
                const bar = entry ? getBarPosition(entry.bedtime, entry.wake_time) : null
                const dur = entry ? getDurationLabel(entry.bedtime, entry.wake_time) : ''
                const barStyle = entry ? getBarStyle(entry.quality) : getBarStyle(4)

                return (
                  <button
                    key={date}
                    onClick={() => openEdit(date)}
                    className="flex items-center gap-2 w-full"
                    style={{
                      paddingTop: 3, paddingBottom: 3,
                      borderBottom: '0.5px solid rgba(255,255,255,0.04)',
                    }}
                  >
                    {/* Day number */}
                    <span
                      style={{
                        width: 24, textAlign: 'right', flexShrink: 0,
                        fontSize: 13, fontWeight: isToday ? 600 : 500,
                        color: isToday ? '#ffffff' : 'rgba(255,255,255,0.40)',
                      }}
                    >
                      {dayNum}
                    </span>

                    {/* Bar area */}
                    <div className="flex-1 relative" style={{ height: 26 }}>
                      {/* Row background */}
                      <div
                        className="absolute inset-0"
                        style={{ borderRadius: 4, background: 'rgba(255,255,255,0.03)' }}
                      />

                      {/* Vertical grid lines */}
                      {AXIS.map(({ pct }) => (
                        <div
                          key={pct}
                          className="absolute top-0 bottom-0"
                          style={{
                            left: `${pct}%`,
                            width: '0.5px',
                            background: 'rgba(255,255,255,0.05)',
                          }}
                        />
                      ))}

                      {bar ? (
                        <div
                          className="absolute flex items-center overflow-hidden"
                          style={{
                            top: 3, bottom: 3,
                            left: `${bar.left}%`,
                            width: `${bar.width}%`,
                            borderRadius: 6,
                            ...barStyle,
                          }}
                        >
                          {dur && (
                            <span style={{
                              paddingLeft: 6, paddingRight: 6,
                              fontSize: 11, fontWeight: 500,
                              color: 'hsl(var(--hue),45%,12%)',
                              whiteSpace: 'nowrap',
                            }}>
                              {dur}h
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="absolute inset-0 flex items-center pl-2">
                          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.22)' }}>
                            tap to log
                          </span>
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Legend */}
            <div className="mt-5 flex gap-5">
              {[
                { tier: 4, label: 'Great (4–5)' },
                { tier: 3, label: 'OK (3)' },
                { tier: 1, label: 'Poor (1–2)' },
              ].map(({ tier, label }) => {
                const s = getBarStyle(tier)
                return (
                  <div key={label} className="flex items-center gap-1.5">
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: s.background,
                      boxShadow: s.boxShadow,
                    }} />
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)' }}>{label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </main>
  )
}
