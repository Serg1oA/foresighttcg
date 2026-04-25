'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/src/lib/supabase'
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

  if (loading) return null

  return (
    <main className="flex flex-col items-center justify-center min-h-[80vh] gap-4">
      <h1 className="text-5xl font-bold tracking-tight">ForesightTCG 🃏</h1>
      <p className="text-zinc-400">Your Pokémon TCG match tracker</p>
      {user ? (
        <button
          onClick={() => router.push('/log')}
          className="mt-2 px-6 py-2.5 bg-white text-zinc-950 font-semibold rounded-lg hover:bg-zinc-200 transition-colors"
        >
          Log a Match
        </button>
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