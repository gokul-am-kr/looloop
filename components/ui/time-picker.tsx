'use client'

interface TimePickerProps {
  value: string       // "HH:MM" 24h format
  onChange: (v: string) => void
  accentColor?: string
}

// ── Conversions ────────────────────────────────────────────────────────────

function h24ToH12(h24: number): { h12: number; isPM: boolean } {
  if (h24 === 0)  return { h12: 12, isPM: false }
  if (h24 < 12)  return { h12: h24,      isPM: false }
  if (h24 === 12) return { h12: 12,      isPM: true }
  return { h12: h24 - 12, isPM: true }
}

function h12ToH24(h12: number, isPM: boolean): number {
  if (isPM)  return h12 === 12 ? 12 : h12 + 12
  return h12 === 12 ? 0 : h12
}

const MINUTE_STEP = 15
const _MINUTES = Array.from({ length: 60 / MINUTE_STEP }, (_, i) => i * MINUTE_STEP)

// Round to nearest 5 minutes
function roundMin(m: number): number {
  return Math.round(m / MINUTE_STEP) * MINUTE_STEP % 60
}

export function TimePicker({ value, onChange, accentColor = '#5AC8FA' }: TimePickerProps) {
  // Parse current value (default 22:00)
  const parts  = value ? value.split(':').map(Number) : [22, 0]
  const h24    = parts[0]
  const minute = roundMin(parts[1])
  const { h12, isPM } = h24ToH12(h24)

  function emit(nextH12: number, nextMin: number, nextPM: boolean) {
    const nextH24 = h12ToH24(nextH12, nextPM)
    onChange(
      `${String(nextH24).padStart(2, '0')}:${String(nextMin).padStart(2, '0')}`
    )
  }

  return (
    <div className="flex items-center justify-center gap-2">
      {/* Hour column */}
      <Column
        display={String(h12)}
        onUp={()   => emit(h12 === 12 ? 1 : h12 + 1, minute, isPM)}
        onDown={()  => emit(h12 === 1 ? 12 : h12 - 1, minute, isPM)}
      />

      <span className="text-white text-4xl font-bold pb-1 select-none">:</span>

      {/* Minute column */}
      <Column
        display={String(minute).padStart(2, '0')}
        onUp={()   => emit(h12, (minute + MINUTE_STEP) % 60, isPM)}
        onDown={()  => emit(h12, minute === 0 ? 60 - MINUTE_STEP : minute - MINUTE_STEP, isPM)}
      />

      {/* AM / PM */}
      <div className="flex flex-col gap-2 ml-3">
        {(['AM', 'PM'] as const).map((period) => {
          const active = isPM === (period === 'PM')
          return (
            <button
              key={period}
              onClick={() => emit(h12, minute, period === 'PM')}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: active ? accentColor : '#2C2C2E',
                color:      active ? '#000'       : '#636366',
              }}
            >
              {period}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Shared column ──────────────────────────────────────────────────────────

function Column({
  display,
  onUp,
  onDown,
}: {
  display: string
  onUp: () => void
  onDown: () => void
}) {
  return (
    <div className="flex flex-col items-center">
      <button
        onClick={onUp}
        className="flex items-center justify-center w-16 h-12 text-muted hover:text-white active:scale-90 transition-transform"
      >
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path d="M5 14L11 8L17 14" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <span className="text-white text-5xl font-bold w-16 text-center tabular-nums leading-none py-1 select-none">
        {display}
      </span>

      <button
        onClick={onDown}
        className="flex items-center justify-center w-16 h-12 text-muted hover:text-white active:scale-90 transition-transform"
      >
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path d="M5 8L11 14L17 8" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  )
}
