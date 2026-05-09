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
