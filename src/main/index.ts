import { createReadStream } from 'node:fs'
import { dirname, extname, join } from 'node:path'
import { stat } from 'node:fs/promises'
import { Readable } from 'node:stream'
import { app, BrowserWindow, dialog, ipcMain, protocol, shell } from 'electron'
import { is } from '@electron-toolkit/utils'
import { SAMPLE_FORMATS } from '../shared/media'
import { downloadAudio, getMediaInfo } from './services/ytDlp'
import { analyzeAudio } from './services/audioAnalysis'
import { generateWaveform } from './services/waveform'
import { exportSample } from './services/sampleExport'
import {
  listHistory,
  removeHistoryEntry,
  saveHistoryEntry,
  updateHistoryAnalysis
} from './services/history'
import type {
  AnalyzeResult,
  AudioSourceResult,
  AudioAnalysisResult,
  DownloadRequest,
  DownloadResult,
  HistoryResult,
  HistoryAnalysisUpdate,
  HistorySaveRequest,
  WaveformResult,
  SampleExportRequest,
  SampleExportResult
} from '../shared/media'

protocol.registerSchemesAsPrivileged([
  { scheme: 'disco-audio', privileges: { secure: true, standard: true, stream: true } }
])

const AUDIO_MIME_TYPES: Record<string, string> = {
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.flac': 'audio/flac',
  '.m4a': 'audio/mp4'
}

async function streamAudio(request: Request, filePath: string): Promise<Response> {
  const file = await stat(filePath)
  const range = request.headers.get('range')
  let start = 0
  let end = file.size - 1
  let status = 200

  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range)
    if (!match) return new Response(null, { status: 416 })

    if (!match[1] && match[2]) {
      start = Math.max(0, file.size - Number(match[2]))
    } else {
      start = Number(match[1])
      if (match[2]) end = Math.min(Number(match[2]), file.size - 1)
    }
    if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= file.size) {
      return new Response(null, {
        status: 416,
        headers: { 'Content-Range': `bytes */${file.size}` }
      })
    }
    status = 206
  }

  const headers = new Headers({
    'Accept-Ranges': 'bytes',
    'Content-Length': String(end - start + 1),
    'Content-Type': AUDIO_MIME_TYPES[extname(filePath).toLowerCase()] ?? 'application/octet-stream',
    'Cache-Control': 'no-store'
  })
  if (status === 206) headers.set('Content-Range', `bytes ${start}-${end}/${file.size}`)
  if (request.method === 'HEAD') return new Response(null, { status, headers })

  const stream = createReadStream(filePath, { start, end })
  return new Response(Readable.toWeb(stream) as ReadableStream<Uint8Array>, { status, headers })
}

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 900,
    minHeight: 620,
    show: false,
    backgroundColor: '#0b0b0d',
    title: 'DISCO',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  window.once('ready-to-show', () => window.show())

  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    void window.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    void window.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  protocol.handle('disco-audio', async (request) => {
    const url = new URL(request.url)
    const id = decodeURIComponent(url.pathname.slice(1))
    const entry = (await listHistory()).find((item) => item.id === id)
    if (!entry) return new Response('Audio no autorizado.', { status: 404 })

    try {
      return await streamAudio(request, entry.filePath)
    } catch {
      return new Response('Archivo no encontrado.', { status: 404 })
    }
  })

  ipcMain.handle('media:analyze', async (_event, url: unknown): Promise<AnalyzeResult> => {
    if (typeof url !== 'string') return { ok: false, error: 'El enlace recibido no es válido.' }

    try {
      return { ok: true, media: await getMediaInfo(url) }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo analizar el enlace.'
      return { ok: false, error: message }
    }
  })

  ipcMain.handle('folder:select', async (): Promise<string | null> => {
    const result = await dialog.showOpenDialog({
      title: 'Seleccionar carpeta para guardar el audio',
      properties: ['openDirectory', 'createDirectory']
    })
    return result.canceled ? null : result.filePaths[0] ?? null
  })

  ipcMain.handle('media:download', async (_event, request: DownloadRequest): Promise<DownloadResult> => {
    try {
      const filePath = await downloadAudio(request.url, request.directory, request.format)
      return { ok: true, filePath }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo descargar el audio.'
      return { ok: false, error: message }
    }
  })

  ipcMain.handle('file:reveal', (_event, filePath: unknown): void => {
    if (typeof filePath === 'string') shell.showItemInFolder(filePath)
  })

  ipcMain.handle('audio:analyze', async (_event, filePath: unknown): Promise<AudioAnalysisResult> => {
    if (typeof filePath !== 'string') return { ok: false, error: 'El archivo recibido no es válido.' }
    try {
      return { ok: true, analysis: await analyzeAudio(filePath) }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo analizar el audio.'
      return { ok: false, error: message }
    }
  })

  ipcMain.handle('history:list', async (): Promise<HistoryResult> => {
    try {
      return { ok: true, entries: await listHistory() }
    } catch {
      return { ok: false, error: 'No se pudo cargar el historial.' }
    }
  })

  ipcMain.handle('history:save', async (_event, request: HistorySaveRequest): Promise<HistoryResult> => {
    try {
      return { ok: true, entries: await saveHistoryEntry(request) }
    } catch {
      return { ok: false, error: 'No se pudo guardar la descarga en el historial.' }
    }
  })

  ipcMain.handle('history:remove', async (_event, id: unknown): Promise<HistoryResult> => {
    if (typeof id !== 'string') return { ok: false, error: 'La entrada no es válida.' }
    try {
      return { ok: true, entries: await removeHistoryEntry(id) }
    } catch {
      return { ok: false, error: 'No se pudo eliminar la entrada del historial.' }
    }
  })

  ipcMain.handle('history:update-analysis', async (
    _event,
    request: HistoryAnalysisUpdate
  ): Promise<HistoryResult> => {
    try {
      return { ok: true, entries: await updateHistoryAnalysis(request) }
    } catch {
      return { ok: false, error: 'No se pudo guardar la corrección musical.' }
    }
  })

  ipcMain.handle('history:audio-source', async (_event, id: unknown): Promise<AudioSourceResult> => {
    if (typeof id !== 'string') return { ok: false, error: 'La entrada no es válida.' }
    const entry = (await listHistory()).find((item) => item.id === id)
    if (!entry) return { ok: false, error: 'El audio ya no está en la biblioteca.' }
    try {
      await stat(entry.filePath)
      return { ok: true, url: `disco-audio://history/${encodeURIComponent(id)}` }
    } catch {
      return { ok: false, error: 'No se encuentra el archivo. Puede que se haya movido o eliminado.' }
    }
  })

  ipcMain.handle('history:waveform', async (_event, id: unknown): Promise<WaveformResult> => {
    if (typeof id !== 'string') return { ok: false, error: 'La entrada no es válida.' }
    const entry = (await listHistory()).find((item) => item.id === id)
    if (!entry) return { ok: false, error: 'El audio ya no está en la biblioteca.' }
    try {
      return { ok: true, imageUrl: await generateWaveform(entry.filePath) }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo generar la forma de onda.'
      return { ok: false, error: message }
    }
  })

  ipcMain.handle('sample:export', async (
    _event,
    request: SampleExportRequest
  ): Promise<SampleExportResult> => {
    if (
      !request ||
      typeof request.historyId !== 'string' ||
      typeof request.startSeconds !== 'number' ||
      typeof request.endSeconds !== 'number'
    ) {
      return { ok: false, error: 'La selección del sample no es válida.' }
    }
    const entry = (await listHistory()).find((item) => item.id === request.historyId)
    if (!entry) return { ok: false, error: 'El audio ya no está en la biblioteca.' }
    if (!SAMPLE_FORMATS.includes(request.format)) {
      return { ok: false, error: 'El formato del sample no es válido.' }
    }

    const safeTitle = entry.media.title.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '').trim().slice(0, 80) || 'Sample'
    const musicalInfo = entry.analysis
      ? ` - ${entry.analysis.bpm.toFixed(1)} BPM - ${entry.analysis.key}${entry.analysis.mode === 'minor' ? 'm' : ''}`
      : ''
    const defaultPath = join(
      dirname(entry.filePath),
      `${safeTitle}${musicalInfo} - Sample.${request.format}`
    )
    const selected = await dialog.showSaveDialog({
      title: 'Guardar sample',
      defaultPath,
      filters: [{ name: request.format.toUpperCase(), extensions: [request.format] }]
    })
    if (selected.canceled || !selected.filePath) return { ok: true, filePath: null }

    try {
      await exportSample(
        entry.filePath,
        selected.filePath,
        request.startSeconds,
        request.endSeconds,
        request.format
      )
      return { ok: true, filePath: selected.filePath }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo exportar el sample.'
      return { ok: false, error: message }
    }
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
