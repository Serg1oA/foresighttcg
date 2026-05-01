'use client'

import { useState, useEffect, useRef } from 'react'
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

function SelectGrid({ options, value, onChange, vertical = false }: {
  options: { id: string; label: string; emoji: string }[]
  value: string
  onChange: (val: string) => void
  vertical?: boolean
}) {
  return (
    <div className={cn('gap-2', vertical ? 'grid grid-cols-1' : 'flex flex-wrap')}>
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={cn(
            'flex flex-col items-center justify-center h-16 gap-1 rounded-lg border text-sm transition-colors',
            vertical ? 'w-full' : 'flex-1 min-w-24',
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

function Section({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3', className)}>
      <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">{title}</h2>
      {children}
    </div>
  )
}

type RecentMatch = {
  id: string
  my_deck: string
  opp_deck: string
  result: string
  went_first: boolean
  timestamp: string
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
  const [recentMatches, setRecentMatches] = useState<RecentMatch[]>([])
  const [tracker, setTracker] = useState(Array.from({ length: 6 }, () => ({ text: '', drawn: false })))
  const historyRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }

      const [{ data: meta }, { data: matches }, { data: recentMatchesData }] = await Promise.all([
        supabase.from('meta_decks').select('id, name, icons').order('usage_count', { ascending: false }).limit(10),
        supabase.from('matches').select('my_deck, opp_deck').eq('user_id', user.id).order('timestamp', { ascending: false }).limit(50),
        supabase.from('matches').select('id, my_deck, opp_deck, result, went_first, timestamp').eq('user_id', user.id).order('timestamp', { ascending: false }).limit(10)
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
      setRecentMatches(recentMatchesData ?? [])
    }
    load()
  }, [])

  const handleSubmit = async () => {
    if (!myDeck || !oppDeck || !result || !wentFirst) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); setSaving(false); return }

    const { data: inserted, error } = await supabase.from('matches').insert({
      user_id: user.id,
      my_deck: myDeck,
      opp_deck: oppDeck,
      result,
      went_first: wentFirst === 'true',
    }).select('id, my_deck, opp_deck, result, went_first, timestamp').single()

    setSaving(false)
    if (!error) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      if (inserted) {
        setRecentMatches(prev => [inserted, ...prev].slice(0, 10))
        historyRef.current?.animate(
          [{ transform: 'translateY(-22px)', opacity: 0.45 }, { transform: 'translateY(0)', opacity: 1 }],
          { duration: 420, easing: 'ease-out' }
        )
      }
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
          <div className="md:col-span-2">
            <Section title="Prize card tracker" className="h-full">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {tracker.map((line, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setTracker(prev => prev.map((v, idx) => idx === i ? { ...v, drawn: !v.drawn } : v))}
                      className={cn(
                        'h-7 w-7 rounded border text-sm font-semibold',
                        line.drawn ? 'border-zinc-500 text-zinc-200 bg-zinc-800' : 'border-zinc-700 text-zinc-500'
                      )}
                      aria-label={`Toggle drawn for card ${i + 1}`}
                    >
                      {line.drawn ? '✓' : ''}
                    </button>
                    <input
                      value={line.text}
                      onChange={e => setTracker(prev => prev.map((v, idx) => idx === i ? { ...v, text: e.target.value } : v))}
                      className={cn('w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-sm outline-none focus:border-zinc-600', line.drawn && 'line-through text-zinc-500')}
                      placeholder={`Card ${i + 1}`}
                    />
                  </div>
                ))}
              </div>
            </Section>
          </div>

          <div className="md:col-span-1">
            <Section title="Did you go first?" className="h-full">
              <SelectGrid options={FIRST_OPTIONS} value={wentFirst} onChange={setWentFirst} vertical />
            </Section>
          </div>
        </div>

        <Section title="Result">
          <SelectGrid options={RESULT_OPTIONS} value={result} onChange={setResult} />
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

        <div ref={historyRef} className="space-y-2 pt-2">
          {recentMatches.map(match => (
            <div
              key={match.id}
              className={cn(
                'rounded-xl overflow-hidden border px-4 py-2',
                match.result === 'win' && 'bg-emerald-950/20 border-emerald-800/40',
                match.result === 'loss' && 'bg-red-950/20 border-red-800/40',
                match.result === 'tie' && 'bg-zinc-900 border-zinc-800'
              )}
            >
              <div className="flex items-center gap-3 text-sm">
                <span className={cn('text-xs font-bold uppercase w-10 text-center', match.result === 'win' ? 'text-emerald-400' : match.result === 'loss' ? 'text-red-400' : 'text-yellow-400')}>{match.result}</span>
                <span className="truncate">{match.my_deck}</span>
                <span className="text-zinc-600">vs</span>
                <span className="truncate">{match.opp_deck}</span>
                <span className="ml-auto text-xs text-zinc-500">{match.went_first ? '⚡ First' : '🐢 Second'}</span>
              </div>
            </div>
          ))}
          <div className="flex justify-center pt-2">
            <button onClick={() => router.push('/history')} className="px-4 py-2 text-sm rounded-lg border border-zinc-700 text-zinc-200 hover:bg-zinc-800 transition-colors">
              See full history
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}