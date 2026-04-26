'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line
} from 'recharts'
import { cn } from '@/lib/utils'

type Match = {
  id: string
  my_deck: string
  opp_deck: string
  result: string
  went_first: boolean
  timestamp: string
}

const RESULT_COLORS: Record<string, string> = {
  win: '#22c55e', loss: '#ef4444', tie: '#eab308'
}

const winRate = (matches: Match[]) => {
  if (!matches.length) return 0
  const score = matches.reduce((acc, m) =>
    acc + (m.result === 'win' ? 1 : m.result === 'tie' ? 0.5 : 0), 0)
  return Math.round((score / matches.length) * 100)
}

const TIME_FILTERS = [
  { id: 'all', label: 'All time' },
  { id: '30', label: 'Last 30 days' },
  { id: '14', label: 'Last 14 days' },
  { id: '7', label: 'Last 7 days' },
]

export default function StatsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [timeFilter, setTimeFilter] = useState('all')
  const [deckFilter, setDeckFilter] = useState('all')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      const { data } = await supabase
        .from('matches').select('*').eq('user_id', user.id)
        .order('timestamp', { ascending: false })
      setMatches(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = matches.filter(m => {
    if (timeFilter !== 'all') {
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - parseInt(timeFilter))
      if (new Date(m.timestamp) < cutoff) return false
    }
    if (deckFilter !== 'all' && m.my_deck !== deckFilter) return false
    return true
  })

  const myDecks = [...new Set(matches.map(m => m.my_deck))].sort()

  // Pie data
  const resultCounts = ['win', 'loss', 'tie'].map(r => ({
    name: r.charAt(0).toUpperCase() + r.slice(1),
    value: filtered.filter(m => m.result === r).length
  })).filter(r => r.value > 0)

  // Win rate by my deck
  const byMyDeck = myDecks.map(deck => {
    const games = filtered.filter(m => m.my_deck === deck)
    return { name: deck, winRate: winRate(games), games: games.length }
  }).filter(d => d.games > 0).sort((a, b) => b.games - a.games).slice(0, 8)

  // Win rate by opponent deck
  const oppDecks = [...new Set(filtered.map(m => m.opp_deck))]
  const byOppDeck = oppDecks.map(deck => {
    const games = filtered.filter(m => m.opp_deck === deck)
    return { name: deck, winRate: winRate(games), games: games.length }
  }).filter(d => d.games >= 2).sort((a, b) => b.games - a.games).slice(0, 8)

  // First vs second
  const firstGames = filtered.filter(m => m.went_first)
  const secondGames = filtered.filter(m => !m.went_first)
  const firstVsSecond = [
    { name: 'Went First', winRate: winRate(firstGames), games: firstGames.length },
    { name: 'Went Second', winRate: winRate(secondGames), games: secondGames.length },
  ]

  // Win rate over time (by week)
  const byWeek = (() => {
    const weeks: Record<string, Match[]> = {}
    filtered.forEach(m => {
      const d = new Date(m.timestamp)
      const monday = new Date(d)
      monday.setDate(d.getDate() - d.getDay() + 1)
      const key = monday.toISOString().slice(0, 10)
      if (!weeks[key]) weeks[key] = []
      weeks[key].push(m)
    })
    return Object.entries(weeks)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, ms]) => ({
        week: week.slice(5),
        winRate: winRate(ms),
        games: ms.length
      }))
  })()

  // Summary stats
  const totalGames = filtered.length
  const totalWinRate = winRate(filtered)
  const streak = (() => {
    let count = 0
    for (const m of filtered) {
      if (m.result === 'win') count++
      else break
    }
    return count
  })()

  if (loading) return (
    <main className="flex items-center justify-center min-h-[80vh] text-zinc-500">Loading...</main>
  )

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6 text-white">
      <h1 className="text-2xl font-bold">My Stats</h1>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {TIME_FILTERS.map(f => (
          <button key={f.id} onClick={() => setTimeFilter(f.id)}
            className={cn("px-3 py-1.5 rounded-lg text-sm border transition-colors",
              timeFilter === f.id ? "bg-white text-zinc-950 border-white" : "border-zinc-700 text-zinc-400 hover:bg-zinc-800"
            )}>
            {f.label}
          </button>
        ))}
        <select
          value={deckFilter}
          onChange={e => setDeckFilter(e.target.value)}
          className="ml-auto bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-2 py-1.5"
        >
          <option value="all">All my decks</option>
          {myDecks.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Games', value: totalGames },
          { label: 'Win Rate', value: `${totalWinRate}%` },
          { label: 'Current Win Streak', value: streak },
          { label: 'Decks Played', value: new Set(filtered.map(m => m.my_deck)).size },
        ].map(stat => (
          <div key={stat.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className="text-xs text-zinc-500 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {totalGames === 0 ? (
        <p className="text-zinc-500 text-center py-12">No matches in this time range.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Win/Loss/Tie pie */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">Results</h2>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={resultCounts} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75}
                  label={({ name, percent }) => percent !== undefined ? `${name} ${Math.round(percent * 100)}%` : ''}>
                  {resultCounts.map(entry => (
                    <Cell key={entry.name} fill={RESULT_COLORS[entry.name.toLowerCase()]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* First vs second */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">First vs Second</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={firstVsSecond}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                <XAxis dataKey="name" tick={{ fill: '#a1a1aa', fontSize: 12 }} />
                <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fill: '#a1a1aa', fontSize: 11 }} />
                <Tooltip formatter={(v) => [`${v}%`, 'Win Rate']}
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }} />
                <Bar dataKey="winRate" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Win rate by my deck */}
          {byMyDeck.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">Win Rate by My Deck</h2>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={byMyDeck} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fill: '#a1a1aa', fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#a1a1aa', fontSize: 11 }} width={100} />
                  <Tooltip formatter={(v) => [`${v}%`, 'Win Rate']}
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }} />
                  <Bar dataKey="winRate" fill="#a855f7" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Win rate vs opponent deck */}
          {byOppDeck.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">Win Rate vs Opponent</h2>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={byOppDeck} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fill: '#a1a1aa', fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#a1a1aa', fontSize: 11 }} width={100} />
                  <Tooltip formatter={(v) => [`${v}%`, 'Win Rate']}
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }} />
                  <Bar dataKey="winRate" fill="#f97316" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Win rate over time */}
          {byWeek.length > 1 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 md:col-span-2">
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">Win Rate Over Time (by week)</h2>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={byWeek}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                  <XAxis dataKey="week" tick={{ fill: '#a1a1aa', fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fill: '#a1a1aa', fontSize: 11 }} />
                  <Tooltip formatter={(v) => [`${v}%`, 'Win Rate']}
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }} />
                  <Line type="monotone" dataKey="winRate" stroke="#22c55e" strokeWidth={2} dot={{ fill: '#22c55e' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </main>
  )
}