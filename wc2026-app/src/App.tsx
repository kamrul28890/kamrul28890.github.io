import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

type View = 'now' | 'matches' | 'groups' | 'bracket' | 'teams' | 'stats' | 'trivia'

type Game = {
  id: string
  home_team_id: string
  away_team_id: string
  home_team_name_en: string
  away_team_name_en: string
  home_score: string
  away_score: string
  group: string
  matchday: string
  local_date: string
  stadium_id: string
  finished: string
  time_elapsed: string
  type: string
}

type GroupRow = {
  team_id: string
  mp: string
  w: string
  d: string
  l: string
  pts: string
  gf: string
  ga: string
  gd: string
}

type Group = { name: string; teams: GroupRow[] }
type Team = { id: string; name_en: string; flag: string; fifa_code: string; groups: string; iso2: string }
type Stadium = {
  id: string
  name_en: string
  fifa_name: string
  city_en: string
  country_en: string
  capacity: number
  region: string
}

type TournamentData = {
  games: Game[]
  groups: Group[]
  teams: Team[]
  stadiums: Stadium[]
}

const LIVE_API = 'https://worldcup26.ir/get'
const views: { id: View; label: string }[] = [
  { id: 'now', label: 'Now' },
  { id: 'matches', label: 'Matches' },
  { id: 'groups', label: 'Groups' },
  { id: 'bracket', label: 'Bracket' },
  { id: 'teams', label: 'Teams' },
  { id: 'stats', label: 'Stats' },
  { id: 'trivia', label: 'Trivia' },
]

const trivia = [
  { category: '2026 format', title: 'The biggest World Cup yet', text: 'The expanded tournament has 48 teams, 104 matches and a new Round of 32.', tag: 'Format' },
  { category: 'Host nations', title: 'Three countries, one tournament', text: 'Canada, Mexico and the United States form the first three-nation World Cup hosting team.', tag: 'Hosts' },
  { category: 'Stadium history', title: 'Azteca makes history again', text: 'Mexico City’s iconic stadium becomes the first venue used at three men’s World Cups: 1970, 1986 and 2026.', tag: 'Venue' },
  { category: 'Tournament record', title: 'Brazil’s unbroken run', text: 'Brazil is the only nation to have appeared at every men’s World Cup and remains the record five-time champion.', tag: 'History' },
  { category: 'Goals', title: 'The all-time benchmark', text: 'Miroslav Klose scored 16 World Cup goals across four tournaments, the long-standing men’s record.', tag: 'Record' },
  { category: 'Young legend', title: 'Pelé’s unmatched treble', text: 'Pelé remains the only player to win three World Cups and was only 17 when he won his first in 1958.', tag: 'Player' },
  { category: 'Fast start', title: 'Eleven seconds', text: 'Hakan Şükür scored the fastest goal in men’s World Cup history against South Korea in 2002.', tag: 'Record' },
  { category: 'Classic upset', title: 'The Miracle on Grass', text: 'The United States defeated heavily favored England 1–0 at the 1950 World Cup.', tag: 'Upset' },
  { category: 'Attendance', title: 'A record that survived expansion', text: 'The 1994 United States tournament drew about 3.59 million spectators, still the overall attendance benchmark.', tag: 'Fans' },
  { category: 'New pathway', title: 'Third place matters', text: 'The eight best third-placed teams join the top two from every group in the Round of 32.', tag: 'Format' },
  { category: 'Trophy', title: 'Six kilograms of gold', text: 'The current FIFA World Cup Trophy weighs 6.175 kilograms and is made from 18-carat gold.', tag: 'Trophy' },
  { category: 'The final', title: 'New York New Jersey', text: 'The 2026 champion will be crowned on July 19 at New York New Jersey Stadium.', tag: 'Final' },
]

const roundNames: Record<string, string> = {
  round32: 'Round of 32',
  r32: 'Round of 32',
  round16: 'Round of 16',
  r16: 'Round of 16',
  qf: 'Quarterfinals',
  sf: 'Semifinals',
  third: 'Third place',
  final: 'Final',
}

const zoneByCity: Record<string, string> = {
  'Mexico City': '-06:00',
  Guadalajara: '-06:00',
  Monterrey: '-06:00',
  Toronto: '-04:00',
  'Vancouver': '-07:00',
  Seattle: '-07:00',
  'San Francisco Bay Area': '-07:00',
  'Los Angeles': '-07:00',
  Dallas: '-05:00',
  Houston: '-05:00',
  'Kansas City': '-05:00',
  Atlanta: '-04:00',
  Boston: '-04:00',
  Miami: '-04:00',
  Philadelphia: '-04:00',
  'New York/New Jersey': '-04:00',
}

function number(value: string | number | undefined) {
  return Number(value || 0)
}

function isFinished(game: Game) {
  return game.finished === 'TRUE' || game.time_elapsed === 'finished'
}

function isLive(game: Game) {
  return !isFinished(game) && game.time_elapsed !== 'notstarted' && Boolean(game.time_elapsed)
}

function gameDate(game: Game, stadiums: Stadium[]) {
  const [date, time] = game.local_date.split(' ')
  const [month, day, year] = date.split('/')
  const stadium = stadiums.find((item) => item.id === game.stadium_id)
  const city = stadium?.city_en?.split(' (')[0] || ''
  const offset = zoneByCity[city] || '-04:00'
  return new Date(`${year}-${month}-${day}T${time}:00${offset}`)
}

function formatKickoff(game: Game, stadiums: Stadium[], includeDate = false) {
  const date = gameDate(game, stadiums)
  return new Intl.DateTimeFormat(undefined, {
    ...(includeDate ? { month: 'short', day: 'numeric' } : {}),
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(date)
}

function matchState(game: Game, stadiums: Stadium[]) {
  if (isFinished(game)) return 'FT'
  if (isLive(game)) return `${game.time_elapsed}′`
  return formatKickoff(game, stadiums)
}

function stageLabel(game: Game) {
  return game.type === 'group' ? `Group ${game.group}` : roundNames[game.type] || game.type
}

function teamName(teamId: string, teams: Team[], fallback = 'To be decided') {
  return teams.find((team) => team.id === teamId)?.name_en || fallback
}

function teamFlag(teamId: string, teams: Team[]) {
  return teams.find((team) => team.id === teamId)?.flag
}

async function fetchJson<T>(url: string, timeout = 7000): Promise<T> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeout)
  try {
    const response = await fetch(url, { signal: controller.signal, cache: 'no-store' })
    if (!response.ok) throw new Error(`Request failed: ${response.status}`)
    return response.json()
  } finally {
    window.clearTimeout(timer)
  }
}

async function loadFallback(): Promise<TournamentData> {
  const [games, groups, teams, stadiums] = await Promise.all([
    fetchJson<{ games: Game[] }>('./data/games.json'),
    fetchJson<{ groups: Group[] }>('./data/groups.json'),
    fetchJson<{ teams: Team[] }>('./data/teams.json'),
    fetchJson<{ stadiums: Stadium[] }>('./data/stadiums.json'),
  ])
  return { games: games.games, groups: groups.groups, teams: teams.teams, stadiums: stadiums.stadiums }
}

async function loadLive(): Promise<TournamentData> {
  const [games, groups, teams, stadiums] = await Promise.all([
    fetchJson<{ games: Game[] }>(`${LIVE_API}/games`),
    fetchJson<{ groups: Group[] }>(`${LIVE_API}/groups`),
    fetchJson<{ teams: Team[] }>(`${LIVE_API}/teams`),
    fetchJson<{ stadiums: Stadium[] }>(`${LIVE_API}/stadiums`),
  ])
  return { games: games.games, groups: groups.groups, teams: teams.teams, stadiums: stadiums.stadiums }
}

function MatchCard({ game, data, featured = false }: { game: Game; data: TournamentData; featured?: boolean }) {
  const stadium = data.stadiums.find((item) => item.id === game.stadium_id)
  const live = isLive(game)
  const finished = isFinished(game)
  const home = game.home_team_name_en || teamName(game.home_team_id, data.teams)
  const away = game.away_team_name_en || teamName(game.away_team_id, data.teams)
  return (
    <article className={`match-card ${featured ? 'match-card--featured' : ''} ${live ? 'is-live' : ''}`}>
      <div className="match-card__meta">
        <span>{stageLabel(game)}</span>
        <strong className={live ? 'live-label' : ''}>{matchState(game, data.stadiums)}</strong>
      </div>
      <div className="scoreline">
        <div className="side">
          {teamFlag(game.home_team_id, data.teams) && <img src={teamFlag(game.home_team_id, data.teams)} alt="" />}
          <span>{home}</span>
        </div>
        <div className="score">
          {finished || live ? (
            <><strong>{number(game.home_score)}</strong><i>–</i><strong>{number(game.away_score)}</strong></>
          ) : <span>vs</span>}
        </div>
        <div className="side side--away">
          {teamFlag(game.away_team_id, data.teams) && <img src={teamFlag(game.away_team_id, data.teams)} alt="" />}
          <span>{away}</span>
        </div>
      </div>
      <div className="match-card__footer">
        <span>{stadium?.fifa_name || stadium?.name_en || 'Venue to be confirmed'}</span>
        <span>{stadium?.city_en?.split(' (')[0]}</span>
      </div>
    </article>
  )
}

function GroupTable({ group, data, compact = false }: { group: Group; data: TournamentData; compact?: boolean }) {
  return (
    <article className={`group-card ${compact ? 'group-card--compact' : ''}`}>
      <header>
        <span>Group</span>
        <strong>{group.name}</strong>
      </header>
      <div className="table-scroll">
        <table>
          <thead><tr><th>Team</th><th>MP</th><th>GD</th><th>Pts</th></tr></thead>
          <tbody>
            {group.teams.map((row, index) => {
              const team = data.teams.find((item) => item.id === row.team_id)
              return (
                <tr key={row.team_id}>
                  <td>
                    <span className={`rank rank--${index + 1}`}>{index + 1}</span>
                    {team?.flag && <img src={team.flag} alt="" />}
                    <strong>{team?.name_en || row.team_id}</strong>
                  </td>
                  <td>{row.mp}</td>
                  <td>{number(row.gd) > 0 ? '+' : ''}{row.gd}</td>
                  <td><strong>{row.pts}</strong></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </article>
  )
}

function SectionHeading({ eyebrow, title, copy }: { eyebrow: string; title: string; copy?: string }) {
  return (
    <div className="section-heading">
      <span>{eyebrow}</span>
      <div>
        <h2>{title}</h2>
        {copy && <p>{copy}</p>}
      </div>
    </div>
  )
}

function App() {
  const [view, setView] = useState<View>('now')
  const [data, setData] = useState<TournamentData | null>(null)
  const [source, setSource] = useState<'live' | 'snapshot'>('snapshot')
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  const [query, setQuery] = useState('')
  const [matchFilter, setMatchFilter] = useState<'all' | 'completed' | 'upcoming'>('all')
  const [selectedTeam, setSelectedTeam] = useState<string>('')
  const hasData = useRef(false)

  useEffect(() => {
    let active = true
    const refresh = async () => {
      try {
        const live = await loadLive()
        if (active) {
          setData(live)
          hasData.current = true
          setSource('live')
          setUpdatedAt(new Date())
        }
      } catch {
        if (!hasData.current) {
          const fallback = await loadFallback()
          if (active) {
            setData(fallback)
            hasData.current = true
            setSource('snapshot')
            setUpdatedAt(new Date())
          }
        }
      }
    }
    refresh()
    const interval = window.setInterval(refresh, 60_000)
    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [])

  const computed = useMemo(() => {
    if (!data) return null
    const sortedGames = [...data.games].sort((a, b) => gameDate(a, data.stadiums).getTime() - gameDate(b, data.stadiums).getTime())
    const completed = sortedGames.filter(isFinished)
    const live = sortedGames.filter(isLive)
    const upcoming = sortedGames.filter((game) => !isFinished(game) && !isLive(game))
    const recent = [...completed].reverse().slice(0, 4)
    const next = upcoming.slice(0, 6)
    const goals = completed.reduce((sum, game) => sum + number(game.home_score) + number(game.away_score), 0)
    const thirdPlace = data.groups
      .map((group) => ({ ...group.teams[2], group: group.name }))
      .sort((a, b) => number(b.pts) - number(a.pts) || number(b.gd) - number(a.gd) || number(b.gf) - number(a.gf))
    return { sortedGames, completed, live, upcoming, recent, next, goals, thirdPlace }
  }, [data])

  if (!data || !computed) {
    return <main className="loading-screen"><div className="ball-loader">26</div><p>Building the tournament picture…</p></main>
  }

  const visibleMatches = computed.sortedGames.filter((game) => {
    if (matchFilter === 'completed' && !isFinished(game)) return false
    if (matchFilter === 'upcoming' && isFinished(game)) return false
    const haystack = `${game.home_team_name_en} ${game.away_team_name_en} ${game.group}`.toLowerCase()
    return haystack.includes(query.toLowerCase())
  })

  const filteredTeams = data.teams
    .filter((team) => team.name_en.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => a.name_en.localeCompare(b.name_en))

  const selectedTeamData = selectedTeam ? data.teams.find((team) => team.id === selectedTeam) : undefined
  const selectedTeamGames = selectedTeam
    ? computed.sortedGames.filter((game) => game.home_team_id === selectedTeam || game.away_team_id === selectedTeam)
    : []

  const currentStage = computed.completed.length < 72 ? 'Group stage' : computed.completed.length < 104 ? 'Knockout stage' : 'Tournament complete'

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="../index.html" aria-label="Back to Kamrul's main website">
          <span>KK</span>
          <div><strong>World Cup Atlas</strong><small>Kamrul’s 2026 guide</small></div>
        </a>
        <nav aria-label="Tournament sections">
          {views.map((item) => (
            <button key={item.id} className={view === item.id ? 'active' : ''} onClick={() => setView(item.id)}>{item.label}</button>
          ))}
        </nav>
        <div className="header-status">
          <span className={source === 'live' ? 'status-dot' : 'status-dot status-dot--stale'} />
          <div><strong>{source === 'live' ? 'Auto-updating' : 'Snapshot mode'}</strong><small>{updatedAt ? `Checked ${updatedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : 'Connecting'}</small></div>
        </div>
      </header>

      <main>
        {view === 'now' && (
          <>
            <section className="hero-panel">
              <div className="hero-copy">
                <div className="stage-pill"><span /> {currentStage} · Match {computed.completed.length + 1} of 104</div>
                <p className="kicker">The tournament, explained visually</p>
                <h1>See what matters <em>right now.</em></h1>
                <p className="hero-lede">Recent results, the next kickoffs, qualification pressure and the stories behind the world’s biggest football tournament.</p>
                <div className="hero-actions">
                  <button onClick={() => setView('matches')}>Explore all matches</button>
                  <button className="secondary" onClick={() => setView('groups')}>Check qualification</button>
                </div>
              </div>
              <div className="hero-visual" aria-label="Tournament completion">
                <div className="orbit orbit--one" />
                <div className="orbit orbit--two" />
                <div className="hero-ball">
                  <span>{Math.round((computed.completed.length / 104) * 100)}%</span>
                  <small>complete</small>
                </div>
                <div className="hero-caption"><strong>{104 - computed.completed.length}</strong><span>matches remain</span></div>
              </div>
            </section>

            <section className="pulse-grid" aria-label="Tournament pulse">
              {[
                ['Matches played', computed.completed.length, 'of 104'],
                ['Goals scored', computed.goals, `${(computed.goals / Math.max(computed.completed.length, 1)).toFixed(2)} per match`],
                ['Teams', 48, 'across 12 groups'],
                ['Host cities', 16, 'in three countries'],
              ].map(([label, value, note]) => (
                <article key={String(label)}><span>{label}</span><strong>{value}</strong><small>{note}</small></article>
              ))}
            </section>

            {computed.live.length > 0 && (
              <section className="content-section">
                <SectionHeading eyebrow="Live now" title="The ball is moving" copy="Scores refresh automatically every minute." />
                <div className="match-grid">{computed.live.map((game) => <MatchCard key={game.id} game={game} data={data} featured />)}</div>
              </section>
            )}

            <section className="content-section">
              <SectionHeading eyebrow="Latest" title="The most recent results" copy="Completed matches stay at the top so the tournament always opens with what just happened." />
              <div className="match-grid">{computed.recent.map((game) => <MatchCard key={game.id} game={game} data={data} featured />)}</div>
            </section>

            <section className="content-section split-section">
              <div>
                <SectionHeading eyebrow="Up next" title="The next kickoffs" copy="Times are automatically shown in your device timezone." />
                <div className="match-stack">{computed.next.slice(0, 4).map((game) => <MatchCard key={game.id} game={game} data={data} />)}</div>
              </div>
              <div>
                <SectionHeading eyebrow="Qualification watch" title="The third-place line" copy="Eight of the twelve third-placed teams advance." />
                <article className="third-place-card">
                  {computed.thirdPlace.map((row, index) => {
                    const team = data.teams.find((item) => item.id === row.team_id)
                    return (
                      <Fragment key={row.team_id}>
                        <div className="third-place-row">
                          <span>{index + 1}</span>
                          {team?.flag && <img src={team.flag} alt="" />}
                          <strong>{team?.name_en}</strong>
                          <small>Group {row.group}</small>
                          <b>{row.pts} pts</b>
                          <em>{number(row.gd) > 0 ? '+' : ''}{row.gd}</em>
                        </div>
                        {index === 7 && <div className="qualification-divider"><span>Qualification line</span></div>}
                      </Fragment>
                    )
                  })}
                </article>
              </div>
            </section>

            <section className="story-banner">
              <div><span>Today’s piece of history</span><h2>{trivia[2].title}</h2><p>{trivia[2].text}</p></div>
              <button onClick={() => setView('trivia')}>Discover more stories</button>
            </section>
          </>
        )}

        {view === 'matches' && (
          <section className="page-section">
            <SectionHeading eyebrow="104 matches" title="Every fixture and result" copy="Search by team or group. All kickoff times are converted to your local timezone." />
            <div className="toolbar">
              <label><span className="sr-only">Search matches</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search a team or group…" /></label>
              <div className="segmented">
                {(['all', 'completed', 'upcoming'] as const).map((filter) => <button key={filter} className={matchFilter === filter ? 'active' : ''} onClick={() => setMatchFilter(filter)}>{filter}</button>)}
              </div>
            </div>
            <div className="match-grid match-grid--archive">{visibleMatches.map((game) => <MatchCard key={game.id} game={game} data={data} />)}</div>
          </section>
        )}

        {view === 'groups' && (
          <section className="page-section">
            <SectionHeading eyebrow="Qualification" title="Twelve groups, one pressure line" copy="The first two in every group advance, joined by the eight best third-placed teams." />
            <div className="groups-grid">{[...data.groups].sort((a, b) => a.name.localeCompare(b.name)).map((group) => <GroupTable key={group.name} group={group} data={data} />)}</div>
            <SectionHeading eyebrow="Across all groups" title="Best third-placed teams" copy="Ranked by points, goal difference and goals scored. The line after eighth place separates the current qualifiers." />
            <article className="third-place-card third-place-card--wide">
              {computed.thirdPlace.map((row, index) => {
                const team = data.teams.find((item) => item.id === row.team_id)
                return (
                  <Fragment key={row.team_id}>
                    <div className="third-place-row"><span>{index + 1}</span>{team?.flag && <img src={team.flag} alt="" />}<strong>{team?.name_en}</strong><small>Group {row.group} · {row.mp} played</small><b>{row.pts} pts</b><em>{number(row.gd) > 0 ? '+' : ''}{row.gd} GD</em></div>
                    {index === 7 && <div className="qualification-divider"><span>Qualification line</span></div>}
                  </Fragment>
                )
              })}
            </article>
          </section>
        )}

        {view === 'bracket' && (
          <section className="page-section">
            <SectionHeading eyebrow="Road to July 19" title="The knockout path" copy="Confirmed teams populate automatically as the tournament advances." />
            <div className="bracket">
              {['r32', 'r16', 'qf', 'sf', 'final'].map((round) => {
                const games = data.games.filter((game) => game.type === round || (round === 'r32' && game.type === 'round32') || (round === 'r16' && game.type === 'round16'))
                return (
                  <div className="bracket-round" key={round}>
                    <h3>{roundNames[round]}</h3>
                    {games.map((game) => (
                      <article key={game.id}>
                        <span>{teamName(game.home_team_id, data.teams)}</span><b>{isFinished(game) ? game.home_score : ''}</b>
                        <span>{teamName(game.away_team_id, data.teams)}</span><b>{isFinished(game) ? game.away_score : ''}</b>
                        <small>{formatKickoff(game, data.stadiums, true)}</small>
                      </article>
                    ))}
                    {!games.length && <p>Matchups will appear when qualification is resolved.</p>}
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {view === 'teams' && (
          <section className="page-section">
            <SectionHeading eyebrow="48 nations" title="Meet every team" copy="Select a nation to see its group position and tournament route." />
            <div className="toolbar"><label><span className="sr-only">Search teams</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search a nation…" /></label></div>
            {selectedTeamData && (
              <article className="team-focus">
                <button className="close-button" onClick={() => setSelectedTeam('')} aria-label="Close team detail">×</button>
                <div className="team-focus__identity"><img src={selectedTeamData.flag} alt="" /><div><span>Group {selectedTeamData.groups}</span><h2>{selectedTeamData.name_en}</h2><p>{selectedTeamData.fifa_code}</p></div></div>
                <div className="team-route">{selectedTeamGames.map((game) => <MatchCard key={game.id} game={game} data={data} />)}</div>
              </article>
            )}
            <div className="teams-grid">
              {filteredTeams.map((team) => {
                const group = data.groups.find((item) => item.name === team.groups)
                const rowIndex = group?.teams.findIndex((row) => row.team_id === team.id) ?? -1
                const row = group?.teams[rowIndex]
                return (
                  <button className="team-card" key={team.id} onClick={() => setSelectedTeam(team.id)}>
                    <img src={team.flag} alt="" />
                    <span>Group {team.groups}</span>
                    <strong>{team.name_en}</strong>
                    <small>{row ? `${row.pts} points · ${rowIndex + 1}${['st', 'nd', 'rd'][rowIndex] || 'th'} in group` : 'Tournament profile'}</small>
                  </button>
                )
              })}
            </div>
          </section>
        )}

        {view === 'stats' && (
          <section className="page-section">
            <SectionHeading eyebrow="Tournament pulse" title="The World Cup by the numbers" copy="A live statistical overview generated from completed matches." />
            <div className="stat-hero-grid">
              <article><span>Total goals</span><strong>{computed.goals}</strong><small>{(computed.goals / Math.max(computed.completed.length, 1)).toFixed(2)} per match</small></article>
              <article><span>Biggest score</span><strong>{Math.max(...computed.completed.map((game) => number(game.home_score) + number(game.away_score)), 0)}</strong><small>goals in one match</small></article>
              <article><span>Decisive matches</span><strong>{computed.completed.filter((game) => game.home_score !== game.away_score).length}</strong><small>not ending level</small></article>
              <article><span>Draws</span><strong>{computed.completed.filter((game) => game.home_score === game.away_score).length}</strong><small>after regulation</small></article>
            </div>
            <SectionHeading eyebrow="Group performance" title="Goals by group" />
            <div className="bar-chart">
              {'ABCDEFGHIJKL'.split('').map((groupName) => {
                const games = computed.completed.filter((game) => game.group === groupName)
                const goals = games.reduce((sum, game) => sum + number(game.home_score) + number(game.away_score), 0)
                const max = Math.max(...'ABCDEFGHIJKL'.split('').map((letter) => computed.completed.filter((game) => game.group === letter).reduce((sum, game) => sum + number(game.home_score) + number(game.away_score), 0)), 1)
                return <div key={groupName}><span>Group {groupName}</span><i><b style={{ width: `${(goals / max) * 100}%` }} /></i><strong>{goals}</strong></div>
              })}
            </div>
          </section>
        )}

        {view === 'trivia' && (
          <section className="page-section">
            <SectionHeading eyebrow="Stories behind the numbers" title="World Cup trivia atlas" copy="Records, firsts, famous moments and details that make each match richer." />
            <div className="trivia-grid">
              {trivia.map((item, index) => (
                <article key={item.title} className={index % 5 === 0 ? 'trivia-card trivia-card--feature' : 'trivia-card'}>
                  <div><span>{item.tag}</span><small>0{index + 1}</small></div>
                  <p>{item.category}</p>
                  <h3>{item.title}</h3>
                  <blockquote>{item.text}</blockquote>
                  <a href="https://www.fifa.com/en/tournaments/mens/worldcup" target="_blank" rel="noreferrer">Explore FIFA history ↗</a>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer>
        <div><strong>World Cup Atlas 2026</strong><p>A personal, data-centered tournament guide by Kamruzzaman Kamrul.</p></div>
        <div><span>Data status</span><p>Community live feed with a bundled fallback snapshot. Official-provider integration is the next infrastructure phase.</p></div>
        <a href="../index.html">Back to Kamrul’s main site</a>
      </footer>
    </div>
  )
}

export default App
