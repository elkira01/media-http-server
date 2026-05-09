import type { Database } from 'bun:sqlite'

export const version = 3
export const description = 'media url'

export function up(db: Database) {
  db.run(`ALTER TABLE media ADD COLUMN url TEXT NOT NULL DEFAULT ''`)
}

export function down(db: Database) {
}
