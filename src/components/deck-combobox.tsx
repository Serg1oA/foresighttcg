'use client'

import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

type DeckOption = {
  id: string
  name: string
  icons?: string[]
  group: 'meta' | 'recent' | 'custom'
}

export function DeckCombobox({
  value,
  onChange,
  metaDecks,
  recentDecks,
  placeholder = 'Search or type a deck...',
}: {
  value: string
  onChange: (val: string) => void
  metaDecks: DeckOption[]
  recentDecks: DeckOption[]
  placeholder?: string
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // When a value is selected, show its name in the input
  useEffect(() => {
    if (value) {
      const found = [...metaDecks, ...recentDecks].find(d => d.id === value || d.name === value)
      setQuery(found?.name ?? value)
    } else {
      setQuery('')
    }
  }, [value])

  const filtered = (opts: DeckOption[]) =>
    opts.filter(d => d.name.toLowerCase().includes(query.toLowerCase()))

  const filteredMeta = filtered(metaDecks)
  const filteredRecent = filtered(recentDecks.filter(
    r => !metaDecks.find(m => m.id === r.id)
  ))

  const select = (opt: DeckOption) => {
    onChange(opt.name)
    setQuery(opt.name)
    setOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && query.trim()) {
      onChange(query.trim())
      setOpen(false)
    }
  }

  const displayValue = value
    ? [...metaDecks, ...recentDecks].find(d => d.name === value || d.id === value)
    : null

  return (
    <div ref={ref} className="relative">
      <div
        className={cn(
          "flex items-center gap-2 w-full px-3 py-2 bg-zinc-800 border rounded-lg text-sm transition-colors",
          open ? "border-zinc-500" : "border-zinc-700"
        )}
      >
        {displayValue?.icons?.[0] && !query.includes(displayValue.name) ? null : null}
        <input
          className="flex-1 bg-transparent outline-none text-white placeholder:text-zinc-500"
          placeholder={placeholder}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); onChange(e.target.value) }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
        />
        {value && (
          <button
            type="button"
            onClick={() => { onChange(''); setQuery(''); setOpen(false) }}
            className="text-zinc-500 hover:text-white text-xs"
          >
            ✕
          </button>
        )}
      </div>

      {open && (
        <div className="absolute z-20 mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl overflow-hidden max-h-72 overflow-y-auto">
          {filteredMeta.length > 0 && (
            <>
              <div className="px-3 py-1.5 text-xs text-zinc-500 font-semibold uppercase tracking-wider bg-zinc-950">
                Meta Decks
              </div>
              {filteredMeta.map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => select(opt)}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-zinc-800 transition-colors",
                    value === opt.name || value === opt.id ? "bg-zinc-800 text-white" : "text-zinc-300"
                  )}
                >
                  <span className="text-base">{opt.icons?.[0] ?? '🃏'}</span>
                  {opt.name}
                </button>
              ))}
            </>
          )}

          {filteredRecent.length > 0 && (
            <>
              <div className="px-3 py-1.5 text-xs text-zinc-500 font-semibold uppercase tracking-wider bg-zinc-950">
                Your Recent Decks
              </div>
              {filteredRecent.map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => select(opt)}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-zinc-800 transition-colors",
                    value === opt.name ? "bg-zinc-800 text-white" : "text-zinc-300"
                  )}
                >
                  <span className="text-base">🃏</span>
                  {opt.name}
                </button>
              ))}
            </>
          )}

          {query.trim() && !filteredMeta.find(d => d.name.toLowerCase() === query.toLowerCase()) && (
            <button
              type="button"
              onClick={() => { onChange(query.trim()); setOpen(false) }}
              className="w-full text-left px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-800 flex items-center gap-2"
            >
              <span>➕</span> Use &quot;{query.trim()}&quot;
            </button>
          )}

          {filteredMeta.length === 0 && filteredRecent.length === 0 && !query.trim() && (
            <div className="px-3 py-4 text-sm text-zinc-500 text-center">
              Start typing to search...
            </div>
          )}
        </div>
      )}
    </div>
  )
}