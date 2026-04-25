'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { META_DECKS } from '@/lib/decks'
import { cn } from '@/lib/utils'

function SelectGrid({
  options,
  value,
  onChange,
}: {
  options: { id: string; label: string; emoji: string }[]
  value: string
  onChange: (val: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={cn(
            "flex flex-col items-center justify-center h-16 w-28 gap-1 rounded-lg border text-sm transition-colors",
            value === opt.id
              ? "bg-white text-zinc-950 border-white"
              : "bg-zinc-900 text-zinc-300 border-zinc-700 hover:bg-zinc-800"
          )}
        >
          <span className="text-xl">{opt.emoji}</span>
          <span className="text-xs text-center leading-tight">{opt.label}</span>
        </button>
      ))}
    </div>
  )
}

const RESULT_OPTIONS = [
  { id: 'win', label: 'Win', emoji: '🏆' },
  { id: 'loss', label: 'Loss', emoji: '💀' },
  { id: 'tie', label: 'Tie', emoji: '🤝' },
]

const FIRST_OPTIONS = [
  { id: 'true', label: 'Yes, I went first', emoji: '⚡' },
  { id: 'false', label: 'No, I went second', emoji: '🐢' },
]

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
      <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">{title}</h2>
      {children}
    </div>
  )
}

export default function LogMatch() {
  const router = useRouter()
  const supabase = createClient()

  const [myDeck, setMyDeck] = useState('')
  const [oppDeck, setOppDeck] = useState('')
  const [result, setResult] = useState('')
  const [wentFirst, setWentFirst] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSubmit = async () => {
    if (!myDeck || !oppDeck || !result || !wentFirst) return

    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }

    const { error } = await supabase.from('matches').insert({
      user_id: user.id,
      my_deck: myDeck,
      opp_deck: oppDeck,
      result,
      went_first: wentFirst === 'true',
    })

    setSaving(false)
    if (!error) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      setMyDeck('')
      setOppDeck('')
      setResult('')
      setWentFirst('')
    }
  }

  const allFilled = myDeck && oppDeck && result && wentFirst

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-2xl mx-auto p-6 space-y-4">

        <div className="flex items-center justify-between py-2">
          <h1 className="text-2xl font-bold">Log a Match</h1>
          <button
            onClick={() => router.push('/')}
            className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            ← Home
          </button>
        </div>

        <Section title="My Deck">
          <SelectGrid
            options={META_DECKS.map(d => ({ id: d.id, label: d.name, emoji: d.emoji }))}
            value={myDeck}
            onChange={setMyDeck}
          />
        </Section>

        <Section title="Opponent's Deck">
          <SelectGrid
            options={META_DECKS.map(d => ({ id: d.id, label: d.name, emoji: d.emoji }))}
            value={oppDeck}
            onChange={setOppDeck}
          />
        </Section>

        <Section title="Result">
          <SelectGrid
            options={RESULT_OPTIONS}
            value={result}
            onChange={setResult}
          />
        </Section>

        <Section title="Did you go first?">
          <SelectGrid
            options={FIRST_OPTIONS}
            value={wentFirst}
            onChange={setWentFirst}
          />
        </Section>

        <button
          onClick={handleSubmit}
          disabled={!allFilled || saving}
          className={cn(
            "w-full py-3 rounded-xl font-semibold text-base transition-all",
            allFilled && !saving
              ? "bg-white text-zinc-950 hover:bg-zinc-200"
              : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
          )}
        >
          {saved ? '✅ Match Logged!' : saving ? 'Saving...' : 'Log Match'}
        </button>

      </div>
    </main>
  )
}