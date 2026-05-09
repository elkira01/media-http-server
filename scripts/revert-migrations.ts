import { Database } from 'bun:sqlite'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import {revertMigrations} from '../src/migrations'
import { parseArgs } from "util"

const DATA_DIR = join(process.cwd(), 'data')
const DB_PATH = join(DATA_DIR, 'media.db')

mkdirSync(DATA_DIR, { recursive: true })

const db = new Database(DB_PATH)

const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
        depth: { type: 'string' }
    }
})

const depth = values.depth ? parseInt(values.depth) : 1

revertMigrations(db, depth)
db.close()
