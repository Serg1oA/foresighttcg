'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { DeckCombobox } from '@/components/deck-combobox'

const RESULT_OPTIONS = [
  { id: 'win', label: 'Win', emoji: '🏆' },
  { id: 'loss', label: 'Loss', emoji: '💀' },
  { id: 'tie', label: 'Tie', emoji: '🤝' },
]

const FIRST_OPTIONS = [
  { id: 'true', label: 'Yes, I went first', emoji: '⚡' },
  { id: 'false', label: 'No, I went second', emoji: '🐢' },
]

function SelectGrid({ options, value, onChange }: {
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
            "flex flex-col items-center justify-center h-16 flex-1 min-w-24 gap-1 rounded-lg border text-sm transition-colors",
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
  const [metaDecks, setMetaDecks] = useState<{ id: string; name: string; icons: string[]; group: 'meta' }[]>([])
  const [recentDecks, setRecentDecks] = useState<{ id: string; name: string; group: 'recent' }[]>([])

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }

      const [{ data: meta }, { data: matches }] = await Promise.all([
        supabase.from('meta_decks').select('id, name, icons').order('usage_count', { ascending: false }).limit(10),
        supabase.from('matches').select('my_deck, opp_deck').eq('user_id', user.id).order('timestamp', { ascending: false }).limit(50)
      ])

      setMetaDecks((meta ?? []).map(d => ({ ...d, group: 'meta' as const })))

      // Collect unique deck names from match history
      const seen = new Set<string>()
      const recent: { id: string; name: string; group: 'recent' }[] = []
      for (const m of matches ?? []) {
        for (const name of [m.my_deck, m.opp_deck]) {
          if (!seen.has(name)) {
            seen.add(name)
            recent.push({ id: name, name, group: 'recent' })
          }
        }
      }
      setRecentDecks(recent)
    }
    load()
  }, [])

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
        <h1 className="text-2xl font-bold py-2">Log a Match</h1>

        <Section title="My Deck">
          <DeckCombobox
            value={myDeck}
            onChange={setMyDeck}
            metaDecks={metaDecks}
            recentDecks={recentDecks}
            placeholder="Search or type your deck..."
          />
        </Section>

        <Section title="Opponent's Deck">
          <DeckCombobox
            value={oppDeck}
            onChange={setOppDeck}
            metaDecks={metaDecks}
            recentDecks={recentDecks}
            placeholder="Search or type opponent's deck..."
          />
        </Section>

        <Section title="Result">
          <SelectGrid options={RESULT_OPTIONS} value={result} onChange={setResult} />
        </Section>

        <Section title="Did you go first?">
          <SelectGrid options={FIRST_OPTIONS} value={wentFirst} onChange={setWentFirst} />
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