interface RingSpec {
  progress: number   // 0 to 1; values > 1 trigger the overlap effect
  color: string
  trackColor?: string
}

interface ActivityRingsProps {
  rings: RingSpec[]  // index 0 = outermost ring
  size: number
  strokeWidth: number
  gap?: number
  children?: React.ReactNode
}

export function ActivityRings({
  rings,
  size,
  strokeWidth,
  gap = 10,
  children,
}: ActivityRingsProps) {
  const center   = size / 2
  const FADE_RAD = Math.PI / 8   // 22.5° fade-in zone for overflow start

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <defs>
          {rings.map((ring, i) => {
            const r = center - strokeWidth / 2 - i * (strokeWidth + gap)
            // Gradient for main arc: fades from tail (low opacity) to head (full)
            // x1/y1/x2/y2 are in SVG coords; after -90deg rotation the head is at 12 o'clock
            return [
              <linearGradient key={`grad${i}`} id={`ringGrad${i}`} x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%"   stopColor={ring.color} stopOpacity="0.15" />
                <stop offset="100%" stopColor={ring.color} stopOpacity="1"    />
              </linearGradient>,

              // Overflow fade gradient: transparent at 0° → opaque at FADE_RAD
              // userSpaceOnUse so we can pin it to the exact arc start position
              <linearGradient
                key={`ov${i}`}
                id={`ovFade${i}`}
                gradientUnits="userSpaceOnUse"
                x1={center + r}
                y1={center}
                x2={center + r * Math.cos(FADE_RAD)}
                y2={center + r * Math.sin(FADE_RAD)}
              >
                <stop offset="0%"   stopColor={ring.color} stopOpacity="0" />
                <stop offset="100%" stopColor={ring.color} stopOpacity="1" />
              </linearGradient>,
            ]
          })}
        </defs>

        {rings.map((ring, i) => {
          const r            = center - strokeWidth / 2 - i * (strokeWidth + gap)
          const circumference = 2 * Math.PI * r
          const clamped      = Math.min(Math.max(ring.progress, 0), 1)
          const overflow     = Math.max(ring.progress - 1, 0)
          const offset       = circumference * (1 - clamped)

          const tipAngle = Math.min(overflow, 1) * 2 * Math.PI
          const tipX     = center + r * Math.cos(tipAngle)
          const tipY     = center + r * Math.sin(tipAngle)

          return (
            <g key={i}>
              {/* Track */}
              <circle cx={center} cy={center} r={r} fill="none"
                stroke={ring.trackColor ?? '#2C2C2E'} strokeWidth={strokeWidth} />

              {/* Main arc — drawn first so overflow sits on top */}
              <circle cx={center} cy={center} r={r} fill="none"
                stroke={`url(#ringGrad${i})`} strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                style={{ transition: 'stroke-dashoffset 0.4s ease' }}
              />

              {/* Overflow: fades in from transparent at 12 o'clock → fully opaque */}
              {overflow > 0 && (
                <>
                  <circle cx={center} cy={center} r={r} fill="none"
                    stroke={`url(#ovFade${i})`} strokeWidth={strokeWidth}
                    strokeLinecap="butt"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference * (1 - Math.min(overflow, 1))}
                    style={{ transition: 'stroke-dashoffset 0.4s ease' }}
                  />
                  {/* Round tip — only the leading end has a cap */}
                  <circle cx={tipX} cy={tipY} r={strokeWidth / 2} fill={ring.color} />
                </>
              )}
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
