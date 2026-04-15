interface RingSpec {
  progress: number   // 0 to 1
  color: string
  trackColor?: string
}

interface ActivityRingsProps {
  rings: RingSpec[]  // index 0 = outermost ring
  size: number
  strokeWidth: number
  gap?: number       // gap between rings in px
  children?: React.ReactNode
}

export function ActivityRings({
  rings,
  size,
  strokeWidth,
  gap = 10,
  children,
}: ActivityRingsProps) {
  const center = size / 2

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <defs>
          {rings.map((ring, i) => (
            // Gradient runs bottom→top in SVG space (which is tail→head after -90deg rotation)
            <linearGradient key={i} id={`ringGrad${i}`} x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%"   stopColor={ring.color} stopOpacity="0.15" />
              <stop offset="100%" stopColor={ring.color} stopOpacity="1" />
            </linearGradient>
          ))}
        </defs>

        {rings.map((ring, i) => {
          const r = center - strokeWidth / 2 - i * (strokeWidth + gap)
          const circumference = 2 * Math.PI * r
          const offset = circumference * (1 - Math.min(Math.max(ring.progress, 0), 1))

          return (
            <g key={i}>
              <circle cx={center} cy={center} r={r} fill="none"
                stroke={ring.trackColor ?? '#2C2C2E'} strokeWidth={strokeWidth} />
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
