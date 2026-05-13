# ForesightTCG
### Live demo: https://foresighttcg.vercel.app/

## 🔤 What is this project about?
ForesightTCG is a Pokémon TCG match-tracking and analysis app. It helps players log matches quickly, track key in-game notes (including prize card tracker details), and review performance over time through filters, editable history, and visual statistics to support better deck and matchup decisions.

## 💻 Technologies Utilized
- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS 4
- **Backend/BaaS**: Supabase (Google auth, match storage, meta data tables)
- **UI & Data Viz**: Recharts, Base UI, custom reusable combobox/filter components
- **Deployment**: Vercel-ready Next.js setup

## ✨ Current Features / Functionality
- Google sign-in flow with protected app routes
- Match logging with deck selection, result, first/second turn flag, and prize tracker notes
- Smart deck inputs combining top meta decks with personalized recent deck history
- Match history view with filtering, inline edit/update, delete actions, and incremental "see more" pagination
- Personal stats dashboard with win/loss distribution, win rate by deck/opponent, first-vs-second comparison, and weekly trend chart
- Meta overview page with deck share visuals and matchup matrix (marked as work in progress)

## 🛠️ Upcoming Features / Improvements
- Complete the meta analytics pipeline (time-filter-aware data and deeper matchup confidence indicators)
- Add richer competitive insights (format segmentation, event tags, and matchup recommendation prompts)