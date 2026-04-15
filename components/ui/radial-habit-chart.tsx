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

const MARGIN_L  = 8
const MARGIN_T  = 10
const MARGIN_B  = 8
const LABEL_W   = 88


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
        <p className="text-sm" style={{ color: '#636366' }}>Set up habits to see your chart</p>
      </div>
    )
  }

  const outerR      = R_START + habitNames.length * (RING_H + RING_GAP) - RING_GAP
  const CX          = outerR + MARGIN_L
  const CY          = Math.ceil(outerR * Math.sin((FAN_START * Math.PI) / 180)) + MARGIN_T
  const vbW         = CX + LABEL_W
  const viewH       = CY + outerR + MARGIN_B
  const emoji       = CHAR_EMOJI[edition] ?? '🐱'
  const accent      = palettes[edition as Edition]?.accent ?? '#FF6B35'
  const accentMiss  = hexDarken(accent, 0.72)  // dark tinted version for missed tiles

  // Pre-compute trig for FAN_START so label y-positions align to their rings
  const FS_COS = Math.cos((FAN_START * Math.PI) / 180)  // ≈ -0.174
  const FS_SIN = Math.sin((FAN_START * Math.PI) / 180)  // ≈ 0.985

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
        </defs>

        {/* ── Layer 0: ambient halo (blurred done tiles) ── */}
        <g filter="url(#rhc-ambient)" opacity="0.38">
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

        {/* ── Layers 2–N: tile rings, outermost first ── */}
        {[...habitNames].reverse().map((name, revHi) => {
          const hi = habitNames.length - 1 - revHi
          const r1 = R_START + hi * (RING_H + RING_GAP)
          const r2 = r1 + RING_H

          return (
            <g key={`ring-${hi}`}>
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

        {/* ── Habit labels — y-aligned to each ring at FAN_START, with connector ── */}
        {habitNames.map((name, hi) => {
          const rMid = R_START + hi * (RING_H + RING_GAP) + RING_H / 2
          // y matches the ring's mid-radius at the fan's start angle
          const lblY       = CY - rMid * FS_SIN
          // connector: from ring mid-radius point → just past CX
          const xConnStart = CX + rMid * FS_COS   // inside ring edge at FAN_START (slightly left of CX)
          const xConnEnd   = CX + 3

          return (
            <g key={`hlbl-${hi}`}>
              {/* Dot at ring edge */}
              <circle cx={xConnStart} cy={lblY} r={1} fill={accent} opacity={0.45} />
              {/* Short horizontal bridge to label area */}
              <line
                x1={xConnStart.toFixed(2)} y1={lblY.toFixed(2)}
                x2={xConnEnd.toFixed(2)}   y2={lblY.toFixed(2)}
                stroke={accent} strokeWidth="0.5" opacity={0.25}
              />
              {/* Label text right-aligned */}
              <text
                x={vbW - 2} y={lblY}
                textAnchor="end" dominantBaseline="middle"
                fill="#B8B8C0" fontSize="8"
                fontFamily="-apple-system, BlinkMacSystemFont, sans-serif"
                letterSpacing="0.2"
              >
                {name.length > 11 ? name.slice(0, 10) + '…' : name}
              </text>
            </g>
          )
        })}

        {/* ── Day number labels ── */}
        {days.map(day => {
          if (!showLabel(day) && day !== todayDay) return null
          const [x, y] = toXY(CX, CY, R_LABEL, aMid(day))
          const isToday = day === todayDay
          return (
            <text key={`lbl-${day}`} x={x} y={y}
              textAnchor="middle" dominantBaseline="middle"
              fill={isToday ? '#fff' : '#3A3A44'}
              fontSize={isToday ? '7.5' : '6'}
              fontWeight={isToday ? '600' : '400'}
              fontFamily="-apple-system, BlinkMacSystemFont, sans-serif"
            >{day}</text>
          )
        })}

        {/* Today glow dot */}
        {todayDay > 0 && (() => {
          const [tx, ty] = toXY(CX, CY, R_LABEL, aMid(todayDay))
          return (
            <>
              <circle cx={tx} cy={ty} r={6} fill={accent} opacity={0.08} />
              <circle cx={tx} cy={ty} r={3} fill="rgba(255,255,255,0.22)" />
            </>
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
            <span className="text-[10px] tracking-wide" style={{ color: '#52525A' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
