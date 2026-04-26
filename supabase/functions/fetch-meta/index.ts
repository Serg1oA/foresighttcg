import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const LIMITLESS_API = 'https://play.limitlesstcg.com/api'

Deno.serve(async () => {
  try {
    // Step 1: Get recent PTCG Standard tournaments (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const tournamentsRes = await fetch(
      `${LIMITLESS_API}/tournaments?game=PTCG&format=STANDARD&limit=20`
    )
    const tournaments: any[] = await tournamentsRes.json()

    // Filter to recent ones only
    const recent = tournaments.filter(t => new Date(t.date) >= thirtyDaysAgo)

    // Step 2: For each tournament, fetch standings and pairings
    const deckCounts: Record<string, number> = {}
    const matchups: Record<string, Record<string, { wins: number; losses: number; ties: number }>> = {}

    for (const tournament of recent) {
      const [standingsRes, pairingsRes] = await Promise.all([
        fetch(`${LIMITLESS_API}/tournaments/${tournament.id}/standings`),
        fetch(`${LIMITLESS_API}/tournaments/${tournament.id}/pairings`)
      ])

      const standings: any[] = await standingsRes.json()
      const pairings: any[] = await pairingsRes.json()

      // Build player -> deck map
      const playerDeck: Record<string, string> = {}
      for (const player of standings) {
        if (player.deck?.id) {
          playerDeck[player.player] = player.deck.id
          deckCounts[player.deck.id] = (deckCounts[player.deck.id] ?? 0) + 1

          // Store name and icons too
          if (!deckMeta[player.deck.id]) {
            deckMeta[player.deck.id] = {
              name: player.deck.name,
              icons: player.deck.icons ?? []
            }
          }
        }
      }

      // Build matchup matrix from pairings
      for (const pairing of pairings) {
        const deckA = playerDeck[pairing.player1]
        const deckB = playerDeck[pairing.player2]
        if (!deckA || !deckB || deckA === deckB) continue

        if (!matchups[deckA]) matchups[deckA] = {}
        if (!matchups[deckA][deckB]) matchups[deckA][deckB] = { wins: 0, losses: 0, ties: 0 }
        if (!matchups[deckB]) matchups[deckB] = {}
        if (!matchups[deckB][deckA]) matchups[deckB][deckA] = { wins: 0, losses: 0, ties: 0 }

        if (pairing.winner === pairing.player1) {
          matchups[deckA][deckB].wins++
          matchups[deckB][deckA].losses++
        } else if (pairing.winner === pairing.player2) {
          matchups[deckB][deckA].wins++
          matchups[deckA][deckB].losses++
        } else if (pairing.winner === 0) {
          matchups[deckA][deckB].ties++
          matchups[deckB][deckA].ties++
        }
      }
    }

    // Step 3: Upsert top meta decks
    const topDecks = Object.entries(deckCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([id, count]) => ({
        id,
        name: deckMeta[id]?.name ?? id,
        icons: deckMeta[id]?.icons ?? [],
        usage_count: count,
        fetched_at: new Date().toISOString()
      }))

    await supabase.from('meta_decks').upsert(topDecks)

    // Step 4: Upsert matchup data
    const matchupRows = []
    for (const [deckA, opponents] of Object.entries(matchups)) {
      for (const [deckB, record] of Object.entries(opponents)) {
        matchupRows.push({
          deck_a: deckA,
          deck_b: deckB,
          wins: record.wins,
          losses: record.losses,
          ties: record.ties,
          fetched_at: new Date().toISOString()
        })
      }
    }

    await supabase.from('meta_matchups').upsert(matchupRows)

    return new Response(JSON.stringify({
      ok: true,
      tournaments: recent.length,
      decks: topDecks.length,
      matchups: matchupRows.length
    }), { headers: { 'Content-Type': 'application/json' } })

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})

// Helper to store deck metadata while iterating
const deckMeta: Record<string, { name: string; icons: string[] }> = {}