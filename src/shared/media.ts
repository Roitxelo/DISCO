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

