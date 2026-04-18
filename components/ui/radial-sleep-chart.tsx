'use client'

// Monthly sleep bar chart
// One bar per day · height = hours slept · colour = quality tier
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

function barFill(quality: number): string {
  if (quality >= 4) return 'url(#slp-great)'
  if (quality === 3) return 'url(#slp-ok)'
  return 'url(#slp-poor)'
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
    <div
      style={{
        background: 'linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))',
        borderTop: '0.5px solid rgba(255,255,255,0.18)',
        borderLeft: '0.5px solid rgba(255,255,255,0.12)',
        borderRight: '0.5px solid rgba(255,255,255,0.03)',
        borderBottom: '0.5px solid rgba(255,255,255,0.03)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.50), inset 0 1px 0 rgba(255,255,255,0.08)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: 18,
        padding: '16px 14px 10px',
        width: '100%',
      }}
    >
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
          {/* Quality-tier bar gradients using CSS custom properties */}
          <linearGradient id="slp-great" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   style={{ stopColor: 'hsl(var(--hue),80%,90%)', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: 'hsl(var(--hue),70%,74%)', stopOpacity: 1 }} />
          </linearGradient>
          <linearGradient id="slp-ok" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   style={{ stopColor: 'hsl(var(--hue),65%,72%)', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: 'hsl(var(--hue),65%,58%)', stopOpacity: 1 }} />
          </linearGradient>
          <linearGradient id="slp-poor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   style={{ stopColor: 'hsl(var(--hue),45%,50%)', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: 'hsl(var(--hue),45%,37%)', stopOpacity: 1 }} />
          </linearGradient>
          {/* Vertical sheen */}
          <linearGradient id="slp-sheen-v" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.22" />
            <stop offset="55%"  stopColor="#ffffff" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0"    />
          </linearGradient>
          {/* Horizontal sheen */}
          <linearGradient id="slp-sheen-h" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.14" />
            <stop offset="55%"  stopColor="#ffffff" stopOpacity="0.03" />
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
                stroke={isGoal ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.05)'}
                strokeWidth={isGoal ? 0.8 : 0.5}
                strokeDasharray={isGoal ? '4 4' : undefined}
              />
              <text
                x={(CL - 3).toFixed(2)} y={y.toFixed(2)}
                textAnchor="end" dominantBaseline="middle"
                fill={isGoal ? 'rgba(255,255,255,0.40)' : 'rgba(255,255,255,0.25)'}
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
            const ghostH  = CB - CT
            const opacity = isFuture ? 0.025 : 0.05
            const rx      = (barW / 2).toFixed(2)
            return (
              <g key={`bar-${day}`}>
                <rect
                  x={x.toFixed(2)} y={CT.toFixed(2)}
                  width={barW.toFixed(2)} height={ghostH.toFixed(2)}
                  rx={rx}
                  fill={`rgba(255,255,255,${opacity})`}
                />
                <rect
                  x={x.toFixed(2)} y={CT.toFixed(2)}
                  width={barW.toFixed(2)} height={ghostH.toFixed(2)}
                  rx={rx}
                  fill="none"
                  stroke={`rgba(255,255,255,${isFuture ? 0.03 : 0.06})`}
                  strokeWidth="0.5"
                />
              </g>
            )
          }

          const hrs    = sleepHrs(log.bedtime, log.wake_time)
          const barTop = hToY(hrs)
          const barH   = CB - barTop
          const fill   = barFill(log.quality)

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
              <rect
                x={x.toFixed(2)} y={barTop.toFixed(2)}
                width={barW.toFixed(2)} height={barH.toFixed(2)}
                rx={(barW / 2).toFixed(2)}
                fill={fill}
              />
              <rect
                x={x.toFixed(2)} y={barTop.toFixed(2)}
                width={barW.toFixed(2)} height={barH.toFixed(2)}
                rx={(barW / 2).toFixed(2)}
                fill="url(#slp-sheen-v)"
              />
              <rect
                x={x.toFixed(2)} y={barTop.toFixed(2)}
                width={barW.toFixed(2)} height={barH.toFixed(2)}
                rx={(barW / 2).toFixed(2)}
                fill="url(#slp-sheen-h)"
              />
              <rect
                x={x.toFixed(2)} y={barTop.toFixed(2)}
                width={barW.toFixed(2)} height={barH.toFixed(2)}
                rx={(barW / 2).toFixed(2)}
                fill="none"
                stroke="rgba(255,255,255,0.14)"
                strokeWidth="0.5"
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
                <circle
                  cx={cx.toFixed(2)} cy={LBL_Y} r={4.5}
                  fill="rgba(255,255,255,0.15)"
                  stroke="rgba(255,255,255,0.40)"
                  strokeWidth="0.5"
                />
                <text
                  x={cx.toFixed(2)} y={(LBL_Y + 1.9).toFixed(2)}
                  textAnchor="middle"
                  fill="#ffffff" fontSize="5" fontWeight="600"
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
              fill="rgba(255,255,255,0.25)" fontSize="5.5"
              fontFamily="-apple-system, BlinkMacSystemFont, sans-serif"
              onClick={() => day < todayDay && onDayClick(ds)}
              style={{ cursor: day < todayDay ? 'pointer' : 'default' }}
            >{day}</text>
          )
        })}
      </svg>

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px 16px', marginTop: 2, paddingLeft: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <svg width="16" height="6">
            <line x1="0" y1="3" x2="16" y2="3"
              stroke="rgba(255,255,255,0.40)"
              strokeWidth="1.5" strokeDasharray="4 4" />
          </svg>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)' }}>8h goal</span>
        </div>
        {[
          { label: 'Great (4–5)', lightness: '88%', sat: '80%' },
          { label: 'OK (3)',      lightness: '68%', sat: '65%' },
          { label: 'Poor (1–2)', lightness: '45%', sat: '45%' },
        ].map(({ label, sat, lightness }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: `hsl(var(--hue),${sat},${lightness})`,
            }} />
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
