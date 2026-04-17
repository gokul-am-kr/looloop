'use client'

// Monthly sleep bar chart
// One bar per day · height = hours slept · colour = quality
// Dashed goal line at 8 h

interface SleepEntry {
  bedtime:   string
  wake_time: string
  quality:   number
}

interface Props {
  sleepByDate: Record<string, SleepEntry>
  year:        number
  month:       number
  onDayClick:  (dateStr: string) => void
}

// ── helpers ───────────────────────────────────────────────────────────────────

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

function barColor(quality: number): string {
  if (quality >= 4) return '#5AC8FA'
  if (quality === 3) return '#3A8FA8'
  return '#1E5F7A'
}

// ── layout constants ──────────────────────────────────────────────────────────

const H_MAX   = 10
const VIEW_W  = 340
const VIEW_H  = 160
const CL      = 24    // left margin  (hour labels)
const CR      = 334   // right edge
const CT      = 10    // top of chart
const CB      = 132   // bottom of bars / baseline
const LBL_Y   = 146   // day number label y
const CW      = CR - CL
const CH      = CB - CT

function hToY(h: number): number {
  return CB - (Math.min(Math.max(h, 0), H_MAX) / H_MAX) * CH
}

// ── component ─────────────────────────────────────────────────────────────────

export function RadialSleepChart({ sleepByDate, year, month, onDayClick }: Props) {
  const now          = new Date()
  const isCurrentMon = now.getFullYear() === year && now.getMonth() === month
  const todayDay     = isCurrentMon ? now.getDate() : Infinity
  const daysInMonth  = new Date(year, month + 1, 0).getDate()
  const days         = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  const slotW        = CW / daysInMonth
  const barW         = Math.max(slotW * 0.7, 2.5)
  const barOffset    = (slotW - barW) / 2

  const showLabel    = (d: number) => d === 1 || d % 5 === 0 || d === daysInMonth

  const Y_GRID = [4, 6, 8, 10]

  return (
    <div className="w-full">
      <svg
        key={`${year}-${month}`}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        width="100%"
      >
        <defs>
          <style>{`
            @keyframes slpBar {
              from { opacity: 0; transform: scaleY(0); }
              to   { opacity: 1; transform: scaleY(1); }
            }
          `}</style>
          {/* Vertical sheen: bright top → transparent mid */}
          <linearGradient id="slp-sheen-v" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.28" />
            <stop offset="50%"  stopColor="#ffffff" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0"    />
          </linearGradient>
          {/* Horizontal sheen: left highlight → transparent right */}
          <linearGradient id="slp-sheen-h" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.18" />
            <stop offset="55%"  stopColor="#ffffff" stopOpacity="0.04" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0"    />
          </linearGradient>
        </defs>

        {/* ── Grid lines + hour labels ── */}
        {Y_GRID.map(h => {
          const y      = hToY(h)
          const isGoal = h === 8
          return (
            <g key={`g-${h}`}>
              <line
                x1={CL} y1={y.toFixed(2)} x2={CR} y2={y.toFixed(2)}
                stroke={isGoal ? '#5AC8FA' : '#1C1C26'}
                strokeWidth={isGoal ? 0.8 : 0.5}
                strokeDasharray={isGoal ? '4 3' : undefined}
                opacity={isGoal ? 0.85 : 0.7}
              />
              <text
                x={(CL - 3).toFixed(2)} y={y.toFixed(2)}
                textAnchor="end" dominantBaseline="middle"
                fill={isGoal ? '#5AC8FA' : '#3A3A48'}
                fontSize="5.5"
                fontFamily="-apple-system, BlinkMacSystemFont, sans-serif"
              >{h}h</text>
            </g>
          )
        })}

        {/* ── Bars ── */}
        {days.map(day => {
          const ds       = mkDate(year, month, day)
          const log      = sleepByDate[ds]
          const isFuture = day > todayDay
          const x        = CL + (day - 1) * slotW + barOffset

          if (isFuture || !log?.bedtime) {
            const ghostH   = CB - CT
            const opacity  = isFuture ? 0.03 : 0.06
            const rx       = (barW / 2).toFixed(2)
            return (
              <g key={`bar-${day}`}>
                {/* Ghost bar full height */}
                <rect
                  x={x.toFixed(2)} y={CT.toFixed(2)}
                  width={barW.toFixed(2)} height={ghostH.toFixed(2)}
                  rx={rx}
                  fill={`rgba(255,255,255,${opacity})`}
                />
                {/* Subtle edge */}
                <rect
                  x={x.toFixed(2)} y={CT.toFixed(2)}
                  width={barW.toFixed(2)} height={ghostH.toFixed(2)}
                  rx={rx}
                  fill="none"
                  stroke={`rgba(255,255,255,${isFuture ? 0.04 : 0.08})`}
                  strokeWidth="0.5"
                />
              </g>
            )
          }

          const hrs    = sleepHrs(log.bedtime, log.wake_time)
          const barTop = hToY(hrs)
          const barH   = CB - barTop
          const color  = barColor(log.quality)

          return (
            <g
              key={`bar-${day}`}
              onClick={() => onDayClick(ds)}
              style={{
                cursor: 'pointer',
                transformBox: 'fill-box' as const,
                transformOrigin: 'bottom',
                animation: `slpBar 0.35s ease ${day * 10}ms both`,
              }}
            >
              {/* Bar base */}
              <rect
                x={x.toFixed(2)} y={barTop.toFixed(2)}
                width={barW.toFixed(2)} height={barH.toFixed(2)}
                rx={(barW / 2).toFixed(2)}
                fill={color}
                opacity="0.7"
              />
              {/* Vertical sheen */}
              <rect
                x={x.toFixed(2)} y={barTop.toFixed(2)}
                width={barW.toFixed(2)} height={barH.toFixed(2)}
                rx={(barW / 2).toFixed(2)}
                fill="url(#slp-sheen-v)"
              />
              {/* Horizontal sheen */}
              <rect
                x={x.toFixed(2)} y={barTop.toFixed(2)}
                width={barW.toFixed(2)} height={barH.toFixed(2)}
                rx={(barW / 2).toFixed(2)}
                fill="url(#slp-sheen-h)"
              />
              {/* Glass edge highlight */}
              <rect
                x={x.toFixed(2)} y={barTop.toFixed(2)}
                width={barW.toFixed(2)} height={barH.toFixed(2)}
                rx={(barW / 2).toFixed(2)}
                fill="none"
                stroke="rgba(255,255,255,0.18)"
                strokeWidth="0.6"
              />
            </g>
          )
        })}

        {/* ── Day labels ── */}
        {days.map(day => {
          const ds      = mkDate(year, month, day)
          const cx      = CL + (day - 1) * slotW + slotW / 2
          const isToday = isCurrentMon && day === todayDay

          if (isToday) {
            return (
              <g key={`lbl-${day}`} onClick={() => onDayClick(ds)} style={{ cursor: 'pointer' }}>
                <circle cx={cx.toFixed(2)} cy={LBL_Y} r={4.5} fill="#ffffff" opacity="0.75" />
                <text
                  x={cx.toFixed(2)} y={(LBL_Y + 1.9).toFixed(2)}
                  textAnchor="middle"
                  fill="#000000" fontSize="5" fontWeight="700"
                  fontFamily="-apple-system, BlinkMacSystemFont, sans-serif"
                >{day}</text>
              </g>
            )
          }

          if (!showLabel(day)) return null

          return (
            <text
              key={`lbl-${day}`}
              x={cx.toFixed(2)} y={LBL_Y}
              textAnchor="middle" dominantBaseline="middle"
              fill="#3A3A48" fontSize="5.5"
              fontFamily="-apple-system, BlinkMacSystemFont, sans-serif"
              onClick={() => day < todayDay && onDayClick(ds)}
              style={{ cursor: day < todayDay ? 'pointer' : 'default' }}
            >{day}</text>
          )
        })}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 px-1">
        <div className="flex items-center gap-1.5">
          <svg width="16" height="6">
            <line x1="0" y1="3" x2="16" y2="3" stroke="#5AC8FA" strokeWidth="1.5" strokeDasharray="4 3" />
          </svg>
          <span className="text-[10px] text-muted">8h goal</span>
        </div>
        {([
          { color: '#5AC8FA', label: 'Great (4–5)' },
          { color: '#3A8FA8', label: 'OK (3)'       },
          { color: '#1E5F7A', label: 'Poor (1–2)'   },
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
