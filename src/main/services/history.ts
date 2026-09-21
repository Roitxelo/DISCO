import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { app } from 'electron'
import type { HistoryEntry, HistorySaveRequest } from '../../shared/media'

const MAX_ENTRIES = 200

function historyPath(): string {
  return join(app.getPath('userData'), 'history.json')
}

async function readHistory(): Promise<HistoryEntry[]> {
  try {
    const contents = await readFile(historyPath(), 'utf8')
    const parsed: unknown = JSON.parse(contents)
    return Array.isArray(parsed) ? (parsed as HistoryEntry[]) : []
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw error
  }
}

async function writeHistory(entries: HistoryEntry[]): Promise<void> {
  const destination = historyPath()
  const temporary = `${destination}.tmp`
  await mkdir(dirname(destination), { recursive: true })
  await writeFile(temporary, JSON.stringify(entries, null, 2), 'utf8')
  await rename(temporary, destination)
}

export async function listHistory(): Promise<HistoryEntry[]> {
  return readHistory()
}

export async function saveHistoryEntry(request: HistorySaveRequest): Promise<HistoryEntry[]> {
  const entries = await readHistory()
  const entry: HistoryEntry = {
    ...request,
    id: randomUUID(),
    createdAt: new Date().toISOString()
  }
  const updated = [entry, ...entries].slice(0, MAX_ENTRIES)
  await writeHistory(updated)
  return updated
}

export async function removeHistoryEntry(id: string): Promise<HistoryEntry[]> {
  const entries = await readHistory()
  const updated = entries.filter((entry) => entry.id !== id)
  await writeHistory(updated)
  return updated
}
