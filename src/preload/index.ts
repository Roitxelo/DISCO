import { contextBridge, ipcRenderer } from 'electron'
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

contextBridge.exposeInMainWorld('disco', {
  platform: process.platform,
  version: '0.1.0',
  analyzeUrl: (url: string): Promise<AnalyzeResult> => ipcRenderer.invoke('media:analyze', url),
  selectFolder: (): Promise<string | null> => ipcRenderer.invoke('folder:select'),
  downloadAudio: (request: DownloadRequest): Promise<DownloadResult> =>
    ipcRenderer.invoke('media:download', request),
  revealFile: (filePath: string): Promise<void> => ipcRenderer.invoke('file:reveal', filePath),
  analyzeAudio: (filePath: string): Promise<AudioAnalysisResult> =>
    ipcRenderer.invoke('audio:analyze', filePath),
  listHistory: (): Promise<HistoryResult> => ipcRenderer.invoke('history:list'),
  saveHistory: (request: HistorySaveRequest): Promise<HistoryResult> =>
    ipcRenderer.invoke('history:save', request),
  updateHistoryAnalysis: (request: HistoryAnalysisUpdate): Promise<HistoryResult> =>
    ipcRenderer.invoke('history:update-analysis', request),
  getAudioSource: (id: string): Promise<AudioSourceResult> =>
    ipcRenderer.invoke('history:audio-source', id),
  getWaveform: (id: string): Promise<WaveformResult> => ipcRenderer.invoke('history:waveform', id),
  exportSample: (request: SampleExportRequest): Promise<SampleExportResult> =>
    ipcRenderer.invoke('sample:export', request),
  removeHistory: (id: string): Promise<HistoryResult> => ipcRenderer.invoke('history:remove', id)
})
