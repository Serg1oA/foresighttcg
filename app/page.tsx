'use client'

import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase"

export default function Home() {
  const supabase = createClient()

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-4xl font-bold mb-4">ForesightTCG 🃏</h1>
      <p className="text-muted-foreground mb-6">Your Pokémon TCG match tracker</p>
      <Button onClick={handleLogin}>Sign in with Google</Button>
    </main>
  )
}