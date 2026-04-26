'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts'

type MetaDeck = {
  id: string
  name: string
  icons: string[]
  usage_count: number
}

type Matchup = {
  deck_a: string
  deck_b: string
  wins: number
  losses: number
  ties: number
}

const winRateFromRecord = (wins: number, losses: number, ties: number) => {
  const total = wins + losses + ties
  if (total === 0) return null
  return Math.round(((wins + ties * 0.5) / total) * 100)
}

const winRateColor = (rate: number | null) => {
  if (rate === null) return 'bg-zinc-800 text-zinc-600'
  if (rate >= 60) return 'bg-green-900 text-green-300'
  if (rate >= 53) return 'bg-green-950 text-green-400'
  if (rate >= 47) return 'bg-zinc-800 text-zinc-300'
  if (rate >= 40) return 'bg-red-950 text-red-400'
  return 'bg-red-900 text-red-300'
}

const TIME_FILTERS = [
  { id: '7', label: 'Last 7 days' },
  { id: '14', label: 'Last 14 days' },
  { id: '30', label: 'Last 30 days' },
  { id: '90', label: 'Last 90 days' },
]

export default function MetaPage() {
  const supabase = createClient()
  const [decks, setDecks] = useState<MetaDeck[]>([])
  const [matchups, setMatchups] = useState<Matchup[]>([])
  const [loading, setLoading] = useState(true)
  const [timeFilter, setTimeFilter] = useState('30')

  useEffect(() => {
    const load = async () => {
      const [{ data: metaDecks }, { data: metaMatchups }] = await Promise.all([
        supabase.from('meta_decks').select('*').order('usage_count', { ascending: false }).limit(12),
        supabase.from('meta_matchups').select('*')
      ])
      setDecks(metaDecks ?? [])
      setMatchups(metaMatchups ?? [])
      setLoading(false)
    }
    load()
  }, [])

  // Usage share chart data
  const totalUsage = decks.reduce((acc, d) => acc + d.usage_count, 0)
  const usageData = decks.map(d => ({
    name: d.name,
    usage: d.usage_count,
    share: totalUsage > 0 ? Math.round((d.usage_count / totalUsage) * 100) : 0
  }))

  // Build matchup matrix
  const topDecks = decks.slice(0, 10)
  const getMatchup = (deckA: string, deckB: string) => {
    const m = matchups.find(m => m.deck_a === deckA && m.deck_b === deckB)
    if (!m) return null
    return winRateFromRecord(m.wins, m.losses, m.ties)
  }

  if (loading) return (
    <main className="flex items-center justify-center min-h-[80vh] text-zinc-500">Loading meta data...</main>
  )

  if (decks.length === 0) return (
    <main className="flex flex-col items-center justify-center min-h-[80vh] gap-3 text-center px-6">
      <p className="text-zinc-300 font-semibold">No meta data yet</p>
      <p className="text-zinc-500 text-sm max-w-sm">
        The daily sync hasn't run yet. You can trigger it manually in your Supabase dashboard under Edge Functions → fetch-meta → Invoke.
      </p>
    </main>
  )

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-8 text-white">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Meta Overview</h1>
        <div className="flex gap-2">
          {TIME_FILTERS.map(f => (
            <button key={f.id} onClick={() => setTimeFilter(f.id)}
              className={cn("px-3 py-1.5 rounded-lg text-sm border transition-colors",
                timeFilter === f.id ? "bg-white text-zinc-950 border-white" : "border-zinc-700 text-zinc-400 hover:bg-zinc-800"
              )}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Usage share bar chart */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">
          Meta Share (% of tournament players)
        </h2>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={usageData} layout="vertical" margin={{ left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
            <XAxis type="number" tickFormatter={v => `${v}%`} tick={{ fill: '#a1a1aa', fontSize: 11 }} />
            <YAxis type="category" dataKey="name" tick={{ fill: '#a1a1aa', fontSize: 11 }} width={120} />
            <Tooltip
              formatter={(v, name) => name === 'share' ? [`${v}%`, 'Meta Share'] : [v, 'Players']}
              contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
            />
            <Bar dataKey="share" radius={[0, 4, 4, 0]}>
              {usageData.map((_, i) => (
                <Cell key={i} fill={`hsl(${200 + i * 15}, 70%, 55%)`} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Matchup matrix */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-2">
          Matchup Matrix
        </h2>
        <p className="text-xs text-zinc-600 mb-4">
          Row vs Column win rate. Ties count as ½ win. Gray = no data.
        </p>
        <div className="overflow-x-auto">
          <table className="text-xs border-collapse min-w-full">
            <thead>
              <tr>
                <th className="w-28 p-2 text-left text-zinc-500 font-normal">My deck →<br/>Opp ↓</th>
                {topDecks.map(d => (
                  <th key={d.id} className="p-2 text-center text-zinc-400 font-medium w-16 max-w-16">
                    <div className="truncate" title={d.name}>
                      {d.icons?.[0] ? <span className="text-base">{d.icons[0]}</span> : d.name.slice(0, 6)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topDecks.map(rowDeck => (
                <tr key={rowDeck.id}>
                  <td className="p-2 text-zinc-400 font-medium truncate max-w-28" title={rowDeck.name}>
                    {rowDeck.icons?.[0]} {rowDeck.name.slice(0, 12)}
                  </td>
                  {topDecks.map(colDeck => {
                    if (rowDeck.id === colDeck.id) return (
                      <td key={colDeck.id} className="p-1">
                        <div className="w-14 h-10 rounded bg-zinc-800 flex items-center justify-center text-zinc-600">—</div>
                      </td>
                    )
                    const rate = getMatchup(rowDeck.id, colDeck.id)
                    return (
                      <td key={colDeck.id} className="p-1">
                        <div className={cn(
                          "w-14 h-10 rounded flex items-center justify-center font-semibold",
                          winRateColor(rate)
                        )}>
                          {rate !== null ? `${rate}%` : '—'}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex gap-4 mt-4 flex-wrap">
          {[
            { label: '≥60% (Favored)', color: 'bg-green-900 text-green-300' },
            { label: '53–59%', color: 'bg-green-950 text-green-400' },
            { label: '47–52% (Even)', color: 'bg-zinc-800 text-zinc-300' },
            { label: '40–46%', color: 'bg-red-950 text-red-400' },
            { label: '≤39% (Unfavored)', color: 'bg-red-900 text-red-300' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              <div className={cn("w-4 h-4 rounded text-xs", l.color)} />
              <span className="text-xs text-zinc-500">{l.label}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}