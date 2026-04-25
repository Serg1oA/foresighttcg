'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/src/lib/supabase'
import { cn } from '@/src/lib/utils'
import type { User } from '@supabase/supabase-js'

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const navLink = (href: string, label: string) => (
    <Link
      href={href}
      className={cn(
        "text-sm font-medium transition-colors hover:text-white",
        pathname === href ? "text-white" : "text-zinc-400"
      )}
    >
      {label}
    </Link>
  )

  return (
    <nav className="border-b border-zinc-800 bg-zinc-950 sticky top-0 z-10">
      <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-bold text-white tracking-tight">
            ForesightTCG 🃏
          </Link>
          {user && (
            <>
              {navLink('/log', 'Log Match')}
              {navLink('/history', 'History')}
            </>
          )}
        </div>
        {user && (
          <button
            onClick={handleLogout}
            className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Sign Out
          </button>
        )}
      </div>
    </nav>
  )
}