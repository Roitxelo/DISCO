import { createReadStream } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { basename, dirname, extname, join } from 'node:path'
import { rename, rm, stat } from 'node:fs/promises'
import { Readable } from 'node:stream'
import { pathToFileURL } from 'node:url'
import { app, BrowserWindow, dialog, ipcMain, protocol, shell } from 'electron'
import { is } from '@electron-toolkit/utils'
import { AUDIO_FORMATS, PROJECT_STATUSES, SAMPLE_FORMATS } from '../shared/media'
import { downloadAudio, getMediaInfo } from './services/ytDlp'
import { analyzeAudioV3 } from './services/audioAnalysisV3'
import { compareReviewedHistory } from './services/analysisComparison'
import { importLocalAudio } from './services/localImport'
import { generateWaveform } from './services/waveform'
import { exportSample } from './services/sampleExport'
import {
  listHistory,
  relinkHistoryAudioFile,
  relinkHistorySample,
  removeHistoryAudioFile,
  removeHistorySample,
  renameHistorySample,
  saveHistorySample,
  removeHistoryEntry,
  saveHistoryEntry,
  setPrimaryHistoryAudioFile,
  updateHistoryOrganization,
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
  SampleExportResult,
  SampleRenameRequest,
  HistoryAudioFileRequest,
  HistoryOrganizationUpdate,
  HistoryAvailabilityResult,
  HistoryRelinkRequest,
  DownloadProgress
  , AnalysisComparisonResult
  , LocalImportResult
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

const activeDownloads = new Map<number, AbortController>()

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

  const rendererFilePath = join(__dirname, '../renderer/index.html')
  const trustedRendererUrl = is.dev && process.env.ELECTRON_RENDERER_URL
    ? new URL(process.env.ELECTRON_RENDERER_URL)
    : pathToFileURL(rendererFilePath)

  window.webContents.on('will-navigate', (event, targetUrl) => {
    const target = new URL(targetUrl)
    const trusted = is.dev
      ? target.origin === trustedRendererUrl.origin
      : target.protocol === 'file:' && target.pathname === trustedRendererUrl.pathname

    if (!trusted) event.preventDefault()
  })

  window.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const target = new URL(url)
      if (target.protocol === 'https:' || target.protocol === 'http:') {
        void shell.openExternal(target.href)
      }
    } catch {
      // Las URLs no válidas se descartan.
    }
    return { action: 'deny' }
  })

  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    void window.loadURL(trustedRendererUrl.href)
  } else {
    void window.loadFile(rendererFilePath)
  }
}

app.whenReady().then(() => {
  protocol.handle('disco-audio', async (request) => {
    const url = new URL(request.url)
    const parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent)
    const entry = (await listHistory()).find((item) => item.id === parts[0])
    if (!entry) return new Response('Audio no autorizado.', { status: 404 })

    const filePath = url.hostname === 'sample'
      ? entry.samples.find((sample) => sample.id === parts[1])?.filePath
      : entry.audioFiles.find((file) => file.format === parts[1])?.filePath ?? entry.filePath
    if (!filePath) return new Response('Audio no autorizado.', { status: 404 })

    try {
      return await streamAudio(request, filePath)
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

  ipcMain.handle('media:download', async (event, request: DownloadRequest): Promise<DownloadResult> => {
    if (activeDownloads.has(event.sender.id)) return { ok: false, error: 'Ya hay una descarga en curso.' }
    const controller = new AbortController()
    const cancelWhenClosed = (): void => controller.abort()
    activeDownloads.set(event.sender.id, controller)
    event.sender.once('destroyed', cancelWhenClosed)
    try {
      const filePath = await downloadAudio(
        request.url,
        request.directory,
        request.format,
        (progress: DownloadProgress) => {
          if (!event.sender.isDestroyed()) event.sender.send('download:progress', progress)
        },
        controller.signal
      )
      return { ok: true, filePath }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo descargar el audio.'
      return { ok: false, error: message }
    } finally {
      if (!event.sender.isDestroyed()) event.sender.removeListener('destroyed', cancelWhenClosed)
      activeDownloads.delete(event.sender.id)
    }
  })

  ipcMain.handle('media:download-cancel', (event): boolean => {
    const controller = activeDownloads.get(event.sender.id)
    if (!controller) return false
    controller.abort()
    return true
  })

  ipcMain.handle('file:reveal', (_event, filePath: unknown): void => {
    if (typeof filePath === 'string') shell.showItemInFolder(filePath)
  })

  ipcMain.handle('audio:analyze', async (_event, filePath: unknown): Promise<AudioAnalysisResult> => {
    if (typeof filePath !== 'string') return { ok: false, error: 'El archivo recibido no es válido.' }
    try {
      return { ok: true, analysis: await analyzeAudioV3(filePath) }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo analizar el audio.'
      return { ok: false, error: message }
    }
  })

  ipcMain.handle('audio:import-local', async (event): Promise<LocalImportResult> => {
    const selected = await dialog.showOpenDialog({
      title: 'Añadir audio a DISCO',
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Audio compatible', extensions: [...AUDIO_FORMATS] }]
    })
    if (selected.canceled || selected.filePaths.length === 0) {
      return { ok: true, entries: await listHistory(), importedIds: [], failed: [] }
    }
    try {
      const result = await importLocalAudio(selected.filePaths, (progress) => {
        if (!event.sender.isDestroyed()) event.sender.send('local-import:progress', progress)
      })
      return { ok: true, ...result }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'No se pudieron importar los archivos.' }
    }
  })

  ipcMain.handle('analysis:compare-v3', async (event): Promise<AnalysisComparisonResult> => {
    try {
      const comparison = await compareReviewedHistory((progress) => {
        if (!event.sender.isDestroyed()) event.sender.send('analysis:comparison-progress', progress)
      })
      return { ok: true, ...comparison }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo completar la comparación del análisis.'
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

  ipcMain.handle('history:availability', async (): Promise<HistoryAvailabilityResult> => {
    try {
      const entries = await listHistory()
      const audioFiles: Record<string, boolean> = {}
      const samples: Record<string, boolean> = {}
      await Promise.all(entries.flatMap((entry) => [
        ...entry.audioFiles.map(async (file) => {
          audioFiles[`${entry.id}:${file.format}`] = (await stat(file.filePath).catch(() => null))?.isFile() === true
        }),
        ...entry.samples.map(async (sample) => {
          samples[`${entry.id}:${sample.id}`] = (await stat(sample.filePath).catch(() => null))?.isFile() === true
        })
      ]))
      return { ok: true, audioFiles, samples }
    } catch {
      return { ok: false, error: 'No se pudo comprobar el estado de los archivos.' }
    }
  })

  ipcMain.handle('history:relink', async (_event, request: HistoryRelinkRequest): Promise<HistoryResult> => {
    if (!request || typeof request.historyId !== 'string') return { ok: false, error: 'La referencia no es válida.' }
    const entry = (await listHistory()).find((item) => item.id === request.historyId)
    if (!entry) return { ok: false, error: 'La canción ya no está en la colección.' }
    const audioFile = request.format ? entry.audioFiles.find((file) => file.format === request.format) : null
    const sample = request.sampleId ? entry.samples.find((item) => item.id === request.sampleId) : null
    if (!audioFile && !sample) return { ok: false, error: 'El archivo ya no está registrado en DISCO.' }
    const expectedFormat = audioFile?.format ?? sample!.format
    const selected = await dialog.showOpenDialog({
      title: audioFile ? `Localizar archivo ${expectedFormat.toUpperCase()}` : `Localizar ${sample!.name}`,
      properties: ['openFile'],
      filters: [{ name: expectedFormat.toUpperCase(), extensions: [expectedFormat] }]
    })
    if (selected.canceled || !selected.filePaths[0]) return { ok: true, entries: await listHistory() }
    const filePath = selected.filePaths[0]
    if (extname(filePath).toLowerCase() !== `.${expectedFormat}`) {
      return { ok: false, error: `Selecciona un archivo ${expectedFormat.toUpperCase()}.` }
    }
    try {
      const info = await stat(filePath)
      if (!info.isFile()) return { ok: false, error: 'La ruta seleccionada no es un archivo.' }
      const entries = audioFile
        ? await relinkHistoryAudioFile(entry.id, audioFile.format, filePath)
        : await relinkHistorySample(entry.id, sample!.id, filePath)
      return { ok: true, entries }
    } catch {
      return { ok: false, error: 'No se pudo volver a enlazar el archivo.' }
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
    const entry = (await listHistory()).find((item) => item.id === id)
    if (!entry) return { ok: false, error: 'La canción ya no está en la colección.' }
    const formatCount = entry.audioFiles.length
    const sampleCount = entry.samples.length
    const detail = [
      `${formatCount} ${formatCount === 1 ? 'archivo de audio asociado' : 'archivos de audio asociados'}.`,
      sampleCount > 0
        ? `${sampleCount} ${sampleCount === 1 ? 'sample exportado permanecerá' : 'samples exportados permanecerán'} en el disco, pero dejarán de aparecer en DISCO.`
        : 'No tiene samples asociados.'
    ].join(' ')
    const choice = await dialog.showMessageBox({
      type: 'warning',
      title: 'Quitar canción',
      message: `¿Qué quieres hacer con “${entry.media.title}”?`,
      detail,
      buttons: ['Cancelar', 'Quitar solo de DISCO', 'Eliminar también los audios'],
      cancelId: 0,
      defaultId: 0,
      noLink: true
    })
    if (choice.response === 0) return { ok: true, entries: await listHistory() }
    try {
      if (choice.response === 2) {
        const paths = [...new Set(entry.audioFiles.map((file) => file.filePath))]
        await Promise.all(paths.map((filePath) => rm(filePath, { force: true })))
      }
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

  ipcMain.handle('history:audio-source', async (_event, request: HistoryAudioFileRequest): Promise<AudioSourceResult> => {
    if (!request || typeof request.historyId !== 'string' || !AUDIO_FORMATS.includes(request.format)) {
      return { ok: false, error: 'El formato de audio no es válido.' }
    }
    const { historyId, format } = request
    const entry = (await listHistory()).find((item) => item.id === historyId)
    const audioFile = entry?.audioFiles.find((file) => file.format === format)
    if (!entry) return { ok: false, error: 'El audio ya no está en la biblioteca.' }
    if (!audioFile) return { ok: false, error: 'Este formato ya no está en la colección.' }
    try {
      await stat(audioFile.filePath)
      return { ok: true, url: `disco-audio://history/${encodeURIComponent(historyId)}/${format}` }
    } catch {
      return { ok: false, error: 'No se encuentra el archivo. Puede que se haya movido o eliminado.' }
    }
  })

  ipcMain.handle('history:audio-primary', async (_event, request: HistoryAudioFileRequest): Promise<HistoryResult> => {
    if (!request || typeof request.historyId !== 'string' || !AUDIO_FORMATS.includes(request.format)) {
      return { ok: false, error: 'El formato de audio no es válido.' }
    }
    const entry = (await listHistory()).find((item) => item.id === request.historyId)
    const audioFile = entry?.audioFiles.find((file) => file.format === request.format)
    if (!entry || !audioFile) return { ok: false, error: 'Este formato ya no está en la colección.' }
    try {
      await stat(audioFile.filePath)
      return { ok: true, entries: await setPrimaryHistoryAudioFile(request.historyId, request.format) }
    } catch {
      return { ok: false, error: 'No se encuentra el archivo. Puedes localizarlo o volver a descargar este formato.' }
    }
  })

  ipcMain.handle('history:audio-remove', async (_event, request: HistoryAudioFileRequest): Promise<HistoryResult> => {
    if (!request || typeof request.historyId !== 'string' || !AUDIO_FORMATS.includes(request.format)) {
      return { ok: false, error: 'El formato de audio no es válido.' }
    }
    const entry = (await listHistory()).find((item) => item.id === request.historyId)
    const audioFile = entry?.audioFiles.find((file) => file.format === request.format)
    if (!entry || !audioFile) return { ok: false, error: 'Este formato ya no está en la colección.' }
    if (entry.audioFiles.length === 1) {
      return { ok: false, error: 'Una canción debe conservar al menos un formato de audio.' }
    }
    const choice = await dialog.showMessageBox({
      type: 'warning',
      title: 'Eliminar formato',
      message: `¿Qué quieres hacer con el archivo ${request.format.toUpperCase()}?`,
      detail: 'La canción, sus datos y sus samples seguirán guardados en DISCO.',
      buttons: ['Cancelar', 'Quitar de DISCO', 'Eliminar también el archivo'],
      cancelId: 0,
      defaultId: 0,
      noLink: true
    })
    if (choice.response === 0) return { ok: true, entries: await listHistory() }
    try {
      if (choice.response === 2) await rm(audioFile.filePath, { force: true })
      return { ok: true, entries: await removeHistoryAudioFile(request.historyId, request.format) }
    } catch {
      return { ok: false, error: 'No se pudo eliminar el formato.' }
    }
  })

  ipcMain.handle('history:update-organization', async (
    _event,
    request: HistoryOrganizationUpdate
  ): Promise<HistoryResult> => {
    if (!request || typeof request.historyId !== 'string') {
      return { ok: false, error: 'La canción no es válida.' }
    }
    if (request.favorite !== undefined && typeof request.favorite !== 'boolean') {
      return { ok: false, error: 'El favorito no es válido.' }
    }
    if (request.tags !== undefined && (!Array.isArray(request.tags) || request.tags.some((tag) => typeof tag !== 'string'))) {
      return { ok: false, error: 'Las etiquetas no son válidas.' }
    }
    if (request.projectStatus !== undefined && !PROJECT_STATUSES.includes(request.projectStatus)) {
      return { ok: false, error: 'El estado de proyecto no es válido.' }
    }
    try {
      return { ok: true, entries: await updateHistoryOrganization(request) }
    } catch {
      return { ok: false, error: 'No se pudo actualizar la organización.' }
    }
  })

  ipcMain.handle('history:sample-source', async (
    _event,
    historyId: unknown,
    sampleId: unknown
  ): Promise<AudioSourceResult> => {
    if (typeof historyId !== 'string' || typeof sampleId !== 'string') {
      return { ok: false, error: 'El sample no es válido.' }
    }
    const entry = (await listHistory()).find((item) => item.id === historyId)
    const sample = entry?.samples.find((item) => item.id === sampleId)
    if (!entry || !sample) return { ok: false, error: 'El sample ya no está en la colección.' }
    try {
      await stat(sample.filePath)
      return {
        ok: true,
        url: `disco-audio://sample/${encodeURIComponent(historyId)}/${encodeURIComponent(sampleId)}`
      }
    } catch {
      return { ok: false, error: 'No se encuentra el sample. Puede que se haya movido o eliminado.' }
    }
  })

  ipcMain.handle('history:sample-rename', async (
    _event,
    request: SampleRenameRequest
  ): Promise<HistoryResult> => {
    const name = request?.name?.trim()
    if (!request || typeof request.historyId !== 'string' || typeof request.sampleId !== 'string' || !name) {
      return { ok: false, error: 'El nombre del sample no es válido.' }
    }
    try {
      return { ok: true, entries: await renameHistorySample(request.historyId, request.sampleId, name.slice(0, 80)) }
    } catch {
      return { ok: false, error: 'No se pudo renombrar el sample.' }
    }
  })

  ipcMain.handle('history:sample-remove', async (
    _event,
    historyId: unknown,
    sampleId: unknown
  ): Promise<HistoryResult> => {
    if (typeof historyId !== 'string' || typeof sampleId !== 'string') {
      return { ok: false, error: 'El sample no es válido.' }
    }
    const entry = (await listHistory()).find((item) => item.id === historyId)
    const sample = entry?.samples.find((item) => item.id === sampleId)
    if (!sample) return { ok: false, error: 'El sample ya no está en la colección.' }

    const choice = await dialog.showMessageBox({
      type: 'warning',
      title: 'Eliminar sample',
      message: `¿Qué quieres hacer con “${sample.name}”?`,
      detail: 'Puedes quitarlo solo de DISCO o eliminar también el archivo exportado.',
      buttons: ['Cancelar', 'Quitar de DISCO', 'Eliminar también el archivo'],
      cancelId: 0,
      defaultId: 0,
      noLink: true
    })
    if (choice.response === 0) return { ok: true, entries: await listHistory() }
    try {
      if (choice.response === 2) await rm(sample.filePath, { force: true })
      return { ok: true, entries: await removeHistorySample(historyId, sampleId) }
    } catch {
      return { ok: false, error: 'No se pudo eliminar el sample.' }
    }
  })

  ipcMain.handle('history:waveform', async (_event, request: HistoryAudioFileRequest): Promise<WaveformResult> => {
    if (!request || typeof request.historyId !== 'string' || !AUDIO_FORMATS.includes(request.format)) {
      return { ok: false, error: 'El formato de audio no es válido.' }
    }
    const entry = (await listHistory()).find((item) => item.id === request.historyId)
    if (!entry) return { ok: false, error: 'El audio ya no está en la biblioteca.' }
    const audioFile = entry.audioFiles.find((file) => file.format === request.format)
    if (!audioFile) return { ok: false, error: 'Este formato ya no está en la colección.' }
    try {
      return { ok: true, imageUrl: await generateWaveform(audioFile.filePath) }
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
      (request.sampleId !== undefined && typeof request.sampleId !== 'string') ||
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
    const requestedName = request.sampleName
      ?.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '')
      .trim()
      .slice(0, 80)
    const musicalInfo = entry.analysis
      ? ` - ${entry.analysis.bpm.toFixed(1)} BPM - ${entry.analysis.key}${entry.analysis.mode === 'minor' ? 'm' : ''}`
      : ''
    const existingSample = request.sampleId
      ? entry.samples.find((sample) => sample.id === request.sampleId)
      : null
    const defaultPath = existingSample
      ? join(
          dirname(existingSample.filePath),
          `${basename(existingSample.filePath, extname(existingSample.filePath))}.${request.format}`
        )
      : join(
          dirname(entry.filePath),
          requestedName ? `${requestedName}.${request.format}` : `${safeTitle}${musicalInfo} - Sample.${request.format}`
        )
    const selected = await dialog.showSaveDialog({
      title: 'Guardar sample',
      defaultPath,
      filters: [{ name: request.format.toUpperCase(), extensions: [request.format] }]
    })
    if (selected.canceled || !selected.filePath) return { ok: true, filePath: null }

    let temporaryPath: string | null = null
    try {
      const replacesExistingFile = existingSample?.filePath === selected.filePath
      const extension = extname(selected.filePath)
      temporaryPath = replacesExistingFile
        ? join(dirname(selected.filePath), `.${basename(selected.filePath, extension)}.${randomUUID()}${extension}`)
        : selected.filePath
      await exportSample(
        entry.filePath,
        temporaryPath,
        request.startSeconds,
        request.endSeconds,
        request.format,
        request.normalizePeak === true
      )
      if (replacesExistingFile) {
        const backupPath = `${selected.filePath}.disco-backup-${randomUUID()}`
        let originalMoved = false
        try {
          await rename(selected.filePath, backupPath)
          originalMoved = true
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
        }
        try {
          await rename(temporaryPath, selected.filePath)
        } catch (error) {
          await rm(temporaryPath, { force: true })
          if (originalMoved) await rename(backupPath, selected.filePath)
          throw error
        }
        if (originalMoved) await rm(backupPath, { force: true }).catch(() => undefined)
      }
      await saveHistorySample(request.historyId, {
        name: request.sampleName?.trim().slice(0, 80)
          || existingSample?.name
          || `Sample ${String(entry.samples.length + 1).padStart(2, '0')}`,
        filePath: selected.filePath,
        format: request.format,
        startSeconds: request.startSeconds,
        endSeconds: request.endSeconds,
        normalizePeak: request.normalizePeak === true
      }, request.sampleId)
      return { ok: true, filePath: selected.filePath }
    } catch (error) {
      if (temporaryPath && temporaryPath !== selected.filePath) {
        await rm(temporaryPath, { force: true }).catch(() => undefined)
      }
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
