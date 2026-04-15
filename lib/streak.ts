/**
 * Compute the current habit streak from an array of logged date strings (YYYY-MM-DD).
 * A streak is active if the user logged habits today OR yesterday.
 */
export function computeStreak(loggedDates: string[]): number {
  if (loggedDates.length === 0) return 0

  const unique = Array.from(new Set(loggedDates)).sort().reverse()
  const today     = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().split('T')[0]

  // Streak is dead if last log is older than yesterday
  if (unique[0] !== today && unique[0] !== yesterday) return 0

  let streak = 1
  for (let i = 1; i < unique.length; i++) {
    const prev     = new Date(unique[i - 1] + 'T00:00:00')
    const curr     = new Date(unique[i]     + 'T00:00:00')
    const diffDays = Math.round((prev.getTime() - curr.getTime()) / 86_400_000)
    if (diffDays === 1) streak++
    else break
  }
  return streak
}
