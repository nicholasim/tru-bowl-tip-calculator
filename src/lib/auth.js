import { supabase } from './supabaseClient'
import { migrateLocalDataToSupabase } from './migrateLocalData'

const EMAIL_DOMAIN = 'trubowl.internal'
const USERNAME_PATTERN = /^[A-Za-z0-9_-]{3,20}$/

export function validateUsername(username) {
  return USERNAME_PATTERN.test(username)
}

// Keep in sync with get_login_email() in supabase/schema.sql.
function toInternalEmail(username) {
  return `uid_${username.trim().toLowerCase()}@${EMAIL_DOMAIN}`
}

export async function signUpWithUsername(username, password) {
  const trimmed = username.trim()
  if (!validateUsername(trimmed)) {
    throw new Error('Username must be 3-20 characters: letters, numbers, _ or -')
  }

  const email = toInternalEmail(trimmed)
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) {
    if (error.message?.toLowerCase().includes('already registered')) {
      throw new Error('That username is already taken.')
    }
    throw error
  }

  const user = data.user
  if (!user) throw new Error('Account creation failed. Please try again.')

  const { error: profileError } = await supabase
    .from('profiles')
    .insert({ id: user.id, username: trimmed })
  if (profileError) {
    throw new Error('Could not create profile: ' + profileError.message)
  }

  try {
    await migrateLocalDataToSupabase()
  } catch (e) {
    console.error('Migration of local data failed:', e)
  }

  return user
}

export async function signInWithUsername(username, password) {
  const trimmed = username.trim()

  const { data: email, error: lookupError } = await supabase.rpc('get_login_email', {
    p_username: trimmed,
  })
  if (lookupError) throw lookupError
  if (!email) throw new Error('Invalid username or password.')

  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error('Invalid username or password.')
}

export async function signOut() {
  await supabase.auth.signOut()
}
