'use client'

import React from 'react'

// Radial mood sunburst — full 360° wheel, one segment per day.
// Segment outer radius scales with mood level (1 = short, 5 = tall).
// Character emoji sits at the centre.

const CX      = 110
const CY      = 110
const SIZE    = 220
const R_INNER = 22    // inner hole radius — emoji zone
const R_MAX   = 88    // outer radius at mood 5
const R_UNLOG = 4     // tiny sliver height for unlogged days

// Segment gap / taper constants (degrees)
// Inner arc is narrower than outer arc → trapezoid taper (wider at tip)
const SEP       = (0.025 * 180) / Math.PI   // 1.43° visual gap between segments
const TAPER_IN  = (0.015 * 180) / Math.PI   // 0.86° extra inset at inner base
const TAPER_OUT = (0.008 * 180) / Math.PI   // 0.46° extra inset at outer tip
const GAP_IN    = SEP + TAPER_IN            // total inner inset ≈ 2.29° per side
const GAP_OUT   = SEP + TAPER_OUT           // total outer inset ≈ 1.89° per side

export const MOOD_COLORS: Record<number, string> = {
  0: 'rgba(255,255,255,0.05)',
  1: '#E24B4A',
  2: '#EF9F27',
  3: '#FAC775',
  4: '#97C459',
  5: '#CECBF6',
}

// Lighter (inner) and darker (outer) variants for gradient fills
const MOOD_LIGHTER: Record<number, string> = {
  1: '#FF6B6A', 2: '#FFBE55', 3: '#FFD99A', 4: '#B8E07A', 5: '#EEEEFF',
}
const MOOD_DARKER: Record<number, string> = {
  1: '#B83838', 2: '#C07A10', 3: '#D49F45', 4: '#6A9A35', 5: '#9E9ACE',
}

const MOOD_GLOW: Record<number, string> = {
  1: '0 0 6px #E24B4A99',
  2: '0 0 6px #EF9F2799',
  3: '0 0 6px #FAC77599',
  4: '0 0 6px #97C45999',
  5: '0 0 6px #CECBF699',
}

const GLASS_CARD: React.CSSProperties = {
  background: 'linear-gradient(145deg, rgba(255,255,255,0.13) 0%, rgba(255,255,255,0.04) 60%, rgba(255,255,255,0.02) 100%)',
  borderTop: '0.5px solid rgba(255,255,255,0.28)',
  borderLeft: '0.5px solid rgba(255,255,255,0.18)',
  borderRight: '0.5px solid rgba(255,255,255,0.04)',
  borderBottom: '0.5px solid rgba(255,255,255,0.04)',
  boxShadow: '0 16px 48px rgba(0,0,0,0.65), 0 4px 12px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.15)',
  backdropFilter: 'blur(28px)',
  WebkitBackdropFilter: 'blur(28px)',
  borderRadius: 20,
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

// g1 = inner arc gap (degrees), g2 = outer arc gap (degrees)
// g1 > g2 produces a taper: outer tip is wider than inner base
function segPath(r1: number, r2: number, a1: number, a2: number,
                 g1 = 0, g2 = 0): string {
  const [x1, y1] = toXY(CX, CY, r1, a1 + g1)
  const [x2, y2] = toXY(CX, CY, r1, a2 - g1)
  const [x3, y3] = toXY(CX, CY, r2, a2 - g2)
  const [x4, y4] = toXY(CX, CY, r2, a1 + g2)
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

// Arc path helper (open arc, no fill)
function arcPath(r: number, a1: number, a2: number): string {
  const [x1, y1] = toXY(CX, CY, r, a1)
  const [x2, y2] = toXY(CX, CY, r, a2)
  const large = (a2 - a1 > 180) ? 1 : 0
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`
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
    <div style={{ ...GLASS_CARD, padding: '16px 16px 20px' }}>
      <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 2 }}>Mood Sunburst</p>
      <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 12 }}>Each slice = one day · height = mood level</p>

      {/* Drop-shadow wrapper */}
      <div style={{ filter: 'drop-shadow(0 16px 50px rgba(0,0,0,0.65)) drop-shadow(0 0 24px hsla(var(--hue),40%,50%,0.12))' }}>
        {/* Relative container so disc sits behind SVG */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

          {/* Circular glass disc */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '82%',
            aspectRatio: '1',
            borderRadius: '50%',
            background: 'radial-gradient(circle at 38% 32%, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.04) 45%, rgba(255,255,255,0.01) 100%)',
            borderTop: '0.5px solid rgba(255,255,255,0.20)',
            borderLeft: '0.5px solid rgba(255,255,255,0.13)',
            borderRight: '0.5px solid rgba(255,255,255,0.03)',
            borderBottom: '0.5px solid rgba(255,255,255,0.03)',
            boxShadow: '0 24px 70px rgba(0,0,0,0.70), 0 8px 30px rgba(0,0,0,0.50), 0 2px 8px rgba(0,0,0,0.35), inset 0 2px 0 rgba(255,255,255,0.10), inset 0 -2px 0 rgba(0,0,0,0.25), 0 0 50px hsla(var(--hue),50%,55%,0.12)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            pointerEvents: 'none',
            zIndex: 0,
          }} />

          <svg
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            width="100%"
            style={{ overflow: 'visible', position: 'relative', zIndex: 1 }}
          >
            <defs>
              <style>{`
                @keyframes moodPop {
                  from { transform-origin: ${CX}px ${CY}px; transform: scale(0); opacity: 0; }
                  to   { transform-origin: ${CX}px ${CY}px; transform: scale(1); opacity: 1; }
                }
              `}</style>

              {/* Per-mood radial fill gradients — lighter at inner, darker at outer tip */}
              {([1,2,3,4,5] as const).map(m => (
                <radialGradient key={m} id={`moodFill${m}`}
                  gradientUnits="userSpaceOnUse" cx={CX} cy={CY} r={R_MAX}>
                  <stop offset="0%"   stopColor={MOOD_LIGHTER[m]} />
                  <stop offset="40%"  stopColor={MOOD_COLORS[m]} />
                  <stop offset="100%" stopColor={MOOD_DARKER[m]} />
                </radialGradient>
              ))}

              {/* Per-mood colored outer-glow filters */}
              {([1,2,3,4,5] as const).map(m => (
                <filter key={m} id={`moodSegGlow${m}`} x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur in="SourceAlpha" stdDeviation="2.8" result="blur"/>
                  <feFlood floodColor={MOOD_COLORS[m]} floodOpacity="0.55" result="color"/>
                  <feComposite in="color" in2="blur" operator="in" result="glow"/>
                  <feMerge>
                    <feMergeNode in="glow"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              ))}

              {/* Radial sheen — lit from centre outward */}
              <radialGradient id="mood-sheen" cx="50%" cy="50%" r="50%">
                <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.22" />
                <stop offset="55%"  stopColor="#ffffff" stopOpacity="0.06" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0"    />
              </radialGradient>

              {/* Radial edge darkening — depth toward outer rim */}
              <radialGradient id="mood-rim" cx="50%" cy="50%" r="50%">
                <stop offset="60%"  stopColor="#000000" stopOpacity="0"    />
                <stop offset="100%" stopColor="#000000" stopOpacity="0.22" />
              </radialGradient>

              {/* Center circle drop shadow */}
              <filter id="mood-center-shadow" x="-60%" y="-60%" width="220%" height="220%">
                <feDropShadow dx="0" dy="0" stdDeviation="8" floodColor="rgba(0,0,0,0.90)" />
              </filter>

              {/* Today marker glow */}
              <filter id="mood-today-glow" x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="2" in="SourceGraphic" result="blur"/>
                <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>

            {days.map((day, idx) => {
              const a1       = (day - 1) * anglePerDay
              const a2       = day * anglePerDay
              const aMid     = (day - 0.5) * anglePerDay
              const ds       = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const mood     = logByDate[ds] ?? 0
              const isFuture = isCurrentMon && day > todayDay
              const r2       = isFuture ? R_INNER + 2 : outerR(mood)
              const isLogged = !isFuture && mood > 0

              // Angles inset by gap + extra margin for shadow arcs
              const shadowInset = GAP_IN + 0.8
              const tipInset    = GAP_OUT + 0.8

              // label position — just outside the max ring
              const [lx, ly] = toXY(CX, CY, R_MAX + 10, aMid)

              // Leading-edge highlight endpoint positions
              const [le1x, le1y] = toXY(CX, CY, R_INNER + 2, a1 + GAP_OUT)
              const [le2x, le2y] = toXY(CX, CY, r2 - 1,      a1 + GAP_OUT)

              return (
                <g
                  key={day}
                  onClick={() => !isFuture && onDayClick(ds)}
                  style={{
                    cursor: isFuture ? 'default' : 'pointer',
                    animation: `moodPop 0.35s ease ${idx * 12}ms both`,
                  }}
                >
                  {/* ── 1. Main gradient fill with colored glow ── */}
                  <path
                    d={segPath(R_INNER, r2, a1, a2, GAP_IN, GAP_OUT)}
                    fill={isLogged ? `url(#moodFill${mood})` : (isFuture ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.05)')}
                    stroke="rgba(0,0,0,0.50)"
                    strokeWidth="0.4"
                    filter={isLogged ? `url(#moodSegGlow${mood})` : undefined}
                  />

                  {/* ── 2. Inner shadow arc — dark base, "rising from depth" ── */}
                  {isLogged && (
                    <path
                      d={arcPath(R_INNER + 4, a1 + shadowInset, a2 - shadowInset)}
                      fill="none"
                      stroke="rgba(0,0,0,0.40)"
                      strokeWidth="6"
                      style={{ pointerEvents: 'none' }}
                    />
                  )}

                  {/* ── 3. Glass sheen overlay ── */}
                  {isLogged && (
                    <path
                      d={segPath(R_INNER, r2, a1, a2, GAP_IN, GAP_OUT)}
                      fill="url(#mood-sheen)"
                      stroke="none"
                      style={{ pointerEvents: 'none' }}
                    />
                  )}

                  {/* ── 4. Outer rim depth ── */}
                  {isLogged && (
                    <path
                      d={segPath(R_INNER, r2, a1, a2, GAP_IN, GAP_OUT)}
                      fill="url(#mood-rim)"
                      stroke="none"
                      style={{ pointerEvents: 'none' }}
                    />
                  )}

                  {/* ── 5. Leading-edge highlight (beveled left side) ── */}
                  {isLogged && (
                    <line
                      x1={le1x.toFixed(2)} y1={le1y.toFixed(2)}
                      x2={le2x.toFixed(2)} y2={le2y.toFixed(2)}
                      stroke="rgba(255,255,255,0.18)"
                      strokeWidth="0.8"
                      style={{ pointerEvents: 'none' }}
                    />
                  )}

                  {/* ── 6. Outer tip highlight ── */}
                  {isLogged && (
                    <path
                      d={arcPath(r2 - 1, a1 + tipInset, a2 - tipInset)}
                      fill="none"
                      stroke="rgba(255,255,255,0.20)"
                      strokeWidth="1.5"
                      style={{ pointerEvents: 'none' }}
                    />
                  )}

                  {/* ── Day label ── */}
                  {(showLabel(day) || (!isFuture && isCurrentMon && day === todayDay)) && (() => {
                    const isToday = !isFuture && isCurrentMon && day === todayDay
                    return isToday ? (
                      <g filter="url(#mood-today-glow)">
                        <circle cx={lx} cy={ly} r={5} fill="rgba(255,255,255,0.14)" stroke="rgba(255,255,255,0.40)" strokeWidth="0.7" />
                        <text
                          x={lx} y={ly + 1.9}
                          textAnchor="middle"
                          fill="#ffffff" fontSize="5" fontWeight="500"
                          fontFamily="-apple-system, BlinkMacSystemFont, sans-serif"
                        >{day}</text>
                      </g>
                    ) : (
                      <text
                        x={lx} y={ly}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize="6"
                        fill={isFuture ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.25)'}
                        fontFamily="-apple-system, BlinkMacSystemFont, sans-serif"
                      >{day}</text>
                    )
                  })()}
                </g>
              )
            })}

            {/* Global glass sheen over full wheel */}
            <circle cx={CX} cy={CY} r={R_MAX} fill="url(#mood-sheen)" style={{ pointerEvents: 'none' }} />

            {/* Inner circle — dark base with shadow */}
            <circle cx={CX} cy={CY} r={R_INNER} style={{ fill: 'hsl(var(--hue),45%,6%)' }} filter="url(#mood-center-shadow)" />
            {/* Inner dark shadow ring — recessed grooved look */}
            <circle cx={CX} cy={CY} r={R_INNER - 3} fill="none" stroke="rgba(0,0,0,0.50)" strokeWidth="6" />
            {/* Rim highlight */}
            <circle cx={CX} cy={CY} r={R_INNER} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="0.5" />

            {/* Character at centre */}
            <text x={CX} y={CY} textAnchor="middle" dominantBaseline="middle" fontSize="18">
              {emoji}
            </text>
          </svg>

        </div>{/* end relative container */}
      </div>{/* end drop-shadow wrapper */}

      {/* Mood legend */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
        {[1, 2, 3, 4, 5].map(m => (
          <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: MOOD_COLORS[m],
              boxShadow: MOOD_GLOW[m],
              flexShrink: 0,
            }} />
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.42)' }}>{MOOD_EMOJI[m]} {MOOD_LABELS[m]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
