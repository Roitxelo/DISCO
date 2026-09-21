import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { stat } from 'node:fs/promises'
import { app, BrowserWindow, dialog, ipcMain, net, protocol, shell } from 'electron'
import { is } from '@electron-toolkit/utils'
import { downloadAudio, getMediaInfo } from './services/ytDlp'
import { analyzeAudio } from './services/audioAnalysis'
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
  HistorySaveRequest
} from '../shared/media'

protocol.registerSchemesAsPrivileged([
  { scheme: 'disco-audio', privileges: { secure: true, standard: true, stream: true } }
])

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
      await stat(entry.filePath)
      return net.fetch(pathToFileURL(entry.filePath).toString(), {
        headers: request.headers
      })
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

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
