import type { Database } from 'bun:sqlite'

interface Migration {
  version: number
  description: string
  up: (db: Database) => void
  down: (db: Database) => void
}

const migrations: Migration[] = []

// Import all migration files in order
import * as m001 from './001_initial.ts'
import * as m003 from './003_media_url.ts'
import * as m002 from './002_auth.ts'
import {difference} from "../src/lib";

migrations.push(m001 as unknown as Migration)
migrations.push(m003 as unknown as Migration)
migrations.push(m002 as unknown as Migration)

migrations.sort((a, b) => a.version - b.version)

export function runMigrations(db: Database, from?: number, to?: number) {
  let start = from
  let end = Math.min(to || migrations.length,  migrations.length)

  if (start && !migrations.map(m => m.version).includes(start)) {
    throw new Error(`Invalid migration version: --form = ${start}`)
  }

  if (to && !migrations.map(m => m.version).includes(to))
    console.log(`[migration] warning: Invalid migration version: --to = ${to}...`)

  db.run(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  const current = db.query('SELECT MAX(version) as v FROM schema_migrations').get() as { v: number | null }
  start = (current?.v || 0) + 1


  if (from && from > start) {
    console.log(`[migration] skipping migrations from current (v${start - 1}) till v${from - 1}...`)
    start = from
  }

  const pending = migrations.slice(start - 1, end)

  console.log(`[migration] applying migrations from v${start} to v${end}...`)

  if (pending.length === 0) {
    console.log('[migration] schema is up to date')
    return
  }


  for (const migration of pending) {
    console.log(`[migration] v${migration.version}: ${migration.description}`)
    migration.up(db)
    db.run('INSERT INTO schema_migrations (version) VALUES (?)', [migration.version])
    console.log(`[migration] v${migration.version} applied`)
  }
}


export function revertMigrations(db: Database, depth: number = 1) {
  const appliedMigrations = db.query('SELECT version as v, applied_at as date FROM schema_migrations').all() as Array<{ v: number, date: string }>

  if (depth && (appliedMigrations ?? []).length < depth) {
    throw new Error(`Invalid migration depth: --depth = ${depth}`)
  }

  if (appliedMigrations?.length < 1){
    console.log('[migration] no migrations applied yet]')
    return;
  }

  const diff = migrations.filter(m => !(appliedMigrations ?? []).map(am => am.v).includes(m.version))


  if (diff.length > 0){
    console.log(`[migration] warning: Existing migrations not applied yet: versions ${diff.map(m => m.version).join(', ')}`)
  }

  const candidates = difference<Migration>(migrations, diff, 'version').sort((a, b) => b.version - a.version).slice(0, depth)

  for(const migration of candidates){
    console.log(`[migration] v${migration.version}: ${migration.description}`)
    migration.down(db)
    db.run('DELETE FROM schema_migrations WHERE version = ?', [migration.version])
    console.log(`[migration] v${migration.version} reverted`)
  }
}

