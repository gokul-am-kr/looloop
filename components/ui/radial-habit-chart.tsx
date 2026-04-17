'use client'

// Radial ring chart — near-full circle with a small gap at the top
// Gap: 0.18 rad centred at top (90° in this SVG convention where 90° = up)
// Sweep: CCW (increasing angle), from just-past-top to just-before-top

const RING_H    = 13
const RING_GAP  = 1
const DAY_INSET = 0.004 * (180 / Math.PI)  // 0.008 rad total gap between adjacent segments

const R_START   = 40   // inner radius of innermost ring — larger = bigger chart

// Full-circle geometry ─ gap centred at 90° (top)
const GAP_DEG   = 0.18 * (180 / Math.PI)   // ≈ 10.31°
const FAN_START = 90 + GAP_DEG / 2           // ≈ 95.16°
const FAN_SPAN  = 360 - GAP_DEG              // ≈ 349.69°

const MARGIN    = 14   // margin around full ring
const NUM_INSET = 12   // offset for day-number labels past ring edge

// Segment colours — per-ring (innermost = white, outermost = deepest hue)
const RING_DONE_HEX  = ['var(--done-1)', 'var(--done-2)', 'var(--done-3)', 'var(--done-4)', 'var(--done-5)']
const MISSED_COLOR   = 'var(--missed)'
const FUTURE_COLOR   = 'rgba(255,255,255,0.04)'
const PARTICLE_COLOR = 'var(--accent)'

function getRingColor(hi: number): string {
  return RING_DONE_HEX[Math.min(hi, RING_DONE_HEX.length - 1)]
}

const CHAR_EMOJI: Record<string, string> = {
  mochi: '🐱', pico: '🌵', jelli: '🪼', inko: '🐙',
}

// Ambient particles distributed around the full circle
// [radius-fraction, angle-deg, dot-size, anim-delay-s]
const PARTICLES: [number, number, number, number][] = [
  [0.52,   0, 1.4, 0.0],
  [0.78,  45, 1.8, 1.6],
  [0.93, 100, 1.1, 0.7],
  [0.65, 150, 1.5, 2.3],
  [0.85, 195, 1.3, 0.3],
  [0.62, 240, 1.0, 1.9],
  [0.86, 285, 1.2, 3.1],
  [0.38, 330, 0.9, 2.6],
  [1.05,  70, 1.4, 1.0],
  [0.70, 170, 0.8, 3.6],
  [0.45, 260, 1.0, 0.5],
  [1.02, 350, 1.1, 4.0],
]

interface Props {
  habitNames: string[]
  habitByDate: Record<string, Record<string, boolean>>
  year: number
  month: number
  edition: string
  onDayClick: (dateStr: string) => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toXY(cx: number, cy: number, r: number, deg: number): [number, number] {
  const rad = (deg * Math.PI) / 180
  return [cx + r * Math.cos(rad), cy - r * Math.sin(rad)]
}

function segPath(cx: number, cy: number, r1: number, r2: number, a1: number, a2: number) {
  const [ax, ay]   = toXY(cx, cy, r1, a1)
  const [bx, by]   = toXY(cx, cy, r1, a2)
  const [cx2, cy2] = toXY(cx, cy, r2, a2)
  const [dx, dy]   = toXY(cx, cy, r2, a1)
  const large = Math.abs(a2 - a1) > 180 ? 1 : 0
  return (
    `M ${ax.toFixed(2)} ${ay.toFixed(2)} ` +
    `A ${r1} ${r1} 0 ${large} 0 ${bx.toFixed(2)} ${by.toFixed(2)} ` +
    `L ${cx2.toFixed(2)} ${cy2.toFixed(2)} ` +
    `A ${r2} ${r2} 0 ${large} 1 ${dx.toFixed(2)} ${dy.toFixed(2)} Z`
  )
}

function mkDate(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

// ── Component ─────────────────────────────────────────────────────────────────

export function RadialHabitChart({ habitNames, habitByDate, year, month, edition, onDayClick }: Props) {
  const daysInMonth  = new Date(year, month + 1, 0).getDate()
  const now          = new Date()
  const isCurrentMon = now.getFullYear() === year && now.getMonth() === month
  const todayDay     = isCurrentMon ? now.getDate() : -1
  const angPerDay    = FAN_SPAN / daysInMonth

  const a1   = (d: number) => FAN_START + (d - 1) * angPerDay + DAY_INSET
  const a2   = (d: number) => FAN_START + d       * angPerDay - DAY_INSET
  const aMid = (d: number) => FAN_START + (d - 0.5) * angPerDay

  const days      = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const showLabel = (d: number) => d === 1 || d % 5 === 0 || d === daysInMonth

  if (habitNames.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm" style={{ color: '#7A7A86' }}>Set up habits to see your chart</p>
      </div>
    )
  }

  // Layout — square viewBox centred on (CX, CY)
  const outerR    = R_START + habitNames.length * (RING_H + RING_GAP) - RING_GAP
  const ringEdge  = outerR + RING_H
  const labelR    = ringEdge + NUM_INSET
  const halfSize  = labelR + MARGIN
  const CX        = halfSize
  const CY        = halfSize
  const vbSize    = halfSize * 2
  const centerR   = R_START - 4   // inner circle radius

  // Date for centre display (always the actual current date)
  const centerDay   = now.getDate().toString()
  const centerMonth = now.toLocaleString('en-IN', { month: 'short' }).toUpperCase()



  // Circular plate covers exactly the ring area — labels (at labelR) float outside it
  const platePct = (2 * ringEdge) / vbSize * 100

  return (
    <div className="w-full">
      {/* Positioning context for glass plate + SVG */}
      <div style={{ position: 'relative' }}>
        {/* ── Circular glass plate (sits behind the ring chart) ── */}
        <div style={{
          position: 'absolute',
          width: `${platePct}%`,
          aspectRatio: '1',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          borderRadius: '50%',
          background: 'radial-gradient(circle at center, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.04) 50%, rgba(255,255,255,0.01) 100%)',
          border: '0.5px solid rgba(255,255,255,0.12)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.70), 0 8px 32px rgba(0,0,0,0.50), 0 2px 8px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.10), inset 0 -1px 0 rgba(0,0,0,0.20), 0 0 60px var(--orb2-glow)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }} />

        {/* ── SVG ring chart (above glass plate) ── */}
        <div style={{ filter: 'drop-shadow(0 0 20px var(--accent-glow))', position: 'relative' }}>
        <svg
          key={`${year}-${month}`}
          viewBox={`0 0 ${vbSize} ${vbSize}`}
          width="100%"
          style={{ overflow: 'visible' }}
        >
          <defs>
            <style>{`
              @keyframes rhcFade  { from { opacity:0 } to { opacity:1 } }
              @keyframes rhcPulse { 0%,100% { opacity:.18 } 50% { opacity:.55 } }
              @keyframes rhcDrift {
                0%   { transform: translate(0,0); }
                33%  { transform: translate(1.5px,-2px); }
                66%  { transform: translate(-1px,1.5px); }
                100% { transform: translate(0,0); }
              }
            `}</style>

            {/* Ambient halo blur */}
            <filter id="rhc-ambient" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="8" />
            </filter>

            {/* Particle glow */}
            <filter id="rhc-particle" x="-200%" y="-200%" width="500%" height="500%">
              <feGaussianBlur stdDeviation="1.8" />
            </filter>

            {/* Centre circle deep shadow */}
            <filter id="rhc-center-shadow" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="10" result="blur" />
              <feFlood floodColor="#000000" floodOpacity="0.90" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="shadow" />
              <feMerge>
                <feMergeNode in="shadow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Today dot glow */}
            <filter id="rhc-today-glow" x="-300%" y="-300%" width="700%" height="700%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="2.5" result="blur" />
              <feFlood floodColor="rgba(255,255,255,0.90)" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* ── Layer 0: ambient halo (blurred done tiles) ── */}
          <g filter="url(#rhc-ambient)" opacity="0.45">
            {habitNames.flatMap((name, hi) => {
              const r1 = R_START + hi * (RING_H + RING_GAP)
              const r2 = r1 + RING_H
              const ringColor = getRingColor(hi)
              return days.map(day => {
                const isFuture = isCurrentMon && day > todayDay
                if (isFuture) return null
                const log = habitByDate[mkDate(year, month, day)] ?? {}
                if (!log[name]) return null
                return (
                  <path key={`amb-${hi}-${day}`}
                    d={segPath(CX, CY, r1, r2, a1(day), a2(day))}
                    fill={ringColor}
                  />
                )
              })
            })}
          </g>

          {/* ── Layer 1: ambient particles ── */}
          {PARTICLES.map(([rf, ang, size, delay], i) => {
            const pr = rf * outerR
            const [px, py] = toXY(CX, CY, pr, ang)
            return (
              <g key={`p-${i}`}
                style={{
                  animation: `rhcDrift ${4 + i * 0.7}s ease-in-out ${delay}s infinite`,
                  transformOrigin: `${px.toFixed(1)}px ${py.toFixed(1)}px`,
                }}
              >
                <circle cx={px} cy={py} r={size * 3} fill={PARTICLE_COLOR} opacity={0.05}
                  filter="url(#rhc-particle)" />
                <circle cx={px} cy={py} r={size * 0.6} fill={PARTICLE_COLOR}
                  style={{ animation: `rhcPulse ${2.8 + i * 0.4}s ease-in-out ${delay}s infinite` }} />
              </g>
            )
          })}


          {/* ── Tile rings ── */}
          {[...habitNames].reverse().map((name, revHi) => {
            const hi = habitNames.length - 1 - revHi
            const r1 = R_START + hi * (RING_H + RING_GAP)
            const r2 = r1 + RING_H
            const ringColor = getRingColor(hi)

            return (
              <g key={`ring-${hi}`}>
                {days.map((day, dayIdx) => {
                  const ds       = mkDate(year, month, day)
                  const isFuture = isCurrentMon && day > todayDay
                  const done     = !isFuture && !!(habitByDate[ds] ?? {})[name]
                  const d        = segPath(CX, CY, r1, r2, a1(day), a2(day))
                  const anim     = { animation: `rhcFade 0.4s ease ${dayIdx * 11}ms both` as const }

                  if (isFuture) return (
                    <path key={day} d={d}
                      fill={FUTURE_COLOR}
                      stroke="rgba(0,0,0,0.35)" strokeWidth="0.4"
                      style={anim} />
                  )

                  return (
                    <path key={day} d={d}
                      fill={done ? ringColor : MISSED_COLOR}
                      stroke="rgba(0,0,0,0.35)" strokeWidth="0.4"
                      onClick={() => onDayClick(ds)}
                      style={{ cursor: 'pointer', ...anim }}
                    />
                  )
                })}
              </g>
            )
          })}

          {/* ── Centre circle (drawn after rings so it covers the inner hole) ── */}
          <circle cx={CX} cy={CY} r={centerR}
            fill="rgba(7,5,26,0.92)"
            filter="url(#rhc-center-shadow)"
          />

          {/* ── Day-number labels outside outermost ring ── */}
          {days.map(day => {
            if (!showLabel(day)) return null
            const isToday = day === todayDay
            const [x, y] = toXY(CX, CY, labelR, aMid(day))
            return (
              <text key={`lbl-${day}`} x={x.toFixed(2)} y={y.toFixed(2)}
                textAnchor="middle" dominantBaseline="middle"
                fill={isToday ? '#ffffff' : 'rgba(255,255,255,0.30)'}
                fontSize="11"
                fontWeight="500"
                fontFamily="-apple-system, BlinkMacSystemFont, sans-serif"
              >{day}</text>
            )
          })}

          {/* ── Centre date: day number ── */}
          <text x={CX} y={CY - 5}
            textAnchor="middle" dominantBaseline="middle"
            fill="#ffffff"
            fontSize="22" fontWeight="500"
            fontFamily="-apple-system, BlinkMacSystemFont, sans-serif"
            style={{
              filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.30)) drop-shadow(0 2px 4px rgba(0,0,0,0.50))',
            }}
          >{centerDay}</text>

          {/* ── Centre date: month abbreviation ── */}
          <text x={CX} y={CY + 8}
            textAnchor="middle" dominantBaseline="middle"
            fill="rgba(255,255,255,0.38)"
            fontSize="7" fontWeight="500"
            letterSpacing="0.12em"
            fontFamily="-apple-system, BlinkMacSystemFont, sans-serif"
          >{centerMonth}</text>

          {/* ── Centre dot (today indicator, inside centre circle) ── */}
          {todayDay > 0 && (
            <g filter="url(#rhc-today-glow)">
              <circle cx={CX} cy={CY + 19} r={3} fill="#ffffff" />
            </g>
          )}
        </svg>
        </div>{/* end drop-shadow wrapper */}
      </div>{/* end positioning context */}

      {/* Legend */}
      <div className="flex items-center gap-5 mt-3 px-1">
        {([
          { label: 'Done',   dotStyle: { background: '#ffffff', boxShadow: '0 0 10px rgba(255,255,255,0.8), 0 0 4px #fff' } },
          { label: 'Missed', dotStyle: { background: 'var(--missed-dot)', boxShadow: '0 0 4px hsla(var(--hue), 60%, 65%, 0.30)' } },
          { label: 'Future', dotStyle: { background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.20)' } },
        ]).map(({ label, dotStyle }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div style={{ width: 8, height: 8, borderRadius: '50%', ...dotStyle }} />
            <span className="text-[10px] tracking-wide" style={{ color: 'rgba(255,255,255,0.42)' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
