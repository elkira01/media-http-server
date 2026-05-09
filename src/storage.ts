import { mkdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { UPLOADS_DIR } from './db'

export function generateFilename(original: string): string {
  const ext = original.split('.').pop() || ''
  const base = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
  return ext ? `${base}.${ext}` : base
}

export async function saveFile(file: File, filename: string): Promise<string> {
  const path = join(UPLOADS_DIR, filename)
  await mkdir(dirname(path), { recursive: true })
  await Bun.write(path, file)
  return path
}

export async function deleteFile(filepath: string): Promise<void> {
  try {
    await Bun.file(filepath).delete()
  } catch {
    // ignore
  }
}

export function readFileStream(filepath: string): ReadableStream {
  return Bun.file(filepath).stream()
}

export async function readFileBuffer(filepath: string): Promise<Uint8Array> {
  return new Uint8Array(await Bun.file(filepath).arrayBuffer())
}

export function detectMediaType(mime: string): 'image' | 'video' | 'document' {
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/')) return 'video'
  return 'document'
}
