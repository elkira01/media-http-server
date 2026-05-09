import { Database } from 'bun:sqlite'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { runMigrations } from '../src/migrations'

const DATA_DIR = join(process.cwd(), 'data')
const DB_PATH = join(DATA_DIR, 'media.db')

mkdirSync(DATA_DIR, { recursive: true })

const db = new Database(DB_PATH)
runMigrations(db)
db.close()
