import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import './App.css'

type View = 'now' | 'matches' | 'groups' | 'bracket' | 'teams' | 'stats' | 'trivia'

type Game = {
  id: string
  home_team_id: string
  away_team_id: string
  home_team_name_en?: string
  away_team_name_en?: string
  home_team_label?: string
  away_team_label?: string
  home_score: string
  away_score: string
  home_penalty_score?: string
  away_penalty_score?: string
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

const champions = [
  { nation: 'Brazil', titles: 5, years: '1958 · 1962 · 1970 · 1994 · 2002', color: '#f6d34f' },
  { nation: 'Germany', titles: 4, years: '1954 · 1974 · 1990 · 2014', color: '#e7ece9' },
  { nation: 'Italy', titles: 4, years: '1934 · 1938 · 1982 · 2006', color: '#4f8cff' },
  { nation: 'Argentina', titles: 3, years: '1978 · 1986 · 2022', color: '#7dd4ff' },
  { nation: 'France', titles: 2, years: '1998 · 2018', color: '#5f72ff' },
  { nation: 'Uruguay', titles: 2, years: '1930 · 1950', color: '#8ad7f8' },
  { nation: 'England', titles: 1, years: '1966', color: '#f4f6ef' },
  { nation: 'Spain', titles: 1, years: '2010', color: '#ff665c' },
]

const winnerTimeline = [
  ['1930', 'Uruguay'], ['1934', 'Italy'], ['1938', 'Italy'], ['1950', 'Uruguay'],
  ['1954', 'Germany'], ['1958', 'Brazil'], ['1962', 'Brazil'], ['1966', 'England'],
  ['1970', 'Brazil'], ['1974', 'Germany'], ['1978', 'Argentina'], ['1982', 'Italy'],
  ['1986', 'Argentina'], ['1990', 'Germany'], ['1994', 'Brazil'], ['1998', 'France'],
  ['2002', 'Brazil'], ['2006', 'Italy'], ['2010', 'Spain'], ['2014', 'Germany'],
  ['2018', 'France'], ['2022', 'Argentina'],
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
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function isFinished(game: Game) {
  return String(game.finished).toLowerCase() === 'true' || game.time_elapsed === 'finished'
}

function isLive(game: Game) {
  const elapsed = String(game.time_elapsed || '').toLowerCase()
  return !isFinished(game) && elapsed !== 'notstarted' && elapsed !== 'finished' && elapsed !== 'null' && Boolean(elapsed)
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

function displayTeamName(game: Game, side: 'home' | 'away', teams: Team[]) {
  if (side === 'home') {
    return game.home_team_name_en || teamName(game.home_team_id, teams, game.home_team_label || 'To be decided')
  }
  return game.away_team_name_en || teamName(game.away_team_id, teams, game.away_team_label || 'To be decided')
}

function hasPenaltyScore(game: Game) {
  return game.home_penalty_score !== undefined
    && game.away_penalty_score !== undefined
    && (number(game.home_penalty_score) > 0 || number(game.away_penalty_score) > 0)
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
  const home = displayTeamName(game, 'home', data.teams)
  const away = displayTeamName(game, 'away', data.teams)
  const penalties = hasPenaltyScore(game)
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
            <>
              <div className="score__main"><strong>{number(game.home_score)}</strong><i>-</i><strong>{number(game.away_score)}</strong></div>
              {penalties && <small>pens {number(game.home_penalty_score)}-{number(game.away_penalty_score)}</small>}
            </>
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

function ChartFrame({ eyebrow, title, copy, children, className = '' }: { eyebrow: string; title: string; copy: string; children: ReactNode; className?: string }) {
  return (
    <article className={`viz-card ${className}`}>
      <header><span>{eyebrow}</span><h3>{title}</h3><p>{copy}</p></header>
      <div className="viz-card__body">{children}</div>
    </article>
  )
}

function GoalTimeline({ games, stadiums }: { games: Game[]; stadiums: Stadium[] }) {
  const rows = [...games.reduce((map, game) => {
    const label = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(gameDate(game, stadiums))
    map.set(label, (map.get(label) || 0) + number(game.home_score) + number(game.away_score))
    return map
  }, new Map<string, number>()).entries()]
  const max = Math.max(...rows.map(([, goals]) => goals), 1)
  const width = 760
  const height = 250
  const pad = 34
  const points = rows.map(([label, goals], index) => ({
    label,
    goals,
    x: pad + (index * (width - pad * 2)) / Math.max(rows.length - 1, 1),
    y: height - pad - (goals / max) * (height - pad * 2),
  }))
  const line = points.map((point) => `${point.x},${point.y}`).join(' ')
  const area = `${pad},${height - pad} ${line} ${width - pad},${height - pad}`
  return (
    <div className="svg-scroll">
      <svg className="timeline-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Goals scored on each tournament day">
        {[0, .25, .5, .75, 1].map((ratio) => <line key={ratio} x1={pad} x2={width - pad} y1={pad + ratio * (height - pad * 2)} y2={pad + ratio * (height - pad * 2)} />)}
        <polygon points={area} />
        <polyline points={line} />
        {points.map((point, index) => (
          <g key={point.label}>
            <circle cx={point.x} cy={point.y} r="5"><title>{point.label}: {point.goals} goals</title></circle>
            <text x={point.x} y={height - 10} textAnchor="middle">{index % 2 === 0 || points.length < 8 ? point.label : ''}</text>
            <text className="value-label" x={point.x} y={point.y - 12} textAnchor="middle">{point.goals}</text>
          </g>
        ))}
      </svg>
    </div>
  )
}

function ScorelineMatrix({ games }: { games: Game[] }) {
  const maxScore = Math.max(5, ...games.flatMap((game) => [number(game.home_score), number(game.away_score)]))
  const scores = Array.from({ length: maxScore + 1 }, (_, index) => index)
  const counts = new Map<string, number>()
  games.forEach((game) => {
    const key = `${number(game.home_score)}-${number(game.away_score)}`
    counts.set(key, (counts.get(key) || 0) + 1)
  })
  const peak = Math.max(...counts.values(), 1)
  return (
    <div className="matrix-wrap">
      <div className="matrix-axis">Away goals →</div>
      <div className="score-matrix" style={{ gridTemplateColumns: `32px repeat(${scores.length}, minmax(34px, 1fr))` }}>
        <span />
        {scores.map((score) => <b key={`x-${score}`}>{score}</b>)}
        {scores.map((home) => (
          <Fragment key={`row-${home}`}>
            <b>{home}</b>
            {scores.map((away) => {
              const count = counts.get(`${home}-${away}`) || 0
              const intensity = count ? .18 + (count / peak) * .82 : .035
              return <div key={`${home}-${away}`} style={{ '--heat': intensity } as CSSProperties}><span>{count || ''}</span><title>{home}–{away}: {count} match{count === 1 ? '' : 'es'}</title></div>
            })}
          </Fragment>
        ))}
      </div>
      <div className="matrix-y-label">Home goals</div>
    </div>
  )
}

function GroupBalancePanels({ groups, teams }: { groups: Group[]; teams: Team[] }) {
  const maxGoals = Math.max(...groups.flatMap((group) => group.teams.flatMap((row) => [number(row.gf), number(row.ga)])), 1)
  return (
    <div className="balance-comparison">
      <div className="balance-legend">
        <span><i className="against-key" /> Goals conceded</span>
        <span><i className="for-key" /> Goals scored</span>
        <small>All bars use the same scale</small>
      </div>
      <div className="balance-groups">
        {[...groups].sort((a, b) => a.name.localeCompare(b.name)).map((group) => (
          <article key={group.name} className="balance-group">
            <header><span>Group</span><strong>{group.name}</strong></header>
            {group.teams.map((row) => {
              const team = teams.find((item) => item.id === row.team_id)
              return (
                <div key={row.team_id} className="balance-row" title={`${team?.name_en}: ${row.gf} scored, ${row.ga} conceded, ${row.pts} points`}>
                  <b>{row.ga}</b>
                  <i className="against-bar"><span style={{ width: `${(number(row.ga) / maxGoals) * 100}%` }} /></i>
                  <div>
                    {team?.flag && <img src={team.flag} alt="" />}
                    <span><strong>{team?.fifa_code}</strong><small>{team?.name_en}</small></span>
                  </div>
                  <i className="for-bar"><span style={{ width: `${(number(row.gf) / maxGoals) * 100}%` }} /></i>
                  <b>{row.gf}</b>
                </div>
              )
            })}
          </article>
        ))}
      </div>
    </div>
  )
}

function StadiumLoad({ games, stadiums }: { games: Game[]; stadiums: Stadium[] }) {
  const rows = stadiums.map((stadium) => {
    const fixtures = games.filter((game) => game.stadium_id === stadium.id)
    return { stadium, fixtures: fixtures.length, completed: fixtures.filter(isFinished).length }
  }).sort((a, b) => b.fixtures - a.fixtures)
  const max = Math.max(...rows.map((row) => row.fixtures), 1)
  return (
    <div className="stadium-bars">
      {rows.map(({ stadium, fixtures, completed }) => (
        <div key={stadium.id}>
          <span><strong>{stadium.city_en.split(' (')[0]}</strong><small>{stadium.capacity.toLocaleString()} seats</small></span>
          <i><b style={{ width: `${(fixtures / max) * 100}%` }} /><em style={{ width: `${(completed / max) * 100}%` }} /></i>
          <strong>{fixtures}</strong>
        </div>
      ))}
      <footer><span><i className="scheduled-key" /> Scheduled</span><span><i className="played-key" /> Played</span></footer>
    </div>
  )
}

function QualificationBubbles({ rows, teams }: { rows: Array<GroupRow & { group: string }>; teams: Team[] }) {
  const width = 760
  const height = 270
  const positions = rows.map((row, index) => {
    const team = teams.find((item) => item.id === row.team_id)
    return {
      ...row,
      team,
      x: 42 + index * ((width - 84) / 11),
      y: height - 42 - number(row.pts) * 48,
      radius: 15 + Math.max(number(row.gd) + 4, 0) * 1.7,
    }
  })
  return (
    <div className="svg-scroll">
      <svg className="qualification-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Best third-place teams ranked by points and goal difference">
        {[0, 1, 2, 3, 4].map((point) => <g key={point}><line x1="34" x2={width - 20} y1={height - 42 - point * 48} y2={height - 42 - point * 48} /><text x="10" y={height - 38 - point * 48}>{point}</text></g>)}
        <line className="cutoff" x1={(positions[7].x + positions[8].x) / 2} x2={(positions[7].x + positions[8].x) / 2} y1="22" y2={height - 28} />
        <text className="cutoff-label" x={(positions[7].x + positions[8].x) / 2 + 6} y="18">TOP 8 ADVANCE</text>
        {positions.map((row, index) => (
          <g key={row.team_id} className={index < 8 ? 'qualified-bubble' : 'outside-bubble'}>
            <circle cx={row.x} cy={row.y} r={row.radius}><title>{row.team?.name_en}: {row.pts} points, {row.gd} goal difference</title></circle>
            <text x={row.x} y={row.y + 3} textAnchor="middle">{row.team?.fifa_code}</text>
            <text className="bubble-rank" x={row.x} y={height - 12} textAnchor="middle">{index + 1}</text>
          </g>
        ))}
      </svg>
    </div>
  )
}

function ChampionsOrbit() {
  const total = champions.reduce((sum, item) => sum + item.titles, 0)
  let cursor = 0
  return (
    <div className="champions-viz">
      <svg viewBox="0 0 440 440" role="img" aria-label="World Cup titles by nation">
        <circle className="orbit-track" cx="220" cy="220" r="150" />
        {champions.map((champion) => {
          const circumference = 2 * Math.PI * 150
          const length = (champion.titles / total) * circumference
          const offset = -(cursor / total) * circumference
          cursor += champion.titles
          return <circle key={champion.nation} className="orbit-segment" cx="220" cy="220" r="150" stroke={champion.color} strokeDasharray={`${length - 4} ${circumference - length + 4}`} strokeDashoffset={offset}><title>{champion.nation}: {champion.titles} titles</title></circle>
        })}
        <text className="orbit-number" x="220" y="212" textAnchor="middle">22</text>
        <text className="orbit-copy" x="220" y="238" textAnchor="middle">tournaments</text>
      </svg>
      <div className="champions-legend">{champions.map((champion) => <div key={champion.nation}><i style={{ background: champion.color }} /><span><strong>{champion.nation}</strong><small>{champion.years}</small></span><b>{champion.titles}</b></div>)}</div>
    </div>
  )
}

function WinnersRibbon() {
  return (
    <div className="winner-ribbon">
      {winnerTimeline.map(([year, nation], index) => {
        const champion = champions.find((item) => item.nation === nation)
        return <div key={year} style={{ '--winner-color': champion?.color || '#b9f227' } as CSSProperties}><span>{year}</span><i /><strong>{nation}</strong>{index < winnerTimeline.length - 1 && <b />}</div>
      })}
    </div>
  )
}

function RecordGlyphs() {
  const records = [
    { value: 16, unit: 'goals', label: 'Miroslav Klose', note: 'All-time scoring record', icon: '◎' },
    { value: 3, unit: 'titles', label: 'Pelé', note: 'Only player with three', icon: '✦' },
    { value: 11, unit: 'seconds', label: 'Hakan Şükür', note: 'Fastest World Cup goal', icon: '↯' },
    { value: 13, unit: 'goals', label: 'France 1958', note: 'Just Fontaine in one edition', icon: '◉' },
  ]
  return <div className="record-glyphs">{records.map((record) => <article key={record.label}><div><span>{record.icon}</span><strong>{record.value}</strong><small>{record.unit}</small></div><h4>{record.label}</h4><p>{record.note}</p></article>)}</div>
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
    if (matchFilter === 'upcoming' && (isFinished(game) || isLive(game))) return false
    const haystack = `${displayTeamName(game, 'home', data.teams)} ${displayTeamName(game, 'away', data.teams)} ${game.home_team_label || ''} ${game.away_team_label || ''} ${game.group}`.toLowerCase()
    return haystack.includes(query.toLowerCase())
  })

  const filteredTeams = data.teams
    .filter((team) => team.name_en.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => a.name_en.localeCompare(b.name_en))

  const selectedTeamData = selectedTeam ? data.teams.find((team) => team.id === selectedTeam) : undefined
  const selectedTeamGames = selectedTeam
    ? computed.sortedGames.filter((game) => game.home_team_id === selectedTeam || game.away_team_id === selectedTeam)
    : []

  const remainingMatches = Math.max(104 - computed.completed.length, 0)
  const currentMatchNumber = Math.min(computed.completed.length + computed.live.length + 1, 104)
  const currentStage = computed.completed.length >= 104
    ? 'Tournament complete'
    : computed.completed.length >= 102
      ? 'Final weekend'
      : computed.completed.length < 72
        ? 'Group stage'
        : 'Knockout stage'
  const thirdPlaceEyebrow = computed.completed.length >= 72 ? 'Group-stage record' : 'Qualification watch'
  const thirdPlaceTitle = computed.completed.length >= 72 ? 'The best third-place finishers' : 'The third-place line'
  const thirdPlaceCopy = computed.completed.length >= 72
    ? 'The table that decided the final eight Round of 32 places.'
    : 'Eight of the twelve third-placed teams advance.'

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
                <div className="stage-pill"><span /> {currentStage} · Match {currentMatchNumber} of 104</div>
                <p className="kicker">The tournament, explained visually</p>
                <h1>See what matters <em>right now.</em></h1>
                <p className="hero-lede">Recent results, the next kickoffs, bracket paths and the stories behind the world’s biggest football tournament.</p>
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
                <div className="hero-caption"><strong>{remainingMatches}</strong><span>matches remain</span></div>
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
                {computed.next.length ? (
                  <div className="match-stack">{computed.next.slice(0, 4).map((game) => <MatchCard key={game.id} game={game} data={data} />)}</div>
                ) : <p className="empty-state">No remaining scheduled matches.</p>}
              </div>
              <div>
                <SectionHeading eyebrow={thirdPlaceEyebrow} title={thirdPlaceTitle} copy={thirdPlaceCopy} />
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
            <SectionHeading eyebrow="Group stage" title="Twelve groups, one pressure line" copy="The first two in every group advanced, joined by the eight best third-placed teams." />
            <div className="groups-grid">{[...data.groups].sort((a, b) => a.name.localeCompare(b.name)).map((group) => <GroupTable key={group.name} group={group} data={data} />)}</div>
            <SectionHeading eyebrow="Across all groups" title="Best third-placed teams" copy="Ranked by points, goal difference and goals scored. The line after eighth place shows who reached the Round of 32." />
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
              {['r32', 'r16', 'qf', 'sf', 'third', 'final'].map((round) => {
                const games = data.games.filter((game) => game.type === round || (round === 'r32' && game.type === 'round32') || (round === 'r16' && game.type === 'round16'))
                return (
                  <div className="bracket-round" key={round}>
                    <h3>{roundNames[round]}</h3>
                    {games.map((game) => (
                      <article key={game.id}>
                        <span>{displayTeamName(game, 'home', data.teams)}</span><b>{isFinished(game) ? game.home_score : ''}</b>
                        <span>{displayTeamName(game, 'away', data.teams)}</span><b>{isFinished(game) ? game.away_score : ''}</b>
                        <small>
                          {formatKickoff(game, data.stadiums, true)}
                          {hasPenaltyScore(game) ? ` · pens ${number(game.home_penalty_score)}-${number(game.away_penalty_score)}` : ''}
                        </small>
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
            <div className="visualization-intro">
              <span>Live visual lab</span>
              <h2>Read the tournament as shapes, movement and pressure.</h2>
              <p>Every chart below recalculates when results or standings change. Hover or tap chart marks for exact values.</p>
            </div>
            <div className="viz-grid">
              <ChartFrame eyebrow="Tournament rhythm" title="Goals by match day" copy="The peaks and quiet days of the tournament so far." className="viz-card--wide">
                <GoalTimeline games={computed.completed} stadiums={data.stadiums} />
              </ChartFrame>
              <ChartFrame eyebrow="Score fingerprints" title="Every final score" copy="Darker cells represent scorelines that have happened more often.">
                <ScorelineMatrix games={computed.completed} />
              </ChartFrame>
              <ChartFrame eyebrow="Group-stage cutoff" title="The third-place bubble race" copy="Height is points. Bubble size reflects goal difference. The vertical line marks the top-eight cutoff that set the Round of 32.">
                <QualificationBubbles rows={computed.thirdPlace} teams={data.teams} />
              </ChartFrame>
              <ChartFrame eyebrow="Team balance" title="Scoring versus conceding" copy="Each group uses mirrored bars: goals conceded extend left in gold, while goals scored extend right in green. Every panel shares one scale, making comparisons direct." className="viz-card--wide">
                <GroupBalancePanels groups={data.groups} teams={data.teams} />
              </ChartFrame>
              <ChartFrame eyebrow="The host footprint" title="Matches by stadium" copy="Green shows each venue’s full tournament assignment; gold shows matches already played." className="viz-card--wide">
                <StadiumLoad games={data.games} stadiums={data.stadiums} />
              </ChartFrame>
              <ChartFrame eyebrow="Group comparison" title="Goals by group" copy="A compact view of which groups are producing the most goals.">
                <div className="bar-chart">
                  {'ABCDEFGHIJKL'.split('').map((groupName) => {
                    const games = computed.completed.filter((game) => game.group === groupName)
                    const goals = games.reduce((sum, game) => sum + number(game.home_score) + number(game.away_score), 0)
                    const max = Math.max(...'ABCDEFGHIJKL'.split('').map((letter) => computed.completed.filter((game) => game.group === letter).reduce((sum, game) => sum + number(game.home_score) + number(game.away_score), 0)), 1)
                    return <div key={groupName}><span>Group {groupName}</span><i><b style={{ width: `${(goals / max) * 100}%` }} /></i><strong>{goals}</strong></div>
                  })}
                </div>
              </ChartFrame>
            </div>
            <aside className="future-data-note"><span>Next data layer</span><strong>Goal Atlas · shot maps · xG · momentum · passing networks</strong><p>These require verified event coordinates and advanced match data. The interface is ready for them once the provider upgrade is connected.</p></aside>
          </section>
        )}

        {view === 'trivia' && (
          <section className="page-section">
            <SectionHeading eyebrow="Stories behind the numbers" title="World Cup trivia atlas" copy="Records, firsts, famous moments and details that make each match richer." />
            <div className="trivia-visuals">
              <ChartFrame eyebrow="The champions’ orbit" title="Who owns World Cup history?" copy="All 22 completed tournaments divided among only eight champions." className="viz-card--wide">
                <ChampionsOrbit />
              </ChartFrame>
              <ChartFrame eyebrow="1930—2022" title="The winners ribbon" copy="A continuous visual history from Uruguay’s first triumph to Argentina’s third.">
                <WinnersRibbon />
              </ChartFrame>
              <ChartFrame eyebrow="Record book" title="Four numbers that define the tournament" copy="Iconic benchmarks from scoring, speed and individual achievement.">
                <RecordGlyphs />
              </ChartFrame>
            </div>
            <div className="trivia-divider"><span>Explore the stories</span></div>
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
