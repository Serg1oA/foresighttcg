'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import type { User } from '@supabase/supabase-js'

const NAV_LINKS = [
  { href: '/log', label: 'Log Match' },
  { href: '/history', label: 'History' },
  { href: '/stats', label: 'My Stats' },
  { href: '/meta', label: 'Meta' },
]

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<User | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [])

  // Close menu on route change
  useEffect(() => { setOpen(false) }, [pathname])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <nav className="border-b border-zinc-800 bg-zinc-950 sticky top-0 z-10">
      <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="font-bold text-white tracking-tight shrink-0">
          ForesightTCG 🃏
        </Link>

        {/* Desktop nav */}
        {user && (
          <div className="hidden sm:flex items-center gap-6">
            {NAV_LINKS.map(link => (
              <Link key={link.href} href={link.href}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-white",
                  pathname === link.href ? "text-white" : "text-zinc-400"
                )}>
                {link.label}
              </Link>
            ))}
            <button onClick={handleLogout}
              className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
              Sign Out
            </button>
          </div>
        )}

        {/* Mobile hamburger */}
        {user && (
          <button
            onClick={() => setOpen(o => !o)}
            className="sm:hidden flex flex-col gap-1.5 p-1"
            aria-label="Toggle menu"
          >
            <span className={cn("block w-6 h-0.5 bg-zinc-400 transition-all origin-center",
              open && "rotate-45 translate-y-2")} />
            <span className={cn("block w-6 h-0.5 bg-zinc-400 transition-all",
              open && "opacity-0")} />
            <span className={cn("block w-6 h-0.5 bg-zinc-400 transition-all origin-center",
              open && "-rotate-45 -translate-y-2")} />
          </button>
        )}
      </div>

      {/* Mobile menu */}
      {user && open && (
        <div className="sm:hidden border-t border-zinc-800 bg-zinc-950 px-6 py-4 flex flex-col gap-4">
          {NAV_LINKS.map(link => (
            <Link key={link.href} href={link.href}
              className={cn(
                "text-sm font-medium transition-colors",
                pathname === link.href ? "text-white" : "text-zinc-400"
              )}>
              {link.label}
            </Link>
          ))}
          <button onClick={handleLogout}
            className="text-sm text-zinc-500 text-left">
            Sign Out
          </button>
        </div>
      )}
    </nav>
  )
}