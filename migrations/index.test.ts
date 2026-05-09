import { afterEach, describe, expect, test } from 'bun:test'
import { Database } from 'bun:sqlite'
import { revertMigrations, runMigrations } from './index.ts'

const databases: Database[] = []

function createDatabase() {
  const db = new Database(':memory:')
  databases.push(db)
  return db
}

function getTableNames(db: Database) {
  return db
    .query("SELECT name FROM sqlite_master WHERE type = 'table'")
    .all() as Array<{ name: string }>
}

function getColumnNames(db: Database, table: string) {
  return db
    .query(`PRAGMA table_info(${table})`)
    .all() as Array<{ name: string }>
}

function getAppliedVersions(db: Database) {
  return db
    .query('SELECT version FROM schema_migrations ORDER BY version')
    .all() as Array<{ version: number }>
}

afterEach(() => {
  while (databases.length > 0) {
    databases.pop()?.close()
  }
})

describe('runMigrations', () => {
  test('applies every migration in version order', () => {
    const db = createDatabase()

    runMigrations(db)

    expect(getAppliedVersions(db).map(({ version }) => version)).toEqual([1, 2, 3])
    expect(getTableNames(db).map(({ name }) => name)).toEqual(
      expect.arrayContaining(['folders', 'media', 'users', 'refresh_tokens', 'schema_migrations']),
    )
    expect(getColumnNames(db, 'media').map(({ name }) => name)).toContain('url')
  })

  test('respects the upper migration bound', () => {
    const db = createDatabase()

    runMigrations(db, undefined, 2)

    expect(getAppliedVersions(db).map(({ version }) => version)).toEqual([1, 2])
    expect(getColumnNames(db, 'media').map(({ name }) => name)).not.toContain('url')
  })

  test('only applies pending migrations on subsequent runs', () => {
    const db = createDatabase()

    runMigrations(db, undefined, 2)
    runMigrations(db)

    expect(getAppliedVersions(db).map(({ version }) => version)).toEqual([1, 2, 3])
    expect(getColumnNames(db, 'media').map(({ name }) => name)).toContain('url')
  })
})

describe('revertMigrations', () => {
  test('removes the most recent migration records', () => {
    const db = createDatabase()

    runMigrations(db)
    revertMigrations(db, 2)

    expect(getAppliedVersions(db).map(({ version }) => version)).toEqual([1])
  })

  test('allows reverting all applied migration records', () => {
    const db = createDatabase()

    runMigrations(db)
    revertMigrations(db, 3)

    expect(getAppliedVersions(db)).toEqual([])
  })
})
