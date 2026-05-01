'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { DeckCombobox } from '@/components/deck-combobox'

type Match = {
  id: string
  my_deck: string
  opp_deck: string
  result: string
  went_first: boolean
  timestamp: string
}

type EditingMatch = Match & { dirty: boolean }

type DeckOption = {
  id: string
  name: string
  icons?: string[]
  group: 'meta' | 'recent'
}

const INITIAL_VISIBLE_ROWS = 20
const ROWS_PER_PAGE = 20

const SelectInline = ({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: { id: string; label: string }[]
}) => (
  <select
    value={value}
    onChange={e => onChange(e.target.value)}
    className="bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-2 py-1"
  >
    {options.map(o => (
      <option key={o.id} value={o.id}>{o.label}</option>
    ))}
  </select>
)

export default function History() {
  const supabase = createClient()
  const router = useRouter()

  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingMatch, setEditingMatch] = useState<EditingMatch | null>(null)
  const [filterResult, setFilterResult] = useState<string>('all')
  const [filterDeck, setFilterDeck] = useState<string>('all')
  const [metaDecks, setMetaDecks] = useState<DeckOption[]>([])
  const [recentDecks, setRecentDecks] = useState<DeckOption[]>([])
  const [visibleRows, setVisibleRows] = useState(INITIAL_VISIBLE_ROWS)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }

      const [{ data: matchData }, { data: meta }] = await Promise.all([
        supabase
          .from('matches')
          .select('*')
          .eq('user_id', user.id)
          .order('timestamp', { ascending: false })
          .limit(50),
        supabase
          .from('meta_decks')
          .select('id, name, icons')
          .order('usage_count', { ascending: false })
          .limit(10)
      ])

      setMatches(matchData ?? [])

      setMetaDecks((meta ?? []).map(d => ({ ...d, group: 'meta' as const })))

      const seen = new Set<string>()
      const recent: DeckOption[] = []
      for (const m of matchData ?? []) {
        for (const name of [m.my_deck, m.opp_deck]) {
          if (!seen.has(name)) {
            seen.add(name)
            recent.push({ id: name, name, group: 'recent' })
          }
        }
      }
      setRecentDecks(recent)
      setLoading(false)
    }
    load()
  }, [])

  const startEdit = (match: Match) => {
    setEditingId(match.id)
    setEditingMatch({ ...match, dirty: false })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingMatch(null)
  }

  const saveEdit = async () => {
    if (!editingMatch) return
    const { error } = await supabase
      .from('matches')
      .update({
        my_deck: editingMatch.my_deck,
        opp_deck: editingMatch.opp_deck,
        result: editingMatch.result,
        went_first: editingMatch.went_first,
      })
      .eq('id', editingMatch.id)

    if (!error) {
      setMatches(prev => prev.map(m => m.id === editingMatch.id ? editingMatch : m))
      cancelEdit()
    }
  }

  const deleteMatch = async (id: string) => {
    if (!confirm('Delete this match?')) return
    await supabase.from('matches').delete().eq('id', id)
    setMatches(prev => prev.filter(m => m.id !== id))
  }

  const filtered = matches.filter(m => {
    if (filterResult !== 'all' && m.result !== filterResult) return false
    if (filterDeck !== 'all' && m.my_deck !== filterDeck) return false
    return true
  })

  const myDecks = [...new Set(matches.map(m => m.my_deck))]
  const visibleMatches = filtered.slice(0, visibleRows)
  const canSeeMore = filtered.length > visibleRows

  useEffect(() => {
    setVisibleRows(INITIAL_VISIBLE_ROWS)
  }, [filterResult, filterDeck])

  if (loading) return (
    <main className="flex items-center justify-center min-h-[80vh] text-zinc-500">
      Loading...
    </main>
  )

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-8 text-white">
      <h1 className="text-2xl font-bold">Match History</h1>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <span className="text-sm text-zinc-400">Filter:</span>
        <SelectInline
          value={filterResult}
          onChange={setFilterResult}
          options={[
            { id: 'all', label: 'All results' },
            { id: 'win', label: '🏆 Wins' },
            { id: 'loss', label: '💀 Losses' },
            { id: 'tie', label: '🤝 Ties' },
          ]}
        />
        <SelectInline
          value={filterDeck}
          onChange={setFilterDeck}
          options={[
            { id: 'all', label: 'All my decks' },
            ...myDecks.map(d => ({ id: d, label: d }))
          ]}
        />
        {(filterResult !== 'all' || filterDeck !== 'all') && (
          <button
            onClick={() => { setFilterResult('all'); setFilterDeck('all') }}
            className="text-xs text-zinc-500 hover:text-zinc-300 underline"
          >
            Clear
          </button>
        )}
        <span className="text-xs text-zinc-600 ml-auto">{filtered.length} matches</span>
      </div>

      {/* Match list */}
      {filtered.length === 0 ? (
        <p className="text-zinc-500 text-center py-12">No matches found.</p>
      ) : (
        <div className="space-y-2">
          {visibleMatches.map(match => (
            <div
              key={match.id}
              className={cn(
                'rounded-xl overflow-hidden border',
                match.result === 'win' && 'bg-emerald-950/20 border-emerald-800/40',
                match.result === 'loss' && 'bg-red-950/20 border-red-800/40',
                match.result === 'tie' && 'bg-zinc-900 border-zinc-800'
              )}
            >
              {editingId === match.id && editingMatch ? (
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs text-zinc-400">My Deck</label>
                      <DeckCombobox
                        value={editingMatch.my_deck}
                        onChange={v => setEditingMatch({ ...editingMatch, my_deck: v, dirty: true })}
                        metaDecks={metaDecks}
                        recentDecks={recentDecks}
                        placeholder="Search deck..."
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-zinc-400">Opponent's Deck</label>
                      <DeckCombobox
                        value={editingMatch.opp_deck}
                        onChange={v => setEditingMatch({ ...editingMatch, opp_deck: v, dirty: true })}
                        metaDecks={metaDecks}
                        recentDecks={recentDecks}
                        placeholder="Search deck..."
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-zinc-400">Result</label>
                      <SelectInline
                        value={editingMatch.result}
                        onChange={v => setEditingMatch({ ...editingMatch, result: v, dirty: true })}
                        options={[
                          { id: 'win', label: '🏆 Win' },
                          { id: 'loss', label: '💀 Loss' },
                          { id: 'tie', label: '🤝 Tie' },
                        ]}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-zinc-400">Went First?</label>
                      <SelectInline
                        value={editingMatch.went_first ? 'true' : 'false'}
                        onChange={v => setEditingMatch({ ...editingMatch, went_first: v === 'true', dirty: true })}
                        options={[
                          { id: 'true', label: '⚡ Yes' },
                          { id: 'false', label: '🐢 No' },
                        ]}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button onClick={cancelEdit} className="px-4 py-1.5 text-sm border border-zinc-700 rounded-lg text-zinc-400 hover:bg-zinc-800">
                      Cancel
                    </button>
                    <button onClick={saveEdit} className="px-4 py-1.5 text-sm bg-white text-zinc-950 font-semibold rounded-lg hover:bg-zinc-200">
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center px-4 py-3 gap-4">
                  <span className={cn(
                    "text-xs font-bold uppercase tracking-wider w-10 text-center",
                    match.result === 'win' ? 'text-green-400' :
                    match.result === 'loss' ? 'text-red-400' : 'text-yellow-400'
                  )}>
                    {match.result}
                  </span>
                  <div className="flex-1 flex items-center gap-2 text-sm">
                    <span>{match.my_deck}</span>
                    <span className="text-zinc-600">vs</span>
                    <span>{match.opp_deck}</span>
                  </div>
                  <span className="text-xs text-zinc-600">
                    {match.went_first ? '⚡ First' : '🐢 Second'}
                  </span>
                  <span className="text-xs text-zinc-600 hidden sm:block">
                    {new Date(match.timestamp).toLocaleDateString()}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(match)}
                      className="text-zinc-500 hover:text-white transition-colors text-sm"
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => deleteMatch(match.id)}
                      className="text-zinc-500 hover:text-red-400 transition-colors text-sm"
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {canSeeMore && (
            <div className="flex justify-center pt-2">
              <button
                onClick={() => setVisibleRows(prev => prev + ROWS_PER_PAGE)}
                className="px-4 py-2 text-sm rounded-lg border border-zinc-700 text-zinc-200 hover:bg-zinc-800 transition-colors"
              >
                See more
              </button>
            </div>
          )}
        </div>
      )}
    </main>
  )
}