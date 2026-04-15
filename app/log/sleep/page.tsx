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
  let bed  = normalizeMins(timeToMins(bedtime))
  let wake = normalizeMins(timeToMins(wake_time))
  if (wake <= bed) wake += 1440

  const left  = ((bed - TIMELINE_START_MINS) / TIMELINE_SPAN_MINS) * 100
  const width = ((wake - bed) / TIMELINE_SPAN_MINS) * 100
  return { left: Math.max(0, left), width: Math.min(width, 100 - Math.max(0, left)) }
}

function getDurationLabel(bedtime: string, wake_time: string): string {
  if (!bedtime || !wake_time) return ''
  let bed  = normalizeMins(timeToMins(bedtime))
  let wake = normalizeMins(timeToMins(wake_time))
  if (wake <= bed) wake += 1440
  const hrs = (wake - bed) / 60
  // Round to nearest 0.5
  const rounded = Math.round(hrs * 2) / 2
  return rounded % 1 === 0 ? `${rounded}` : `${rounded}`
}

// Color based on quality: low = dim, high = bright
function getBarColor(quality: number): string {
  if (quality >= 4) return '#5AC8FA'   // bright blue
  if (quality === 3) return '#3A8FA8'  // medium blue
  return '#1E5F7A'                     // dim blue
}

export default function SleepPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
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
          // Fetch it specifically if outside the month window
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
    // Default to sensible times when no log exists
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
      <main className="min-h-screen pb-24">
        {/* Header */}
        <div className="px-5 pt-14 flex items-center gap-4">
          <button onClick={() => dateParam ? router.back() : setMode('chart')} className="text-muted hover:text-white">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div>
            <h1 className="text-white text-lg font-semibold">{dateLabel}</h1>
            {dur && <p className="text-sm mt-0.5" style={{ color: '#5AC8FA' }}>{dur} hours</p>}
          </div>
        </div>

        <div className="px-5 mt-8 flex flex-col gap-3">
          {/* Bedtime */}
          <div className="glass rounded-2xl px-4 py-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-4 text-center">Bedtime</p>
            <TimePicker
              value={editEntry.bedtime}
              onChange={v => updateEdit({ bedtime: v })}
              accentColor="#5AC8FA"
            />
          </div>

          {/* Wake time */}
          <div className="glass rounded-2xl px-4 py-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-4 text-center">Wake time</p>
            <TimePicker
              value={editEntry.wake_time}
              onChange={v => updateEdit({ wake_time: v })}
              accentColor="#5AC8FA"
            />
          </div>

          {/* Quality */}
          <div className="glass rounded-2xl px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-4">Quality</p>
            <div className="flex justify-between gap-2">
              {QUALITY_LABELS.map((label, i) => {
                const val = i + 1
                const active = editEntry.quality === val
                return (
                  <button key={val} onClick={() => updateEdit({ quality: val })}
                    className="flex flex-col items-center gap-1.5 flex-1">
                    <span
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all"
                      style={{
                        background: active ? '#5AC8FA' : 'rgba(36,36,44,0.62)',
                        color: active ? '#000' : '#8E8E93',
                      }}
                    >
                      {val}
                    </span>
                    <span className="text-[9px] text-muted text-center leading-tight">{label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Notes */}
          <div className="glass rounded-2xl px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">Notes</p>
            <textarea
              value={editEntry.notes}
              onChange={e => updateEdit({ notes: e.target.value })}
              placeholder="Anything affecting your sleep?"
              rows={3}
              className="w-full bg-transparent text-sm text-white placeholder:text-muted outline-none resize-none"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={!canSave || saving}
            className="w-full rounded-2xl py-3.5 text-sm font-semibold text-black disabled:opacity-40"
            style={{ background: '#5AC8FA' }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>

        <BottomNav />
      </main>
    )
  }

  // ── Chart view ────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen pb-24">
      {/* Header */}
      <div className="px-5 pt-14 flex items-baseline justify-between">
        <h1 className="text-2xl font-bold text-white">Sleep</h1>
        <p className="text-sm text-muted">{monthLabel}</p>
      </div>

      {loading ? (
        <p className="px-5 mt-8 text-sm text-muted">Loading…</p>
      ) : (
        <div className="mt-6 px-4">
          {/* Time axis */}
          <div className="flex ml-8 mb-1 relative h-5">
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

          {/* Axis tick lines */}
          <div className="flex ml-8 mb-3 relative h-2">
            {AXIS.map(({ pct }) => (
              <div
                key={pct}
                className="absolute top-0 bottom-0 w-px bg-dim"
                style={{ left: `${pct}%` }}
              />
            ))}
          </div>

          {/* Day rows */}
          <div className="flex flex-col gap-1.5">
            {days.map((date) => {
              const entry = logByDate[date]
              const dayNum = new Date(date + 'T00:00:00').getDate()
              const isToday = date === todayStr
              const bar = entry ? getBarPosition(entry.bedtime, entry.wake_time) : null
              const dur = entry ? getDurationLabel(entry.bedtime, entry.wake_time) : ''
              const color = entry ? getBarColor(entry.quality) : '#5AC8FA'

              return (
                <button
                  key={date}
                  onClick={() => openEdit(date)}
                  className="flex items-center gap-2 w-full"
                >
                  {/* Day number */}
                  <span
                    className="w-6 text-right text-xs shrink-0 font-medium"
                    style={{ color: isToday ? '#ffffff' : '#636366' }}
                  >
                    {dayNum}
                  </span>

                  {/* Bar area */}
                  <div className="flex-1 relative h-7">
                    {/* Subtle row bg */}
                    <div className="absolute inset-0 rounded-sm" style={{ background: 'rgba(18,18,22,0.4)' }} />

                    {bar ? (
                      <div
                        className="absolute top-0.5 bottom-0.5 rounded-sm flex items-center overflow-hidden"
                        style={{
                          left:       `${bar.left}%`,
                          width:      `${bar.width}%`,
                          background: color,
                        }}
                      >
                        {dur && (
                          <span className="px-1.5 text-[10px] font-semibold text-black whitespace-nowrap">
                            {dur}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex items-center pl-2">
                        <span className="text-[9px] text-muted">tap to log</span>
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Legend */}
          <div className="mt-6 flex gap-4">
            {[
              { color: '#5AC8FA', label: 'Good (4–5)' },
              { color: '#3A8FA8', label: 'OK (3)' },
              { color: '#1E5F7A', label: 'Poor (1–2)' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ background: color }} />
                <span className="text-[10px] text-muted">{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <BottomNav />
    </main>
  )
}
