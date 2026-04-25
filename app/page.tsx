'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

export default function Home() {
  const supabase = createClient()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setLoading(false)
    })
  }, [])

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    })
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  if (loading) return null

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-950 text-white">
      <h1 className="text-5xl font-bold tracking-tight">ForesightTCG 🃏</h1>
      <p className="text-zinc-400">Your Pokémon TCG match tracker</p>

      {user ? (
        <div className="flex flex-col items-center gap-3 mt-2">
          <p className="text-sm text-zinc-500">Signed in as {user.email}</p>
          <button
            onClick={() => router.push('/log')}
            className="px-6 py-2.5 bg-white text-zinc-950 font-semibold rounded-lg hover:bg-zinc-200 transition-colors"
          >
            Log a Match
          </button>
          <button
            onClick={handleLogout}
            className="px-6 py-2.5 border border-zinc-700 text-zinc-300 font-semibold rounded-lg hover:bg-zinc-800 transition-colors"
          >
            Sign Out
          </button>
        </div>
      ) : (
        <button
          onClick={handleLogin}
          className="mt-2 px-6 py-2.5 bg-white text-zinc-950 font-semibold rounded-lg hover:bg-zinc-200 transition-colors"
        >
          Sign in with Google
        </button>
      )}
    </main>
  )
}