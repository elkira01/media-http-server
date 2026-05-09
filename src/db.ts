import { Database } from 'bun:sqlite'
import { mkdirSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'

const DATA_DIR = join(process.cwd(), 'data')
const DB_PATH = join(DATA_DIR, 'media.db')
const UPLOADS_DIR = join(DATA_DIR, 'uploads')

mkdirSync(DATA_DIR, { recursive: true })

export const db = new Database(DB_PATH)

export async function ensureDirs() {
  await mkdir(DATA_DIR, { recursive: true })
  await mkdir(UPLOADS_DIR, { recursive: true })
}

export function initSchema() {
  db.run(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  const current = db.query('SELECT MAX(version) as v FROM schema_migrations').get() as { v: number | null }
  const version = current?.v ?? 0

  if (version < 1) {
    console.log('[migration] v1: initial schema (UUIDv7 IDs)')
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

    db.run('INSERT INTO schema_migrations (version) VALUES (1)')
    console.log('[migration] v1 applied')
  }
}

export interface Folder {
  id: string
  name: string
  parent_id: string | null
  created_at: string
}

export interface MediaItem {
  id: string
  filename: string
  original_name: string
  mime_type: string
  size: number
  folder_id: string | null
  storage_path: string
  media_type: 'image' | 'video' | 'document'
  created_at: string
}

export { UPLOADS_DIR }
