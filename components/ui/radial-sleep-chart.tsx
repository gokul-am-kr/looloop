'use client'

// Full-circle polar sleep chart (bullet-journal style)
// Day 1 at top, clockwise. Spoke length = hours slept.
// Concentric rings = hour markers. Dashed ring = 8h goal.

const CX = 175
const CY = 175
const R_CENTER = 22   // inner empty circle
const R_MAX    = 128  // outermost ring (H_MAX hours)
const R_SPOKE  = 131  // spoke tip (just past max ring)
const R_LABEL  = 147  // day number label radius

const H_MIN = 3        // hours mapped to R_CENTER
const H_MAX = 10       // hours mapped to R_MAX
const HOUR_RINGS = [4, 5, 6, 7, 8, 9, 10]
const GOAL_H = 8       // hours — drawn as dashed blue ring

// ── Helpers ──────────────────────────────────────────────────────────────────

function hToR(h: number): number {
  const c = Math.max(H_MIN, Math.min(H_MAX, h))
  return R_CENTER + ((c - H_MIN) / (H_MAX - H_MIN)) * (R_MAX - R_CENTER)
}

function ringRadius(h: number): number {
  return R_CENTER + ((h - H_MIN) / (H_MAX - H_MIN)) * (R_MAX - R_CENTER)
}

// Day 1 at top (90° math), going clockwise (decreasing math angle)
function dayAngle(d: number, total: number): number {
  return 90 - ((d - 1) / total) * 360
}

function polar(r: number, deg: number): [number, number] {
  const rad = (deg * Math.PI) / 180
  return [CX + r * Math.cos(rad), CY - r * Math.sin(rad)]
}

function sleepHrs(bedtime: string, wake_time: string): number {
  const [bh, bm] = bedtime.split(':').map(Number)
  const [wh, wm] = wake_time.split(':').map(Number)
  let bed  = bh * 60 + bm
  let wake = wh * 60 + wm
  if (bed  < 12 * 60) bed  += 1440
  if (wake < 12 * 60) wake += 1440
  if (wake <= bed)    wake += 1440
  return (wake - bed) / 60
}

function mkDate(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function dotColor(quality: number): string {
  if (quality >= 4) return '#5AC8FA'
  if (quality === 3) return '#3A8FA8'
  return '#1E5F7A'
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface SleepEntry {
  bedtime: string
  wake_time: string
  quality: number
}

interface Props {
  sleepByDate: Record<string, SleepEntry>
  year: number
  month: number
  onDayClick: (dateStr: string) => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export function RadialSleepChart({ sleepByDate, year, month, onDayClick }: Props) {
  const now          = new Date()
  const isCurrentMon = now.getFullYear() === year && now.getMonth() === month
  const todayDay     = isCurrentMon ? now.getDate() : Infinity
  const daysInMonth  = new Date(year, month + 1, 0).getDate()
  const days         = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  // Build polygon — all days in order, future days at R_CENTER (no dip shown visually)
  const polygonPts = days.map(day => {
    const ds  = mkDate(year, month, day)
    const log = sleepByDate[ds]
    const ang = dayAngle(day, daysInMonth)
    if (day > todayDay) {
      // Future: center (won't render as polygon segment past today)
      return polar(R_CENTER, ang)
    }
    if (log?.bedtime && log?.wake_time) {
      return polar(hToR(sleepHrs(log.bedtime, log.wake_time)), ang)
    }
    return polar(R_CENTER, ang)  // no data → dip to centre
  })

  // Only close polygon if we have past/current data
  const polygonStr = polygonPts
    .slice(0, Math.min(todayDay, daysInMonth))
    .map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`)
    .join(' ')

  // Hour tick labels — placed along the spoke between day 1 and day 2 (upper-right gap)
  const tickAngle = dayAngle(0.5, daysInMonth)  // between day N and day 1

  return (
    <div className="w-full">
      <svg
        key={`${year}-${month}`}
        viewBox="0 0 350 350"
        width="100%"
      >
        <style>{`
          @keyframes rscFade {
            from { opacity: 0; }
            to   { opacity: 1; }
          }
          @keyframes rscPoly {
            from { opacity: 0; stroke-dashoffset: 800; }
            to   { opacity: 1; stroke-dashoffset: 0; }
          }
        `}</style>

        {/* ── Concentric hour rings ── */}
        {HOUR_RINGS.map(h => {
          const r       = ringRadius(h)
          const isGoal  = h === GOAL_H
          return (
            <circle
              key={h}
              cx={CX} cy={CY} r={r}
              fill="none"
              stroke={isGoal ? '#5AC8FA' : '#2A2A2A'}
              strokeWidth={isGoal ? 1.2 : 0.5}
              strokeDasharray={isGoal ? '5 4' : ''}
              opacity={isGoal ? 0.75 : 0.7}
            />
          )
        })}

        {/* ── Hour labels (along the gap between day 31 and day 1) ── */}
        {HOUR_RINGS.map(h => {
          const r = ringRadius(h)
          const [x, y] = polar(r, tickAngle)
          return (
            <text
              key={`hl-${h}`}
              x={x.toFixed(2)} y={y.toFixed(2)}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#3A3A3C"
              fontSize="5.5"
              fontFamily="-apple-system, BlinkMacSystemFont, sans-serif"
            >
              {h}h
            </text>
          )
        })}

        {/* ── Day spokes ── */}
        {days.map(day => {
          const ang      = dayAngle(day, daysInMonth)
          const [x1, y1] = polar(R_CENTER, ang)
          const [x2, y2] = polar(R_SPOKE, ang)
          return (
            <line
              key={`spoke-${day}`}
              x1={x1.toFixed(2)} y1={y1.toFixed(2)}
              x2={x2.toFixed(2)} y2={y2.toFixed(2)}
              stroke="#222"
              strokeWidth="0.4"
            />
          )
        })}

        {/* ── Sleep polygon ── */}
        {polygonStr && (
          <polyline
            points={polygonStr}
            fill="rgba(90, 200, 250, 0.06)"
            stroke="#5AC8FA"
            strokeWidth="1.6"
            strokeLinejoin="round"
            strokeLinecap="round"
            style={{ animation: 'rscFade 0.8s ease both' }}
          />
        )}

        {/* ── Day number labels + tap targets ── */}
        {days.map(day => {
          const ds       = mkDate(year, month, day)
          const ang      = dayAngle(day, daysInMonth)
          const [x, y]   = polar(R_LABEL, ang)
          const hasData  = !!sleepByDate[ds]?.bedtime
          const isFuture = day > todayDay

          return (
            <text
              key={`lbl-${day}`}
              x={x.toFixed(2)} y={y.toFixed(2)}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={isFuture ? '#2A2A2A' : hasData ? '#8E8E93' : '#444'}
              fontSize="7.5"
              fontFamily="-apple-system, BlinkMacSystemFont, sans-serif"
              onClick={() => !isFuture && onDayClick(ds)}
              style={{ cursor: isFuture ? 'default' : 'pointer' }}
            >
              {day}
            </text>
          )
        })}

        {/* ── Data dots (colored by sleep quality) ── */}
        {days.map(day => {
          const ds  = mkDate(year, month, day)
          const log = sleepByDate[ds]
          if (!log?.bedtime || !log?.wake_time) return null
          const ang    = dayAngle(day, daysInMonth)
          const hrs    = sleepHrs(log.bedtime, log.wake_time)
          const [x, y] = polar(hToR(hrs), ang)
          return (
            <circle
              key={`dot-${day}`}
              cx={x.toFixed(2)} cy={y.toFixed(2)} r="2.8"
              fill={dotColor(log.quality)}
              stroke="#000"
              strokeWidth="0.4"
              onClick={() => onDayClick(ds)}
              style={{
                cursor: 'pointer',
                animation: `rscFade 0.4s ease ${day * 15}ms both`,
              }}
            />
          )
        })}

        {/* ── Inner circle + moon ── */}
        <circle
          cx={CX} cy={CY} r={R_CENTER}
          fill="#000"
          stroke="#2A2A2A"
          strokeWidth="0.8"
        />
        <text
          x={CX} y={CY}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="20"
        >
          🌙
        </text>
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 px-1">
        <div className="flex items-center gap-1.5">
          <svg width="16" height="6">
            <line x1="0" y1="3" x2="16" y2="3" stroke="#5AC8FA" strokeWidth="1.5" strokeDasharray="4 3" />
          </svg>
          <span className="text-[10px] text-muted">8h goal</span>
        </div>
        {([
          { color: '#5AC8FA', label: 'Great (4–5)' },
          { color: '#3A8FA8', label: 'OK (3)' },
          { color: '#1E5F7A', label: 'Poor (1–2)' },
        ] as const).map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
            <span className="text-[10px] text-muted">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
