'use client'

// Radial mood sunburst — full 360° wheel, one segment per day.
// Segment outer radius scales with mood level (1 = short, 5 = tall).
// Character emoji sits at the centre.

const CX      = 110
const CY      = 110
const SIZE    = 220
const R_INNER = 22    // inner hole radius — emoji zone
const R_MAX   = 88    // outer radius at mood 5
const R_UNLOG = 4     // tiny sliver height for unlogged days

export const MOOD_COLORS: Record<number, string> = {
  0: 'rgba(255,255,255,0.05)',
  1: '#FF453A',
  2: '#FF9F0A',
  3: '#FFD60A',
  4: '#30D158',
  5: 'var(--char-accent)',
}

export const MOOD_LABELS = ['', 'Rough', 'Low', 'Okay', 'Good', 'Great']
export const MOOD_EMOJI  = ['', '😞', '😕', '😐', '🙂', '✨']

const CHAR_EMOJI: Record<string, string> = {
  mochi: '🐱', pico: '🌵', jelli: '🪼', inko: '🐙',
}

interface MoodLog { date: string; mood: number }

interface Props {
  logs: MoodLog[]
  year: number
  month: number
  edition?: string
  onDayClick: (date: string) => void
}

// ── Math helpers ──────────────────────────────────────────────────────────────

function toXY(cx: number, cy: number, r: number, deg: number): [number, number] {
  const rad = ((deg - 90) * Math.PI) / 180
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)]
}

function segPath(r1: number, r2: number, a1: number, a2: number): string {
  const [x1, y1] = toXY(CX, CY, r1, a1)
  const [x2, y2] = toXY(CX, CY, r1, a2)
  const [x3, y3] = toXY(CX, CY, r2, a2)
  const [x4, y4] = toXY(CX, CY, r2, a1)
  const large = (a2 - a1 > 180) ? 1 : 0
  return (
    `M ${x1.toFixed(2)} ${y1.toFixed(2)} ` +
    `A ${r1} ${r1} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} ` +
    `L ${x3.toFixed(2)} ${y3.toFixed(2)} ` +
    `A ${r2} ${r2} 0 ${large} 0 ${x4.toFixed(2)} ${y4.toFixed(2)} Z`
  )
}

function outerR(mood: number): number {
  if (mood === 0) return R_INNER + R_UNLOG
  return R_INNER + (mood / 5) * (R_MAX - R_INNER)
}

// ── Component ─────────────────────────────────────────────────────────────────

export function RadialMoodChart({ logs, year, month, edition = 'mochi', onDayClick }: Props) {
  const daysInMonth  = new Date(year, month + 1, 0).getDate()
  const now          = new Date()
  const isCurrentMon = now.getFullYear() === year && now.getMonth() === month
  const todayDay     = isCurrentMon ? now.getDate() : daysInMonth
  const anglePerDay  = 360 / daysInMonth

  const logByDate = Object.fromEntries(logs.map(l => [l.date, l.mood]))

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const emoji = CHAR_EMOJI[edition] ?? '🐱'

  // show label every 5 days + first
  const showLabel = (d: number) => d === 1 || d % 5 === 0

  return (
    <div className="glass rounded-2xl px-4 py-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-1">Mood Sunburst</p>
      <p className="text-[10px] text-muted mb-3">Each slice = one day · height = mood level</p>

      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        width="100%"
        style={{ overflow: 'visible' }}
      >
        <style>{`
          @keyframes moodPop {
            from { transform-origin: ${CX}px ${CY}px; transform: scale(0); opacity: 0; }
            to   { transform-origin: ${CX}px ${CY}px; transform: scale(1); opacity: 1; }
          }
        `}</style>

        {days.map((day, idx) => {
          const a1       = (day - 1) * anglePerDay
          const a2       = day * anglePerDay
          const aMid     = (day - 0.5) * anglePerDay
          const ds       = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const mood     = logByDate[ds] ?? 0
          const isFuture = isCurrentMon && day > todayDay
          const r2       = isFuture ? R_INNER + 2 : outerR(mood)
          const fill     = isFuture ? 'rgba(255,255,255,0.03)' : MOOD_COLORS[mood]

          // label position — just outside the max ring
          const [lx, ly] = toXY(CX, CY, R_MAX + 10, aMid)

          return (
            <g
              key={day}
              onClick={() => !isFuture && onDayClick(ds)}
              style={{
                cursor: isFuture ? 'default' : 'pointer',
                animation: `moodPop 0.35s ease ${idx * 12}ms both`,
              }}
            >
              <path
                d={segPath(R_INNER, r2, a1, a2)}
                fill={fill}
                stroke="#000"
                strokeWidth="0.5"
              />
              {showLabel(day) && (
                <text
                  x={lx} y={ly}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="6"
                  fill={isFuture ? '#2C2C2E' : '#636366'}
                  fontFamily="-apple-system, BlinkMacSystemFont, sans-serif"
                >
                  {day}
                </text>
              )}
            </g>
          )
        })}

        {/* Inner circle (covers segment bases) */}
        <circle cx={CX} cy={CY} r={R_INNER} fill="#050507" />

        {/* Character at centre */}
        <text x={CX} y={CY} textAnchor="middle" dominantBaseline="middle" fontSize="18">
          {emoji}
        </text>
      </svg>

      {/* Mood legend */}
      <div className="flex items-center justify-center gap-3 mt-3 flex-wrap">
        {[1, 2, 3, 4, 5].map(m => (
          <div key={m} className="flex items-center gap-1">
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: m === 5 ? 'var(--char-accent)' : MOOD_COLORS[m] }}
            />
            <span className="text-[10px] text-muted">{MOOD_EMOJI[m]} {MOOD_LABELS[m]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
