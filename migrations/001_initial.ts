import type { Database } from 'bun:sqlite'

export const version = 1
export const description = 'initial schema (UUIDv7 IDs)'

export function up(db: Database) {
  db.run(`DROP TABLE IF EXISTS media`)
  db.run(`DROP TABLE IF EXISTS folders`)

  db.run(`
    CREATE TABLE folders (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      parent_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE
    )
  `)

  db.run(`
    CREATE TABLE media (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size INTEGER NOT NULL,
      folder_id TEXT,
      storage_path TEXT NOT NULL,
      media_type TEXT NOT NULL CHECK(media_type IN ('image','video','document')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
    )
  `)

  db.run('CREATE INDEX IF NOT EXISTS idx_folders_parent ON folders(parent_id)')
  db.run('CREATE INDEX IF NOT EXISTS idx_media_folder ON media(folder_id)')
  db.run('CREATE INDEX IF NOT EXISTS idx_media_type ON media(media_type)')
  db.run('CREATE INDEX IF NOT EXISTS idx_media_created ON media(created_at)')
}

export function down(db: Database) {
}

