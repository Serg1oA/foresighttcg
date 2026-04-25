'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/src/lib/supabase'
import { META_DECKS } from '@/src/lib/decks'
import { cn } from '@/src/lib/utils'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts'

type Match = {
  id: string
  my_deck: string
  opp_deck: string
  result: string
  went_first: boolean
  timestamp: string
}

type EditingMatch = Match & { dirty: boolean }

const deckLabel = (id: string) =>
  META_DECKS.find(d => d.id === id)?.name ?? id

const deckEmoji = (id: string) =>
  META_DECKS.find(d => d.id === id)?.emoji ?? '❓'

const RESULT_COLORS: Record<string, string> = {
  win: '#22c55e',
  loss: '#ef4444',
  tie: '#eab308',
}

export default function History() {
  const supabase = createClient()
  const router = useRouter()

  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingMatch, setEditingMatch] = useState<EditingMatch | null>(null)
  const [filterResult, setFilterResult] = useState<string>('all')
  const [filterDeck, setFilterDeck] = useState<string>('all')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }

      const { data } = await supabase
        .from('matches')
        .select('*')
        .eq('user_id', user.id)
        .order('timestamp', { ascending: false })
        .limit(50)

      setMatches(data ?? [])
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

  // --- Filtered matches ---
  const filtered = matches.filter(m => {
    if (filterResult !== 'all' && m.result !== filterResult) return false
    if (filterDeck !== 'all' && m.my_deck !== filterDeck) return false
    return true
  })

  // --- Chart data ---
  const resultCounts = ['win', 'loss', 'tie'].map(r => ({
    name: r.charAt(0).toUpperCase() + r.slice(1),
    value: matches.filter(m => m.result === r).length,
  })).filter(r => r.value > 0)

  const winRateByDeck = Object.entries(
    matches.reduce((acc, m) => {
      if (!acc[m.opp_deck]) acc[m.opp_deck] = { wins: 0, total: 0 }
      acc[m.opp_deck].total++
      if (m.result === 'win') acc[m.opp_deck].wins++
      return acc
    }, {} as Record<string, { wins: number; total: number }>)
  )
    .map(([deck, { wins, total }]) => ({
      name: deckLabel(deck),
      winRate: Math.round((wins / total) * 100),
      total,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8)

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

  if (loading) return (
    <main className="flex items-center justify-center min-h-[80vh] text-zinc-500">
      Loading...
    </main>
  )

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-bold">Match History</h1>

      {/* Charts */}
      {matches.length >= 3 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">
              Win / Loss / Tie
            </h2>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={resultCounts} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({ name, percent }) => {
                    if (percent !== undefined) {
                        return `${name} ${Math.round(percent * 100)}%`;
                    } else {
                        return '';
                    }
                }}>
                {resultCounts.map((entry) => (
                    <Cell key={entry.name} fill={RESULT_COLORS[entry.name.toLowerCase()]} />
                ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">
              Win Rate vs Archetype
            </h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={winRateByDeck} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fill: '#a1a1aa', fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#a1a1aa', fontSize: 11 }} width={90} />
                <Tooltip
                  formatter={(value) => [`${value}%`, 'Win Rate']}
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
                />
                <Bar dataKey="winRate" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

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
            ...META_DECKS.map(d => ({ id: d.id, label: `${d.emoji} ${d.name}` }))
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
          {filtered.map(match => (
            <div key={match.id} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              {editingId === match.id && editingMatch ? (
                // Edit mode
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs text-zinc-400">My Deck</label>
                      <SelectInline
                        value={editingMatch.my_deck}
                        onChange={v => setEditingMatch({ ...editingMatch, my_deck: v, dirty: true })}
                        options={META_DECKS.map(d => ({ id: d.id, label: `${d.emoji} ${d.name}` }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-zinc-400">Opponent's Deck</label>
                      <SelectInline
                        value={editingMatch.opp_deck}
                        onChange={v => setEditingMatch({ ...editingMatch, opp_deck: v, dirty: true })}
                        options={META_DECKS.map(d => ({ id: d.id, label: `${d.emoji} ${d.name}` }))}
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
                // View mode
                <div className="flex items-center px-4 py-3 gap-4">
                  <span className={cn(
                    "text-xs font-bold uppercase tracking-wider w-10 text-center",
                    match.result === 'win' ? 'text-green-400' :
                    match.result === 'loss' ? 'text-red-400' : 'text-yellow-400'
                  )}>
                    {match.result}
                  </span>
                  <div className="flex-1 flex items-center gap-2 text-sm">
                    <span>{deckEmoji(match.my_deck)} {deckLabel(match.my_deck)}</span>
                    <span className="text-zinc-600">vs</span>
                    <span>{deckEmoji(match.opp_deck)} {deckLabel(match.opp_deck)}</span>
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
        </div>
      )}
    </main>
  )
}