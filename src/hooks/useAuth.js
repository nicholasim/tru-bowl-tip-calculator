import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

/**
 * Tracks the current Supabase auth session and the matching profiles row.
 * `loading` is true only until the initial session check resolves.
 */
export function useAuth() {
  const [session, setSession] = useState(undefined)
  const [profileState, setProfileState] = useState(null)
  const userId = session?.user?.id ?? null

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null))

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession ?? null)
    })

    return () => subscription.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!userId) return

    let active = true
    supabase
      .from('profiles')
      .select('id, username, location_id')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        if (active) setProfileState(data ?? null)
      })

    return () => {
      active = false
    }
  }, [userId])

  return {
    session,
    user: session?.user ?? null,
    profile: userId ? profileState : null,
    loading: session === undefined,
  }
}
