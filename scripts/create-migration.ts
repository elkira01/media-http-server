import { readdirSync, writeFileSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const MIGRATIONS_DIR = join(import.meta.dir, '..', 'src', 'migrations')
const INDEX_PATH = join(MIGRATIONS_DIR, 'index.ts')

const name = process.argv[2]
if (!name) {
  console.error('Usage: bun run scripts/create-migration.ts <name>')
  console.error('Example: bun run scripts/create-migration.ts add_user_email')
  process.exit(1)
}

// Determine next version number from existing migration files
const files = readdirSync(MIGRATIONS_DIR)
  .filter(f => /^\d{3}_/.test(f))
  .map(f => parseInt(f.slice(0, 3), 10))

const nextVersion = files.length > 0 ? Math.max(...files) + 1 : 1
const padded = String(nextVersion).padStart(3, '0')
const filename = `${padded}_${name}.ts`
const filepath = join(MIGRATIONS_DIR, filename)

// Create migration file from template
const template = `import type { Database } from 'bun:sqlite'

export const version = ${nextVersion}
export const description = '${name.replace(/_/g, ' ')}'

export function up(db: Database) {
  // TODO: write migration
}

export function down(db: Database) {
  // TODO: write migration
}
`

writeFileSync(filepath, template)
console.log(`Created ${filepath}`)

// Update index.ts: add import and push
const indexContent = readFileSync(INDEX_PATH, 'utf-8')
const importAlias = `m${padded}`
const importLine = `import * as ${importAlias} from './${padded}_${name}'`
const pushLine = `migrations.push(${importAlias} as unknown as Migration)`

const eol = indexContent.includes('\r\n') ? '\r\n' : '\n'
const updated = indexContent
  .replace(
    /migrations\.push\([^)]+\)\r?\n/,
    match => match + pushLine + eol
  )
  .replace(
    /import \* as m\d+ from '[^']+'\r?\n/,
    match => match + importLine + eol
  )

writeFileSync(INDEX_PATH, updated)
console.log(`Updated ${INDEX_PATH}`)
