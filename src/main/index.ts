import { join } from 'node:path'
import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
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
  AudioAnalysisResult,
  DownloadRequest,
  DownloadResult,
  HistoryResult,
  HistoryAnalysisUpdate,
  HistorySaveRequest
} from '../shared/media'

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

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
