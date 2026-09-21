export {}

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

declare global {
  interface Window {
    disco: {
      platform: NodeJS.Platform
      version: string
      analyzeUrl: (url: string) => Promise<AnalyzeResult>
      selectFolder: () => Promise<string | null>
      downloadAudio: (request: DownloadRequest) => Promise<DownloadResult>
      revealFile: (filePath: string) => Promise<void>
      analyzeAudio: (filePath: string) => Promise<AudioAnalysisResult>
      listHistory: () => Promise<HistoryResult>
      saveHistory: (request: HistorySaveRequest) => Promise<HistoryResult>
      updateHistoryAnalysis: (request: HistoryAnalysisUpdate) => Promise<HistoryResult>
      getAudioSource: (id: string) => Promise<AudioSourceResult>
      removeHistory: (id: string) => Promise<HistoryResult>
    }
  }
}
