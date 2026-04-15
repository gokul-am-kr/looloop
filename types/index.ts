export type Edition = 'mochi' | 'pico' | 'jelli' | 'inko'

export interface User {
  id: string
  email: string
  created_at: string
  edition: Edition
}

export interface HabitLog {
  id: string
  user_id: string
  date: string
  habits: Record<string, boolean>
  created_at: string
}

export interface SleepLog {
  id: string
  user_id: string
  date: string
  bedtime: string
  wake_time: string
  quality: 1 | 2 | 3 | 4 | 5
  notes: string | null
  created_at: string
}

export interface Streak {
  id: string
  user_id: string
  current_streak: number
  longest_streak: number
  last_logged_date: string
}

export interface JournalScan {
  id: string
  user_id: string
  scan_url: string
  tick_count: number
  scanned_at: string
}

export type PremiumSource = 'qr' | 'razorpay'

export interface PremiumAccess {
  id: string
  user_id: string
  source: PremiumSource
  expires_at: string
  journal_edition: Edition
}

export interface ApiUsage {
  id: string
  user_id: string
  feature: string
  model: string
  created_at: string
}
