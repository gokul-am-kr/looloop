'use client'

import { useState, useEffect } from 'react'

interface RingSpec {
  progress: number   // 0–1 normal; > 1 triggers overlap/coil effect
  color: string
  trackColor?: string
  glowBlur?: number  // enables soft glow on filled arc (SVG units)
}

interface ActivityRingsProps {
  rings: RingSpec[]
  size: number
  strokeWidth: number
  gap?: number
  centerBg?: string
  children?: React.ReactNode
}

// Stagger delay per ring index (ms)
const RING_DELAYS = [80, 220]

export function ActivityRings({
  rings,
  size,
  strokeWidth,
  gap = 10,
  centerBg,
  children,
}: ActivityRingsProps) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Two rAF ticks ensure the browser paints the initial 0-progress state
    // before the transition fires, giving a clean 0 → value sweep on mount.
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => setReady(true))
    )
    return () => cancelAnimationFrame(id)
  }, [])

  const center = size / 2

  // Inner edge of the innermost ring — used for the optional center fill circle
  const innerRingIdx = rings.length - 1
  const innerRingR   = center - strokeWidth / 2 - innerRingIdx * (strokeWidth + gap)
  const centerFillR  = Math.max(0, innerRingR - strokeWidth / 2 - 3)

  return (
    <div className="relative" style={{ width: '100%', height: '100%' }}>
      <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <defs>
          {rings.map((ring, i) => (
            <linearGradient key={i} id={`ringGrad${i}`} x1="1" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={ring.color} stopOpacity="0.25" />
              <stop offset="60%"  stopColor={ring.color} stopOpacity="0.85" />
              <stop offset="100%" stopColor={ring.color} stopOpacity="1"    />
            </linearGradient>
          ))}
          {rings.map((ring, i) => ring.glowBlur !== undefined && (
            <filter key={i} id={`ringGlow${i}`} x="-60%" y="-60%" width="220%" height="220%">
              {/* Dark shadow — blurred alpha of the arc */}
              <feGaussianBlur stdDeviation="7" in="SourceAlpha" result="shadowBlur" />
              <feFlood floodColor="#000000" floodOpacity="0.92" result="shadowColor" />
              <feComposite in="shadowColor" in2="shadowBlur" operator="in" result="shadow" />
              {/* Color glow */}
              <feGaussianBlur stdDeviation={ring.glowBlur / 4} in="SourceGraphic" result="glow" />
              {/* Layer: shadow → glow → sharp arc */}
              <feMerge>
                <feMergeNode in="shadow" />
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          ))}
        </defs>

        {/* Center fill with depth layers */}
        {centerBg && (
          <>
            <circle cx={center} cy={center} r={centerFillR} fill={centerBg} />
            {/* Inner shadow — dark ring near edge creates recessed look */}
            <circle cx={center} cy={center} r={centerFillR - 4} fill="none"
              stroke="rgba(0,0,0,0.55)" strokeWidth={8} />
            {/* Rim highlight */}
            <circle cx={center} cy={center} r={centerFillR} fill="none"
              stroke="rgba(255,255,255,0.07)" strokeWidth={1} />
          </>
        )}

        {rings.map((ring, i) => {
          const r             = center - strokeWidth / 2 - i * (strokeWidth + gap)
          const circumference = 2 * Math.PI * r
          const clamped       = Math.min(Math.max(ring.progress, 0), 1)
          const targetOffset  = circumference * (1 - clamped)
          // Before ready: offset = full circumference (invisible). After: animate to target.
          const offset        = ready ? targetOffset : circumference
          const delay         = RING_DELAYS[i] ?? i * 120

          return (
            <g key={i}>
              {/* 1 — Track */}
              <circle cx={center} cy={center} r={r} fill="none"
                stroke={ring.trackColor ?? 'rgba(255,255,255,0.05)'} strokeWidth={strokeWidth} />
              {/* 2 — Inner groove on track (recessed look) */}
              <circle cx={center} cy={center} r={r} fill="none"
                stroke="rgba(0,0,0,0.28)" strokeWidth={2} />
              {/* 3 — Filled arc with optional glow */}
              <circle cx={center} cy={center} r={r} fill="none"
                stroke={`url(#ringGrad${i})`} strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                style={{
                  transition: `stroke-dashoffset 1.1s cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms`,
                }}
                filter={ring.glowBlur !== undefined ? `url(#ringGlow${i})` : undefined}
              />
            </g>
          )
        })}
      </svg>

      {children && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  )
}
