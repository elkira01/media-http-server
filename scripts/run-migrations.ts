import { Database } from 'bun:sqlite'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { runMigrations } from '../migrations'
import {parseArgs} from "util";

const DATA_DIR = join(process.cwd(), 'data')
const DB_PATH = join(DATA_DIR, 'media.db')

mkdirSync(DATA_DIR, { recursive: true })

const db = new Database(DB_PATH)

const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
        from: { type: 'string' },
        to: { type: 'string' }
    }
})

const _from = parseInt(values.from || '')
const _to = parseInt(values.to || '')

if (_from > _to) throw new Error('Invalid arguments: --from must be less than --to')

runMigrations(db, _from, _to)
db.close()
