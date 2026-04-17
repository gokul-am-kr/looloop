'use client'

// Radial fan chart — leftward fan, NOT starting perpendicular
// Fan: 100° (upper-left) → 260° (lower-left) through 180° (leftmost)
// Labels sit in the 60°–100° gap with bullet-journal guide lines.

import { palettes } from '@/lib/characters'
import type { Edition } from '@/types'

const RING_H    = 11
const RING_GAP  = 2
const DAY_INSET = 0.4    // angular inset each side → visible gap between tiles
const R_START   = 29
const R_LABEL   = 18
const FAN_START = 100
const FAN_END   = 260
const FAN_SPAN  = FAN_END - FAN_START

const MARGIN_L  = 17
const MARGIN_T  = 17
const MARGIN_B  = 8
const LABEL_W   = 45


const CHAR_EMOJI: Record<string, string> = {
  mochi: '🐱', pico: '🌵', jelli: '🪼', inko: '🐙',
}

// Subtle ambient particles: [radius-fraction, angle-deg, dot-size, anim-delay-s]
const PARTICLES: [number, number, number, number][] = [
  [0.52, 148, 1.4, 0.0 ],
  [0.78, 200, 1.8, 1.6 ],
  [0.93, 232, 1.1, 0.7 ],
  [1.12, 158, 1.5, 2.3 ],
  [1.07, 182, 1.3, 0.3 ],
  [0.62, 252, 1.0, 1.9 ],
  [0.86, 118, 1.2, 3.1 ],
  [0.38, 172, 0.9, 2.6 ],
  [1.18, 213, 1.4, 1.0 ],
  [0.70, 133, 0.8, 3.6 ],
  [0.45, 240, 1.0, 0.5 ],
  [1.02, 145, 1.1, 4.0 ],
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
  const large = (a2 - a1 > 180) ? 1 : 0
  return (
    `M ${ax.toFixed(2)} ${ay.toFixed(2)} ` +
    `A ${r1} ${r1} 0 ${large} 0 ${bx.toFixed(2)} ${by.toFixed(2)} ` +
    `L ${cx2.toFixed(2)} ${cy2.toFixed(2)} ` +
    `A ${r2} ${r2} 0 ${large} 1 ${dx.toFixed(2)} ${dy.toFixed(2)} Z`
  )
}

// Arc segment with straight start (tile end) and rounded far end
// startAngle > endAngle (decreasing — sweeps into label gap)
function labelChipPath(cx: number, cy: number, r1: number, r2: number, startAngle: number, endAngle: number) {
  const capR = (r2 - r1) / 2
  const [ax, ay] = toXY(cx, cy, r1, startAngle)  // inner, tile end
  const [bx, by] = toXY(cx, cy, r1, endAngle)    // inner, far end
  const [ex, ey] = toXY(cx, cy, r2, endAngle)    // outer, far end
  const [dx, dy] = toXY(cx, cy, r2, startAngle)  // outer, tile end
  return (
    `M ${ax.toFixed(2)} ${ay.toFixed(2)} ` +
    `A ${r1} ${r1} 0 0 1 ${bx.toFixed(2)} ${by.toFixed(2)} ` +
    `A ${capR.toFixed(2)} ${capR.toFixed(2)} 0 1 0 ${ex.toFixed(2)} ${ey.toFixed(2)} ` +
    `A ${r2} ${r2} 0 0 0 ${dx.toFixed(2)} ${dy.toFixed(2)} Z`
  )
}

function mkDate(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function hexDarken(hex: string, t: number) {
  const n = parseInt(hex.replace('#', ''), 16)
  const f = (c: number) => Math.round(c * (1 - t))
  return `#${[f((n >> 16) & 0xff), f((n >> 8) & 0xff), f(n & 0xff)].map(v => v.toString(16).padStart(2, '0')).join('')}`
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

  const outerR      = R_START + habitNames.length * (RING_H + RING_GAP) - RING_GAP
  const CX          = outerR + MARGIN_L
  const CY          = Math.ceil(outerR * Math.sin((FAN_START * Math.PI) / 180)) + MARGIN_T
  const vbW         = CX + LABEL_W
  const viewH       = CY + outerR + RING_H + 14
  const emoji       = CHAR_EMOJI[edition] ?? '🐱'
  const accent      = palettes[edition as Edition]?.accent ?? '#FF6B35'
  const accentMiss  = hexDarken(accent, 0.72)  // dark tinted version for missed tiles
  // Straight vertical boundary between tiles and labels.
  // R_START is the innermost ring inner edge at FAN_START — the rightmost point
  // any tile can reach, so labels starting here never overlap tiles.
  const commonSX    = CX + R_START * Math.cos((FAN_START * Math.PI) / 180)

  return (
    <div className="w-full">
      <svg
        key={`${year}-${month}`}
        viewBox={`0 0 ${vbW} ${viewH}`}
        width="100%"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <style>{`
            @keyframes rhcFade   { from { opacity:0 } to { opacity:1 } }
            @keyframes rhcPulse  { 0%,100% { opacity: 0.18; r: 1.1; } 50% { opacity: 0.55; r: 1.8; } }
            @keyframes rhcDrift  {
              0%   { transform: translate(0px, 0px); }
              33%  { transform: translate(1.5px, -2px); }
              66%  { transform: translate(-1px, 1.5px); }
              100% { transform: translate(0px, 0px); }
            }
          `}</style>

          {/* Large ambient glow behind the done-tile cluster */}
          <filter id="rhc-ambient" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="9" />
          </filter>

          {/* Particle glow */}
          <filter id="rhc-particle" x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur stdDeviation="1.8" />
          </filter>

          {/* (label paths removed — labels are now straight pills) */}

          {/* Glass chip fill gradient — accent tint fading to transparent */}
          <linearGradient id={`rhc-chip-grad-${habitNames.length}`}
            x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor={accent} stopOpacity="0.18" />
            <stop offset="60%"  stopColor={accent} stopOpacity="0.08" />
            <stop offset="100%" stopColor={accent} stopOpacity="0.03" />
          </linearGradient>

          {/* Glass chip blur filter */}
          <filter id="rhc-chip-blur" x="-10%" y="-40%" width="120%" height="180%">
            <feGaussianBlur stdDeviation="1.5" />
          </filter>

          {/* Common clip for ambient halo */}
          <clipPath id="rhc-tiles-clip">
            <rect x="0" y="0" width={commonSX.toFixed(2)} height={viewH} />
          </clipPath>
          {/* Per-ring clips — diagonal polygon matching the angled label cut */}
          {habitNames.map((_, hi) => {
            const r1 = R_START + hi * (RING_H + RING_GAP)
            const r2 = r1 + RING_H
            const [lxOuter, dy] = toXY(CX, CY, r2, FAN_START)
            const [lxInner, ay] = toXY(CX, CY, r1, FAN_START)
            const pts = [
              `0,0`,
              `${lxOuter.toFixed(2)},0`,
              `${lxOuter.toFixed(2)},${dy.toFixed(2)}`,
              `${lxInner.toFixed(2)},${ay.toFixed(2)}`,
              `${lxInner.toFixed(2)},${viewH}`,
              `0,${viewH}`,
            ].join(' ')
            return (
              <clipPath key={`rhc-ring-clip-${hi}`} id={`rhc-ring-clip-${hi}`}>
                <polygon points={pts} />
              </clipPath>
            )
          })}
        </defs>

        {/* ── Layer 0: ambient halo (blurred done tiles) ── */}
        <g filter="url(#rhc-ambient)" opacity="0.38" clipPath="url(#rhc-tiles-clip)">
          {habitNames.flatMap((name, hi) => {
            const r1 = R_START + hi * (RING_H + RING_GAP)
            const r2 = r1 + RING_H
            return days.map(day => {
              const isFuture = isCurrentMon && day > todayDay
              if (isFuture) return null
              const log = habitByDate[mkDate(year, month, day)] ?? {}
              if (!log[name]) return null
              return (
                <path key={`amb-${hi}-${day}`}
                  d={segPath(CX, CY, r1, r2, a1(day), a2(day))}
                  fill={accent}
                />
              )
            })
          })}
        </g>

        {/* ── Layer 1: ambient particles / light dust ── */}
        {PARTICLES.map(([rf, ang, size, delay], i) => {
          const pr = rf * outerR
          const [px, py] = toXY(CX, CY, pr, ang)
          // Only show particles within the fan angular range or just beyond
          const inRange = ang >= FAN_START - 20 && ang <= FAN_END + 20
          if (!inRange) return null
          return (
            <g key={`p-${i}`}
              style={{
                animation: `rhcDrift ${4 + i * 0.7}s ease-in-out ${delay}s infinite`,
                transformOrigin: `${px.toFixed(1)}px ${py.toFixed(1)}px`,
              }}
            >
              {/* Soft glow bloom */}
              <circle cx={px} cy={py} r={size * 3} fill={accent} opacity={0.06}
                filter="url(#rhc-particle)" />
              {/* Crisp core dot */}
              <circle cx={px} cy={py} r={size * 0.6} fill={accent}
                style={{ animation: `rhcPulse ${2.8 + i * 0.4}s ease-in-out ${delay}s infinite` }}
              />
            </g>
          )
        })}

        {/* ── Day separator pipes — thin radial ticks at every segment boundary ── */}
        {Array.from({ length: daysInMonth + 1 }, (_, i) => {
          const angle = FAN_START + i * angPerDay
          const [x1, y1] = toXY(CX, CY, R_START, angle)
          const [x2, y2] = toXY(CX, CY, outerR + RING_H, angle)
          return (
            <line key={`sep-${i}`}
              x1={x1.toFixed(2)} y1={y1.toFixed(2)}
              x2={x2.toFixed(2)} y2={y2.toFixed(2)}
              stroke="#000" strokeWidth="0.8" opacity="0.6"
            />
          )
        })}

        {/* ── Layers 2–N: tile rings, outermost first (each clipped to its own arc edge) ── */}
        {[...habitNames].reverse().map((name, revHi) => {
          const hi = habitNames.length - 1 - revHi
          const r1 = R_START + hi * (RING_H + RING_GAP)
          const r2 = r1 + RING_H

          return (
            <g key={`ring-${hi}`} clipPath={`url(#rhc-ring-clip-${hi})`}>
              {days.map((day, dayIdx) => {
                const ds       = mkDate(year, month, day)
                const isFuture = isCurrentMon && day > todayDay
                const done     = !isFuture && !!(habitByDate[ds] ?? {})[name]
                const da1 = a1(day), da2 = a2(day)
                const anim = { animation: `rhcFade 0.4s ease ${dayIdx * 11}ms both` as const }
                const d    = segPath(CX, CY, r1, r2, da1, da2)

                if (isFuture) return (
                  <path key={day} d={d}
                    fill="#0F0F16" stroke="#000" strokeWidth="0.5" style={anim} />
                )

                return (
                  <path key={day} d={d}
                    fill={done ? accent : accentMiss}
                    stroke="#000" strokeWidth="0.5"
                    onClick={() => onDayClick(ds)}
                    style={{ cursor: 'pointer', ...anim }}
                  />
                )
              })}
            </g>
          )
        })}

        {/* ── Habit label gradients + separators + text ── */}
        {habitNames.map((name, hi) => {
          const r1 = R_START + hi * (RING_H + RING_GAP)
          const r2 = r1 + RING_H
          // Angled cut: outer arc edge (top-left) → inner arc edge (bottom-left)
          const [lxOuter, dy] = toXY(CX, CY, r2, FAN_START)
          const [lxInner, ay] = toXY(CX, CY, r1, FAN_START)
          const textY  = (dy + ay) / 2
          const lineEnd = vbW - 2
          const gradId = `rhc-label-grad-${hi}`
          // Trapezoid: diagonal left edge follows the radial line at FAN_START
          const bg = [
            `M ${lxOuter.toFixed(2)} ${dy.toFixed(2)}`,
            `L ${lineEnd} ${dy.toFixed(2)}`,
            `L ${lineEnd} ${ay.toFixed(2)}`,
            `L ${lxInner.toFixed(2)} ${ay.toFixed(2)} Z`,
          ].join(' ')
          return (
            <g key={`label-${hi}`}>
              <defs>
                <linearGradient id={gradId} x1={lxOuter.toFixed(2)} y1="0" x2={lineEnd} y2="0"
                  gradientUnits="userSpaceOnUse">
                  <stop offset="0%"   stopColor={accent} stopOpacity="0.18" />
                  <stop offset="50%"  stopColor={accent} stopOpacity="0.07" />
                  <stop offset="100%" stopColor={accent} stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={bg} fill={`url(#${gradId})`} />
              <line x1={lxOuter.toFixed(2)} y1={dy.toFixed(2)} x2={lineEnd} y2={dy.toFixed(2)}
                stroke="#000" strokeWidth="0.8" opacity="0.6" />
              {hi === habitNames.length - 1 && (
                <line x1={lxInner.toFixed(2)} y1={ay.toFixed(2)} x2={lineEnd} y2={ay.toFixed(2)}
                  stroke="#000" strokeWidth="0.8" opacity="0.6" />
              )}
              <text
                x={commonSX + 4} y={textY}
                dominantBaseline="middle"
                fill="#C0C0CA" fontSize="4.5"
                fontFamily="-apple-system, BlinkMacSystemFont, sans-serif"
                letterSpacing="0.3"
              >
                {name.length > 12 ? name.slice(0, 11) + '…' : name}
              </text>
            </g>
          )
        })}

        {/* ── Day number labels — outside the outermost ring ── */}
        {days.map(day => {
          if (day === todayDay) return null  // rendered by circle indicator below
          const rOuter = outerR + RING_H + 2
          const [x, y] = toXY(CX, CY, rOuter, aMid(day))
          const isMilestone = showLabel(day)
          return (
            <text key={`lbl-${day}`} x={x} y={y}
              textAnchor="middle" dominantBaseline="middle"
              fill={isMilestone ? '#7A7A86' : '#3A3A48'}
              fontSize={isMilestone ? '6' : '4'}
              fontWeight="400"
              fontFamily="-apple-system, BlinkMacSystemFont, sans-serif"
            >{day}</text>
          )
        })}

        {/* Today circle indicator */}
        {todayDay > 0 && (() => {
          const rOuter = outerR + RING_H + 2
          const [tx, ty] = toXY(CX, CY, rOuter, aMid(todayDay))
          return (
            <g>
              <circle cx={tx} cy={ty} r={4.5} fill="#ffffff" opacity="0.75" />
              <text x={tx} y={ty + 1.9}
                textAnchor="middle"
                fill="#000000" fontSize="5" fontWeight="700"
                fontFamily="-apple-system, BlinkMacSystemFont, sans-serif"
              >{todayDay}</text>
            </g>
          )
        })()}

        {/* Character emoji */}
        <text x={CX} y={CY} textAnchor="middle" dominantBaseline="middle" fontSize="15">{emoji}</text>
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-5 mt-3 px-1">
        {[
          { label: 'Done',   bg: accent    },
          { label: 'Missed', bg: '#181820' },
          { label: 'Future', bg: '#0F0F16' },
        ].map(({ label, bg }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-sm" style={{ background: bg }} />
            <span className="text-[10px] tracking-wide" style={{ color: '#7A7A86' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
