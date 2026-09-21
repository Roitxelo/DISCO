import { contextBridge, ipcRenderer } from 'electron'
import type { AnalyzeResult } from '../shared/media'

contextBridge.exposeInMainWorld('disco', {
  platform: process.platform,
  version: '0.1.0',
  analyzeUrl: (url: string): Promise<AnalyzeResult> => ipcRenderer.invoke('media:analyze', url)
})
