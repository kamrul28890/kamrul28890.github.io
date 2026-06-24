import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const source = 'https://worldcup26.ir/get'
const destination = resolve('public/data')
const resources = ['games', 'groups', 'teams', 'stadiums']

await mkdir(destination, { recursive: true })

for (const resource of resources) {
  const response = await fetch(`${source}/${resource}`, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(15_000),
  })

  if (!response.ok) {
    throw new Error(`${resource} request failed with HTTP ${response.status}`)
  }

  const payload = await response.json()
  const rows = payload[resource]

  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error(`${resource} response did not contain a non-empty array`)
  }

  await writeFile(
    resolve(destination, `${resource}.json`),
    `${JSON.stringify(payload, null, 2)}\n`,
    'utf8',
  )

  console.log(`Updated ${resource}: ${rows.length} records`)
}
