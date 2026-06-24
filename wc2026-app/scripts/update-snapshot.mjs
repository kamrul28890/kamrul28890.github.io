import { access, mkdir, rename, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const source = process.env.WORLDCUP_DATA_SOURCE || 'https://worldcup26.ir/get'
const destination = resolve('public/data')
const resources = ['games', 'groups', 'teams', 'stadiums']
const maxAttempts = Math.max(1, Number(process.env.WORLDCUP_UPDATE_ATTEMPTS || 4))
const requestTimeout = Math.max(1_000, Number(process.env.WORLDCUP_UPDATE_TIMEOUT_MS || 20_000))
const retryDelays = [3_000, 8_000, 15_000]

const sleep = (milliseconds) => new Promise((resolvePromise) => {
  setTimeout(resolvePromise, milliseconds)
})

const warning = (message) => {
  if (process.env.GITHUB_ACTIONS === 'true') {
    console.warn(`::warning title=World Cup data refresh skipped::${message}`)
  } else {
    console.warn(`Warning: ${message}`)
  }
}

async function fetchResource(resource) {
  const response = await fetch(`${source}/${resource}`, {
    headers: {
      accept: 'application/json',
      'user-agent': 'kamrul28890.github.io-world-cup-updater/1.0',
    },
    signal: AbortSignal.timeout(requestTimeout),
  })

  if (!response.ok) {
    throw new Error(`${resource} request failed with HTTP ${response.status}`)
  }

  const payload = await response.json()
  const rows = payload[resource]

  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error(`${resource} response did not contain a non-empty array`)
  }

  return { resource, payload: normalizePayload(resource, payload), count: rows.length }
}

async function fetchBatch() {
  const batch = await Promise.all(resources.map(fetchResource))
  validateBatch(batch)
  return batch
}

function normalizeScore(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? String(parsed) : '0'
}

function numericId(value) {
  return Number(value?.id || 0)
}

function normalizePayload(resource, payload) {
  if (resource === 'games') {
    return {
      ...payload,
      games: payload.games
        .map((game) => ({
          ...game,
          home_score: normalizeScore(game.home_score),
          away_score: normalizeScore(game.away_score),
        }))
        .sort((a, b) => numericId(a) - numericId(b)),
    }
  }

  if (resource === 'groups') {
    return {
      ...payload,
      groups: [...payload.groups].sort((a, b) => a.name.localeCompare(b.name)),
    }
  }

  return {
    ...payload,
    [resource]: [...payload[resource]].sort((a, b) => numericId(a) - numericId(b)),
  }
}

function validateBatch(batch) {
  const byResource = Object.fromEntries(batch.map(({ resource, payload }) => [resource, payload[resource]]))
  const { games, groups, teams, stadiums } = byResource
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
    expect(Number.isFinite(Number(game.home_score)) && Number(game.home_score) >= 0, `Game ${game.id} has an invalid home score`)
    expect(Number.isFinite(Number(game.away_score)) && Number(game.away_score) >= 0, `Game ${game.id} has an invalid away score`)
  }

  for (const group of groups) {
    expect(group.teams.length === 4, `Group ${group.name} does not contain four teams`)
    for (const row of group.teams) {
      expect(teamIds.has(row.team_id), `Group ${group.name} references missing team ${row.team_id}`)
    }
  }

  if (failures.length) {
    throw new Error(`Provider data failed validation: ${failures.join('; ')}`)
  }
}

async function existingSnapshotIsComplete() {
  try {
    await Promise.all(resources.map((resource) => access(resolve(destination, `${resource}.json`))))
    return true
  } catch {
    return false
  }
}

async function writeBatch(batch) {
  await mkdir(destination, { recursive: true })
  const temporaryFiles = []

  try {
    for (const { resource, payload } of batch) {
      const temporaryPath = resolve(destination, `.${resource}.${process.pid}.tmp`)
      temporaryFiles.push(temporaryPath)
      await writeFile(temporaryPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
    }

    for (const { resource } of batch) {
      const temporaryPath = resolve(destination, `.${resource}.${process.pid}.tmp`)
      await rename(temporaryPath, resolve(destination, `${resource}.json`))
    }
  } finally {
    await Promise.all(temporaryFiles.map((file) => rm(file, { force: true })))
  }
}

let batch
let lastError

for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
  try {
    console.log(`Fetching World Cup data (attempt ${attempt}/${maxAttempts})...`)
    batch = await fetchBatch()
    break
  } catch (error) {
    lastError = error
    console.warn(`Attempt ${attempt} failed: ${error.message}`)

    if (attempt < maxAttempts) {
      const delay = retryDelays[Math.min(attempt - 1, retryDelays.length - 1)]
      console.log(`Retrying in ${delay / 1_000} seconds...`)
      await sleep(delay)
    }
  }
}

if (batch) {
  await writeBatch(batch)
  for (const { resource, count } of batch) {
    console.log(`Updated ${resource}: ${count} records`)
  }
} else if (await existingSnapshotIsComplete()) {
  warning(`The upstream provider was unavailable after ${maxAttempts} attempts. Keeping the existing validated snapshot. Last error: ${lastError?.message || 'unknown error'}`)
} else {
  throw new Error(`The upstream provider was unavailable and no complete fallback snapshot exists. Last error: ${lastError?.message || 'unknown error'}`)
}
