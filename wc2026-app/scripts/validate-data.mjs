import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const read = async (name) => JSON.parse(await readFile(resolve(`public/data/${name}.json`), 'utf8'))[name]
const [games, groups, teams, stadiums] = await Promise.all(
  ['games', 'groups', 'teams', 'stadiums'].map(read),
)

const failures = []
const expect = (condition, message) => {
  if (!condition) failures.push(message)
}

expect(games.length === 104, `Expected 104 games, received ${games.length}`)
expect(groups.length === 12, `Expected 12 groups, received ${groups.length}`)
expect(teams.length === 48, `Expected 48 teams, received ${teams.length}`)
expect(stadiums.length === 16, `Expected 16 stadiums, received ${stadiums.length}`)
expect(new Set(games.map((game) => game.id)).size === games.length, 'Game IDs are not unique')
expect(new Set(teams.map((team) => team.id)).size === teams.length, 'Team IDs are not unique')

const teamIds = new Set(teams.map((team) => team.id))
const stadiumIds = new Set(stadiums.map((stadium) => stadium.id))

for (const game of games) {
  expect(stadiumIds.has(game.stadium_id), `Game ${game.id} references missing stadium ${game.stadium_id}`)
  if (game.home_team_id && game.home_team_id !== '0') expect(teamIds.has(game.home_team_id), `Game ${game.id} references missing home team ${game.home_team_id}`)
  if (game.away_team_id && game.away_team_id !== '0') expect(teamIds.has(game.away_team_id), `Game ${game.id} references missing away team ${game.away_team_id}`)
  expect(Number(game.home_score) >= 0 && Number(game.away_score) >= 0, `Game ${game.id} has an invalid score`)
}

for (const group of groups) {
  expect(group.teams.length === 4, `Group ${group.name} does not contain four teams`)
  for (const row of group.teams) {
    expect(teamIds.has(row.team_id), `Group ${group.name} references missing team ${row.team_id}`)
  }
}

if (failures.length) {
  console.error(failures.join('\n'))
  process.exitCode = 1
} else {
  console.log(`Validated ${games.length} games, ${teams.length} teams, ${groups.length} groups and ${stadiums.length} stadiums`)
}
