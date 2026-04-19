'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase-server'

export async function upsertHabitLog(date: string, habits: Record<string, boolean>) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('habit_logs')
    .upsert({ user_id: user.id, date, habits }, { onConflict: 'user_id,date' })

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  return { ok: true }
}
