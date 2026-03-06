import { createClient } from './server'
import type { User } from '@supabase/supabase-js'

/**
 * Get authenticated user from server context.
 * Returns null if not authenticated.
 */
export async function getUser(): Promise<User | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}
