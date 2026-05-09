import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { db, ensureDirs, initSchema } from './db'
import folders from './routes/folders'
import media from './routes/media'
import files from './routes/files'

await ensureDirs()
initSchema()

const app = new Hono()

app.use(cors())
app.use(logger())

app.route('/folders', folders)
app.route('/media', media)
app.route('/files', files)

app.get('/health', (c) => c.json({ status: 'ok', db: db.filename }))

export default app
