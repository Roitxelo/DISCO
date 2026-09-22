import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { app } from 'electron'
import { PROJECT_STATUSES } from '../../shared/media'
import type { AudioFormat, HistoryAnalysisUpdate, HistoryEntry, HistoryOrganizationUpdate, HistorySaveRequest } from '../../shared/media'

const MAX_ENTRIES = 200

function historyPath(): string {
  return join(app.getPath('userData'), 'history.json')
}

async function readHistory(): Promise<HistoryEntry[]> {
  try {
    const contents = await readFile(historyPath(), 'utf8')
    const parsed: unknown = JSON.parse(contents)
    if (!Array.isArray(parsed)) return []
    return (parsed as HistoryEntry[]).map((entry) => ({
      ...entry,
      detectedAnalysis: entry.detectedAnalysis ?? entry.analysis,
      analysisReview: entry.analysisReview ?? 'pending',
      reviewedAt: entry.reviewedAt ?? null,
      audioFiles: entry.audioFiles ?? [{ format: entry.format, filePath: entry.filePath, createdAt: entry.createdAt }],
      samples: (entry.samples ?? []).map((sample, index) => ({
        ...sample,
        name: sample.name ?? `Sample ${String(index + 1).padStart(2, '0')}`
      })),
      favorite: entry.favorite ?? false,
      tags: entry.tags ?? [],
      projectStatus: entry.projectStatus ?? ((entry.samples?.length ?? 0) > 0 ? 'sampled' : 'new')
    }))
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
  const existing = entries.find((entry) => entry.media.id === request.media.id)
  if (existing) {
    const withoutSameFormat = existing.audioFiles.filter((file) => file.format !== request.format)
    const updatedEntry: HistoryEntry = {
      ...existing,
      media: request.media,
      format: request.format,
      filePath: request.filePath,
      analysis: existing.analysis ?? request.analysis,
      detectedAnalysis: existing.detectedAnalysis ?? request.analysis,
      audioFiles: [
        ...withoutSameFormat,
        { format: request.format, filePath: request.filePath, createdAt: new Date().toISOString() }
      ]
    }
    const updated = [updatedEntry, ...entries.filter((entry) => entry.id !== existing.id)].slice(0, MAX_ENTRIES)
    await writeHistory(updated)
    return updated
  }
  const entry: HistoryEntry = {
    ...request,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    detectedAnalysis: request.analysis,
    analysisReview: 'pending',
    reviewedAt: null,
    audioFiles: [{ format: request.format, filePath: request.filePath, createdAt: new Date().toISOString() }],
    samples: [],
    favorite: false,
    tags: [],
    projectStatus: 'new'
  }
  const updated = [entry, ...entries].slice(0, MAX_ENTRIES)
  await writeHistory(updated)
  return updated
}

export async function saveHistorySample(
  id: string,
  sample: Omit<HistoryEntry['samples'][number], 'id' | 'createdAt'>,
  sampleId?: string
): Promise<void> {
  const entries = await readHistory()
  const updated = entries.map((entry) => {
    if (entry.id !== id) return entry
    const existing = sampleId ? entry.samples.find((item) => item.id === sampleId) : null
    if (!existing) {
      return { ...entry, samples: [...entry.samples, { ...sample, id: randomUUID(), createdAt: new Date().toISOString() }] }
    }
    return {
      ...entry,
      samples: entry.samples.map((item) => item.id === sampleId
        ? { ...sample, id: item.id, createdAt: item.createdAt }
        : item)
    }
  })
  await writeHistory(updated)
}

export async function renameHistorySample(id: string, sampleId: string, name: string): Promise<HistoryEntry[]> {
  const entries = await readHistory()
  const updated = entries.map((entry) => entry.id === id
    ? { ...entry, samples: entry.samples.map((sample) => sample.id === sampleId ? { ...sample, name } : sample) }
    : entry)
  await writeHistory(updated)
  return updated
}

export async function removeHistorySample(id: string, sampleId: string): Promise<HistoryEntry[]> {
  const entries = await readHistory()
  const updated = entries.map((entry) => entry.id === id
    ? { ...entry, samples: entry.samples.filter((sample) => sample.id !== sampleId) }
    : entry)
  await writeHistory(updated)
  return updated
}

export async function removeHistoryEntry(id: string): Promise<HistoryEntry[]> {
  const entries = await readHistory()
  const updated = entries.filter((entry) => entry.id !== id)
  await writeHistory(updated)
  return updated
}

export async function setPrimaryHistoryAudioFile(id: string, format: AudioFormat): Promise<HistoryEntry[]> {
  const entries = await readHistory()
  const updated = entries.map((entry) => {
    if (entry.id !== id) return entry
    const selected = entry.audioFiles.find((file) => file.format === format)
    return selected ? { ...entry, format: selected.format, filePath: selected.filePath } : entry
  })
  await writeHistory(updated)
  return updated
}

export async function removeHistoryAudioFile(id: string, format: AudioFormat): Promise<HistoryEntry[]> {
  const entries = await readHistory()
  const updated = entries.map((entry) => {
    if (entry.id !== id) return entry
    const audioFiles = entry.audioFiles.filter((file) => file.format !== format)
    if (audioFiles.length === 0) return entry
    const primary = entry.format === format ? audioFiles[audioFiles.length - 1] : null
    return {
      ...entry,
      audioFiles,
      format: primary?.format ?? entry.format,
      filePath: primary?.filePath ?? entry.filePath
    }
  })
  await writeHistory(updated)
  return updated
}

export async function updateHistoryOrganization(request: HistoryOrganizationUpdate): Promise<HistoryEntry[]> {
  const entries = await readHistory()
  const updated = entries.map((entry) => {
    if (entry.id !== request.historyId) return entry
    const tags = request.tags
      ? [...new Set(request.tags.map((tag) => tag.trim().replace(/\s+/g, ' ').slice(0, 30)).filter(Boolean))].slice(0, 12)
      : entry.tags
    return {
      ...entry,
      favorite: typeof request.favorite === 'boolean' ? request.favorite : entry.favorite,
      tags,
      projectStatus: request.projectStatus && PROJECT_STATUSES.includes(request.projectStatus)
        ? request.projectStatus
        : entry.projectStatus
    }
  })
  await writeHistory(updated)
  return updated
}

export async function updateHistoryAnalysis(request: HistoryAnalysisUpdate): Promise<HistoryEntry[]> {
  const entries = await readHistory()
  const updated = entries.map((entry) =>
    entry.filePath === request.filePath
      ? {
          ...entry,
          analysis: request.analysis,
          detectedAnalysis: entry.detectedAnalysis ?? entry.analysis,
          analysisReview: request.review,
          reviewedAt: new Date().toISOString()
        }
      : entry
  )
  await writeHistory(updated)
  return updated
}
