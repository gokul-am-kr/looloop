/**
 * Compute a 0-100 sleep score from the last 7 days of sleep logs.
 * Three components:
 *   Duration  (40 pts) — average hours slept vs goal (8h)
 *   Quality   (40 pts) — average quality rating (1-5 scale)
 *   Consistency (20 pts) — how many of the 7 nights were logged
 */

interface SleepEntry {
  bedtime:   string
  wake_time: string
  quality:   number
}

function calcHrs(bedtime: string, wakeTime: string): number {
  const [bh, bm] = bedtime.split(':').map(Number)
  const [wh, wm] = wakeTime.split(':').map(Number)
  let bed  = bh * 60 + bm
  let wake = wh * 60 + wm
  if (bed  < 12 * 60) bed  += 1440
  if (wake < 12 * 60) wake += 1440
  if (wake <= bed)    wake += 1440
  return (wake - bed) / 60
}

export interface SleepScore {
  total:       number   // 0-100
  duration:    number   // 0-40
  quality:     number   // 0-40
  consistency: number   // 0-20
  avgHrs:      number
  avgQuality:  number
  nightsLogged: number
  label:       string
}

export function computeSleepScore(logs: SleepEntry[], windowDays = 7): SleepScore {
  const n = logs.length
  if (n === 0) {
    return { total: 0, duration: 0, quality: 0, consistency: 0, avgHrs: 0, avgQuality: 0, nightsLogged: 0, label: 'No data' }
  }

  const avgHrs     = logs.reduce((s, l) => s + calcHrs(l.bedtime, l.wake_time), 0) / n
  const avgQuality = logs.reduce((s, l) => s + l.quality, 0) / n

  // Duration: 40 pts. Perfect at 8h, lose 5pts per hour short, gain nothing over 8h
  const durationPts = Math.max(0, Math.min(40, 40 - (8 - avgHrs) * 5))

  // Quality: 40 pts. Scale 1-5 → 0-40
  const qualityPts = ((avgQuality - 1) / 4) * 40

  // Consistency: 20 pts. n / windowDays × 20
  const consistencyPts = (n / windowDays) * 20

  const total = Math.round(durationPts + qualityPts + consistencyPts)

  const label =
    total >= 85 ? 'Excellent' :
    total >= 70 ? 'Good' :
    total >= 50 ? 'Fair' :
    'Needs work'

  return {
    total,
    duration:    Math.round(durationPts),
    quality:     Math.round(qualityPts),
    consistency: Math.round(consistencyPts),
    avgHrs,
    avgQuality,
    nightsLogged: n,
    label,
  }
}
