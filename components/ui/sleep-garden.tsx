'use client'

// Sleep Garden — a stacked-circle tracker mirroring the physical Looloop journal.
// Shows up to 30 days. Each circle = one night of sleep.
// Circle fill reflects hours slept (terracotta gradient).
// Quality tints the ring colour (blue = good, dim = poor).

import { useMemo } from 'react'

interface SleepEntry {
  date: string
  bedtime: string
  wake_time: string
  quality: number
}

interface Props {
  logs: SleepEntry[]
  daysTotal?: number
}

const GOAL_HRS = 8
const MIN_HRS  = 3

function calcHrs(bedtime: string, wakeTime: string): number {
  const [bh, bm] = bedtime.split(':').map(Number)
  const [wh, wm] = wakeTime.split(':').map(Number)
  let bed  = bh * 60 + bm
  let wake = wh * 60 + wm
  if (bed  < 12 * 60) bed  += 1440
  if (wake < 12 * 60) wake += 1440
  if (wake <= bed)    wake += 1440
  return (wake - bed) / 60
}

function formatHrs(hrs: number): string {
  const h = Math.floor(hrs)
  const m = Math.round((hrs - h) * 60)
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

// SVG constants
const COLS        = 6
const CELL        = 44   // cell size px
const R_MAX       = 18   // max circle radius
const R_MIN       = 6    // min circle radius (0 hrs logged)
const PAD         = 4    // padding around grid
const LABEL_H     = 20   // height for day number label

export function SleepGarden({ logs, daysTotal = 30 }: Props) {
  const logByDate = useMemo(
    () => Object.fromEntries(logs.map(l => [l.date, l])),
    [logs]
  )

  // Build 30 day slots starting from the journal start date (last 30 calendar days for now)
  const slots = useMemo(() => {
    return Array.from({ length: daysTotal }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (daysTotal - 1 - i))
      return d.toISOString().split('T')[0]
    })
  }, [daysTotal])

  const rows = Math.ceil(daysTotal / COLS)
  const W    = COLS * CELL + PAD * 2
  const H    = rows * (CELL + LABEL_H) + PAD * 2

  return (
    <div className="glass rounded-2xl px-4 py-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-1">Sleep Garden</p>
      <p className="text-[10px] text-muted mb-4">Each circle = one night · size = hours · colour = quality</p>

      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
        <defs>
          <radialGradient id="sgFill" cx="40%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#FF8C60" />
            <stop offset="100%" stopColor="#C94B1E" />
          </radialGradient>
        </defs>

        {slots.map((date, idx) => {
          const col = idx % COLS
          const row = Math.floor(idx / COLS)
          const cx  = PAD + col * CELL + CELL / 2
          const cy  = PAD + row * (CELL + LABEL_H) + LABEL_H + CELL / 2

          const log  = logByDate[date]
          const dayN = idx + 1

          let r        = R_MIN * 0.5   // very small = not logged
          let fillOpacity = 0.15
          let strokeColor = '#3A3A3C'
          let hrsLabel: string | null = null

          if (log) {
            const hrs   = calcHrs(log.bedtime, log.wake_time)
            const pct   = Math.min(Math.max((hrs - MIN_HRS) / (GOAL_HRS - MIN_HRS), 0), 1)
            r           = R_MIN + pct * (R_MAX - R_MIN)
            fillOpacity = 0.55 + pct * 0.45
            strokeColor = log.quality >= 4 ? '#5AC8FA' : log.quality === 3 ? '#3A8FA8' : '#2C2C2E'
            hrsLabel    = formatHrs(hrs)
          }

          return (
            <g key={date}>
              {/* Day number */}
              <text
                x={cx} y={PAD + row * (CELL + LABEL_H) + LABEL_H - 4}
                textAnchor="middle"
                fontSize={9}
                fill={log ? '#8E8E93' : '#3A3A3C'}
              >
                {dayN}
              </text>

              {/* Circle */}
              <circle
                cx={cx} cy={cy} r={r}
                fill="url(#sgFill)"
                fillOpacity={fillOpacity}
                stroke={strokeColor}
                strokeWidth={1.5}
                style={{
                  animation: log ? `sgPop 0.4s ease-out ${idx * 0.03}s both` : undefined,
                }}
              />

              {/* Hours label inside circle if big enough */}
              {hrsLabel && r >= 13 && (
                <text
                  x={cx} y={cy + 3}
                  textAnchor="middle"
                  fontSize={7}
                  fill="#fff"
                  fontWeight="600"
                >
                  {hrsLabel}
                </text>
              )}
            </g>
          )
        })}
      </svg>

      <style>{`
        @keyframes sgPop {
          from { transform: scale(0); opacity: 0; }
          to   { transform: scale(1); opacity: 1; }
        }
      `}</style>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#5AC8FA' }} />
          <span className="text-[10px] text-muted">Good quality</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#2C2C2E', border: '1px solid #3A3A3C' }} />
          <span className="text-[10px] text-muted">Poor quality</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted">Size = hours slept</span>
        </div>
      </div>
    </div>
  )
}
