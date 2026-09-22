export type MediaInfo = {
  id: string
  title: string
  channel: string
  durationSeconds: number
  thumbnailUrl: string | null
  sourceUrl: string
}

export type AnalyzeResult =
  | { ok: true; media: MediaInfo }
  | { ok: false; error: string }

export const AUDIO_FORMATS = ['wav', 'mp3', 'flac', 'm4a'] as const
export type AudioFormat = (typeof AUDIO_FORMATS)[number]

export type DownloadRequest = {
  url: string
  directory: string
  format: AudioFormat
}

export type DownloadResult =
  | { ok: true; filePath: string }
  | { ok: false; error: string }

export type AudioAnalysis = {
  bpm: number
  key: string
  mode: 'major' | 'minor'
  camelot: string
  keyConfidence: number
}

export type AudioAnalysisResult =
  | { ok: true; analysis: AudioAnalysis }
  | { ok: false; error: string }

export type HistoryEntry = {
  id: string
  createdAt: string
  media: MediaInfo
  format: AudioFormat
  filePath: string
  analysis: AudioAnalysis | null
  detectedAnalysis: AudioAnalysis | null
  analysisReview: 'pending' | 'confirmed' | 'corrected'
  reviewedAt: string | null
  audioFiles: Array<{
    format: AudioFormat
    filePath: string
    createdAt: string
  }>
  samples: Array<{
    id: string
    filePath: string
    format: SampleFormat
    startSeconds: number
    endSeconds: number
    normalizePeak: boolean
    createdAt: string
  }>
}

export type HistorySaveRequest = Omit<
  HistoryEntry,
  'id' | 'createdAt' | 'detectedAnalysis' | 'analysisReview' | 'reviewedAt' | 'audioFiles' | 'samples'
>

export type HistoryAnalysisUpdate = {
  filePath: string
  analysis: AudioAnalysis
  review: 'confirmed' | 'corrected'
}

export type HistoryResult =
  | { ok: true; entries: HistoryEntry[] }
  | { ok: false; error: string }

export type AudioSourceResult =
  | { ok: true; url: string }
  | { ok: false; error: string }

export type WaveformResult =
  | { ok: true; imageUrl: string }
  | { ok: false; error: string }

export const SAMPLE_FORMATS = ['wav', 'mp3', 'flac'] as const
export type SampleFormat = (typeof SAMPLE_FORMATS)[number]

export type SampleExportRequest = {
  historyId: string
  startSeconds: number
  endSeconds: number
  format: SampleFormat
  normalizePeak: boolean
}

export type SampleExportResult =
  | { ok: true; filePath: string | null }
  | { ok: false; error: string }
