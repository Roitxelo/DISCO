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
  SampleExportResult,
  SampleRenameRequest,
  HistoryAudioFileRequest,
  HistoryOrganizationUpdate,
  HistoryAvailabilityResult,
  HistoryRelinkRequest,
  DownloadProgress
  , AnalysisComparisonResult
  , AnalysisComparisonProgress
} from '../shared/media'

contextBridge.exposeInMainWorld('disco', {
  platform: process.platform,
  version: '0.1.0',
  analyzeUrl: (url: string): Promise<AnalyzeResult> => ipcRenderer.invoke('media:analyze', url),
  selectFolder: (): Promise<string | null> => ipcRenderer.invoke('folder:select'),
  downloadAudio: (request: DownloadRequest): Promise<DownloadResult> =>
    ipcRenderer.invoke('media:download', request),
  cancelDownload: (): Promise<boolean> => ipcRenderer.invoke('media:download-cancel'),
  onDownloadProgress: (callback: (progress: DownloadProgress) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, progress: DownloadProgress): void => callback(progress)
    ipcRenderer.on('download:progress', listener)
    return () => ipcRenderer.removeListener('download:progress', listener)
  },
  revealFile: (filePath: string): Promise<void> => ipcRenderer.invoke('file:reveal', filePath),
  analyzeAudio: (filePath: string): Promise<AudioAnalysisResult> =>
    ipcRenderer.invoke('audio:analyze', filePath),
  compareAnalysisV3: (): Promise<AnalysisComparisonResult> => ipcRenderer.invoke('analysis:compare-v3'),
  onAnalysisComparisonProgress: (callback: (progress: AnalysisComparisonProgress) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, progress: AnalysisComparisonProgress): void => callback(progress)
    ipcRenderer.on('analysis:comparison-progress', listener)
    return () => ipcRenderer.removeListener('analysis:comparison-progress', listener)
  },
  listHistory: (): Promise<HistoryResult> => ipcRenderer.invoke('history:list'),
  checkHistoryAvailability: (): Promise<HistoryAvailabilityResult> => ipcRenderer.invoke('history:availability'),
  relinkHistoryFile: (request: HistoryRelinkRequest): Promise<HistoryResult> => ipcRenderer.invoke('history:relink', request),
  saveHistory: (request: HistorySaveRequest): Promise<HistoryResult> =>
    ipcRenderer.invoke('history:save', request),
  updateHistoryAnalysis: (request: HistoryAnalysisUpdate): Promise<HistoryResult> =>
    ipcRenderer.invoke('history:update-analysis', request),
  getAudioSource: (request: HistoryAudioFileRequest): Promise<AudioSourceResult> =>
    ipcRenderer.invoke('history:audio-source', request),
  setPrimaryAudioFile: (request: HistoryAudioFileRequest): Promise<HistoryResult> =>
    ipcRenderer.invoke('history:audio-primary', request),
  removeAudioFile: (request: HistoryAudioFileRequest): Promise<HistoryResult> =>
    ipcRenderer.invoke('history:audio-remove', request),
  updateOrganization: (request: HistoryOrganizationUpdate): Promise<HistoryResult> =>
    ipcRenderer.invoke('history:update-organization', request),
  getSampleSource: (historyId: string, sampleId: string): Promise<AudioSourceResult> =>
    ipcRenderer.invoke('history:sample-source', historyId, sampleId),
  renameSample: (request: SampleRenameRequest): Promise<HistoryResult> =>
    ipcRenderer.invoke('history:sample-rename', request),
  removeSample: (historyId: string, sampleId: string): Promise<HistoryResult> =>
    ipcRenderer.invoke('history:sample-remove', historyId, sampleId),
  getWaveform: (request: HistoryAudioFileRequest): Promise<WaveformResult> => ipcRenderer.invoke('history:waveform', request),
  exportSample: (request: SampleExportRequest): Promise<SampleExportResult> =>
    ipcRenderer.invoke('sample:export', request),
  removeHistory: (id: string): Promise<HistoryResult> => ipcRenderer.invoke('history:remove', id)
})
