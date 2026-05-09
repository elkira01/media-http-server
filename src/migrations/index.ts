import type { Database } from 'bun:sqlite'

interface Migration {
  version: number
  description: string
  up: (db: Database) => void
}

const migrations: Migration[] = []

// Import all migration files in order
import * as m001 from './001_initial'
import * as m002 from './002_auth'

migrations.push(m001 as unknown as Migration)
migrations.push(m002 as unknown as Migration)

migrations.sort((a, b) => a.version - b.version)

export function runMigrations(db: Database) {
  db.run(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  const current = db.query('SELECT MAX(version) as v FROM schema_migrations').get() as { v: number | null }
  const version = current?.v ?? 0

  const pending = migrations.filter(m => m.version > version)

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
