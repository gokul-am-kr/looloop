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

export function ActivityRings({
  rings,
  size,
  strokeWidth,
  gap = 10,
  centerBg,
  children,
}: ActivityRingsProps) {
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
            <filter key={i} id={`ringGlow${i}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation={ring.glowBlur / 4} in="SourceGraphic" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
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
          const offset        = circumference * (1 - clamped)

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
                style={{ transition: 'stroke-dashoffset 0.4s ease' }}
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
