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
export const PROJECT_STATUSES = ['new', 'reviewing', 'sampled', 'archived'] as const
export type ProjectStatus = (typeof PROJECT_STATUSES)[number]

export type DownloadRequest = {
  url: string
  directory: string
  format: AudioFormat
}

export type DownloadResult =
  | { ok: true; filePath: string }
  | { ok: false; error: string }

export type DownloadProgress = {
  phase: 'downloading' | 'converting' | 'finalizing'
  percent: number | null
  detail: string
}

export type AudioAnalysis = {
  bpm: number
  bpmConfidence?: number
  bpmAlternatives?: number[]
  key: string
  mode: 'major' | 'minor'
  camelot: string
  keyConfidence: number
  keyAlternatives?: Array<{
    key: string
    mode: 'major' | 'minor'
    camelot: string
  }>
  algorithmVersion?: number
  diagnostics?: AnalysisDiagnostics
}

export type BpmCandidateDiagnostic = {
  bpm: number
  periodicity: number
  beatFit: number
  segmentAgreement: number
  familySupport: number
  finalScore: number
}

export type KeyCandidateDiagnostic = {
  key: string
  mode: 'major' | 'minor'
  globalScore: number
  segmentVotes: number
  tonicEvidence: number
  triadEvidence: number
  finalScore: number
}

export type AnalysisDiagnostics = {
  analyzedSeconds: number
  tuningCents: number
  bpmCandidates: BpmCandidateDiagnostic[]
  keyCandidates: KeyCandidateDiagnostic[]
}

export type AnalysisComparisonCase = {
  historyId: string
  title: string
  reference: AudioAnalysis
  v2: AudioAnalysis
  v3: AudioAnalysis
}

export type AnalysisComparisonSummary = {
  reviewed: number
  bpmV2Hits: number
  bpmV3Hits: number
  keyV2Hits: number
  keyV3Hits: number
  bpmV2CandidateHits: number
  bpmV3CandidateHits: number
  keyV2CandidateHits: number
  keyV3CandidateHits: number
}

export type AnalysisComparisonResult =
  | { ok: true; cases: AnalysisComparisonCase[]; summary: AnalysisComparisonSummary; reportPath: string }
  | { ok: false; error: string }

export type AnalysisComparisonProgress = {
  completed: number
  total: number
  title: string
}

export type LocalImportProgress = {
  completed: number
  total: number
  title: string
}

export type LocalImportResult =
  | { ok: true; entries: HistoryEntry[]; importedIds: string[]; failed: Array<{ fileName: string; error: string }> }
  | { ok: false; error: string }

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
    name: string
    filePath: string
    format: SampleFormat
    startSeconds: number
    endSeconds: number
    normalizePeak: boolean
    createdAt: string
  }>
  favorite: boolean
  tags: string[]
  projectStatus: ProjectStatus
}

export type HistorySaveRequest = Omit<
  HistoryEntry,
  'id' | 'createdAt' | 'detectedAnalysis' | 'analysisReview' | 'reviewedAt' | 'audioFiles' | 'samples' | 'favorite' | 'tags' | 'projectStatus'
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
  sampleId?: string
  sampleName?: string
  startSeconds: number
  endSeconds: number
  format: SampleFormat
  normalizePeak: boolean
}

export type SampleRenameRequest = {
  historyId: string
  sampleId: string
  name: string
}

export type HistoryAudioFileRequest = {
  historyId: string
  format: AudioFormat
}

export type HistoryOrganizationUpdate = {
  historyId: string
  favorite?: boolean
  tags?: string[]
  projectStatus?: ProjectStatus
}

export type HistoryAvailabilityResult =
  | {
      ok: true
      audioFiles: Record<string, boolean>
      samples: Record<string, boolean>
    }
  | { ok: false; error: string }

export type HistoryRelinkRequest = {
  historyId: string
  format?: AudioFormat
  sampleId?: string
}

export type SampleExportResult =
  | { ok: true; filePath: string | null }
  | { ok: false; error: string }
