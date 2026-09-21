export {}

import type {
  AnalyzeResult,
  AudioAnalysisResult,
  DownloadRequest,
  DownloadResult
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
    }
  }
}
