interface RingSpec {
  progress: number   // 0–1 normal; > 1 triggers overlap/coil effect
  color: string
  trackColor?: string
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
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <defs>
          {rings.map((ring, i) => (
            <linearGradient key={i} id={`ringGrad${i}`} x1="1" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={ring.color} stopOpacity="0.25" />
              <stop offset="60%"  stopColor={ring.color} stopOpacity="0.85" />
              <stop offset="100%" stopColor={ring.color} stopOpacity="1"    />
            </linearGradient>
          ))}
        </defs>

        {/* Optional center fill circle */}
        {centerBg && (
          <circle cx={center} cy={center} r={centerFillR} fill={centerBg} />
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
                stroke={ring.trackColor ?? 'rgba(255,255,255,0.06)'} strokeWidth={strokeWidth} />

              {/* 2 — Main arc */}
              <circle cx={center} cy={center} r={r} fill="none"
                stroke={`url(#ringGrad${i})`} strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                style={{ transition: 'stroke-dashoffset 0.4s ease' }}
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
