export {}

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
  , LocalImportProgress
  , LocalImportResult
} from '../shared/media'

declare global {
  interface Window {
    disco: {
      platform: NodeJS.Platform
      version: string
      analyzeUrl: (url: string) => Promise<AnalyzeResult>
      selectFolder: () => Promise<string | null>
      downloadAudio: (request: DownloadRequest) => Promise<DownloadResult>
      cancelDownload: () => Promise<boolean>
      onDownloadProgress: (callback: (progress: DownloadProgress) => void) => () => void
      revealFile: (filePath: string) => Promise<void>
      analyzeAudio: (filePath: string) => Promise<AudioAnalysisResult>
      importLocalAudio: () => Promise<LocalImportResult>
      onLocalImportProgress: (callback: (progress: LocalImportProgress) => void) => () => void
      compareAnalysisV3: () => Promise<AnalysisComparisonResult>
      onAnalysisComparisonProgress: (callback: (progress: AnalysisComparisonProgress) => void) => () => void
      listHistory: () => Promise<HistoryResult>
      checkHistoryAvailability: () => Promise<HistoryAvailabilityResult>
      relinkHistoryFile: (request: HistoryRelinkRequest) => Promise<HistoryResult>
      saveHistory: (request: HistorySaveRequest) => Promise<HistoryResult>
      updateHistoryAnalysis: (request: HistoryAnalysisUpdate) => Promise<HistoryResult>
      getAudioSource: (request: HistoryAudioFileRequest) => Promise<AudioSourceResult>
      setPrimaryAudioFile: (request: HistoryAudioFileRequest) => Promise<HistoryResult>
      removeAudioFile: (request: HistoryAudioFileRequest) => Promise<HistoryResult>
      updateOrganization: (request: HistoryOrganizationUpdate) => Promise<HistoryResult>
      getSampleSource: (historyId: string, sampleId: string) => Promise<AudioSourceResult>
      renameSample: (request: SampleRenameRequest) => Promise<HistoryResult>
      removeSample: (historyId: string, sampleId: string) => Promise<HistoryResult>
      getWaveform: (request: HistoryAudioFileRequest) => Promise<WaveformResult>
      exportSample: (request: SampleExportRequest) => Promise<SampleExportResult>
      removeHistory: (id: string) => Promise<HistoryResult>
    }
  }
}
