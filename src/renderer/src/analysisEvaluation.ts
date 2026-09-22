import type { HistoryEntry } from '../../shared/media'

export type EvaluationSummary = {
  reviewed: number
  pending: number
  confirmed: number
  corrected: number
  bpmAccuracy: number
  tonicAccuracy: number
  modeAccuracy: number
  fullKeyAccuracy: number
  halfDoubleErrors: number
}

function percentage(hits: number, total: number): number {
  return total ? Math.round((hits / total) * 100) : 0
}

export function evaluateAnalysis(entries: HistoryEntry[]): EvaluationSummary {
  const reviewed = entries.filter(
    (entry) => entry.analysisReview !== 'pending' && entry.detectedAnalysis && entry.analysis
  )
  let bpmHits = 0
  let tonicHits = 0
  let modeHits = 0
  let fullKeyHits = 0
  let halfDoubleErrors = 0

  for (const entry of reviewed) {
    const detected = entry.detectedAnalysis!
    const expected = entry.analysis!
    if (Math.abs(detected.bpm - expected.bpm) <= 1) bpmHits += 1
    else {
      const ratio = detected.bpm / expected.bpm
      if (Math.abs(ratio - 2) <= 0.05 || Math.abs(ratio - 0.5) <= 0.05) halfDoubleErrors += 1
    }
    if (detected.key === expected.key) tonicHits += 1
    if (detected.mode === expected.mode) modeHits += 1
    if (detected.key === expected.key && detected.mode === expected.mode) fullKeyHits += 1
  }

  return {
    reviewed: reviewed.length,
    pending: entries.filter((entry) => entry.analysis && entry.analysisReview === 'pending').length,
    confirmed: reviewed.filter((entry) => entry.analysisReview === 'confirmed').length,
    corrected: reviewed.filter((entry) => entry.analysisReview === 'corrected').length,
    bpmAccuracy: percentage(bpmHits, reviewed.length),
    tonicAccuracy: percentage(tonicHits, reviewed.length),
    modeAccuracy: percentage(modeHits, reviewed.length),
    fullKeyAccuracy: percentage(fullKeyHits, reviewed.length),
    halfDoubleErrors
  }
}
