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
  bpmCandidateAccuracy: number
  keyCandidateAccuracy: number
  halfDoubleErrors: number
  relativeKeyErrors: number
  lowConfidenceReviews: number
  legacy: { reviewed: number; bpmAccuracy: number; fullKeyAccuracy: number }
  current: { reviewed: number; bpmAccuracy: number; fullKeyAccuracy: number }
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

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
  let bpmCandidateHits = 0
  let keyCandidateHits = 0
  let halfDoubleErrors = 0
  let relativeKeyErrors = 0
  let lowConfidenceReviews = 0
  const versions = {
    legacy: { reviewed: 0, bpmHits: 0, fullKeyHits: 0 },
    current: { reviewed: 0, bpmHits: 0, fullKeyHits: 0 }
  }

  for (const entry of reviewed) {
    const detected = entry.detectedAnalysis!
    const expected = entry.analysis!
    const bpmHit = Math.abs(detected.bpm - expected.bpm) <= 1
    const fullKeyHit = detected.key === expected.key && detected.mode === expected.mode
    if (bpmHit) bpmHits += 1
    else {
      const ratio = detected.bpm / expected.bpm
      if (Math.abs(ratio - 2) <= 0.05 || Math.abs(ratio - 0.5) <= 0.05) halfDoubleErrors += 1
    }
    if (bpmHit || detected.bpmAlternatives?.some((candidate) => Math.abs(candidate - expected.bpm) <= 1)) bpmCandidateHits += 1
    if (detected.key === expected.key) tonicHits += 1
    if (detected.mode === expected.mode) modeHits += 1
    if (fullKeyHit) fullKeyHits += 1
    if (fullKeyHit || detected.keyAlternatives?.some((candidate) => candidate.key === expected.key && candidate.mode === expected.mode)) keyCandidateHits += 1
    const detectedTonic = NOTE_NAMES.indexOf(detected.key)
    const expectedTonic = NOTE_NAMES.indexOf(expected.key)
    const isRelative = detected.mode !== expected.mode && (
      (detected.mode === 'major' && (detectedTonic + 9) % 12 === expectedTonic) ||
      (detected.mode === 'minor' && (detectedTonic + 3) % 12 === expectedTonic)
    )
    if (isRelative) relativeKeyErrors += 1
    if ((detected.bpmConfidence ?? 100) < 35 || detected.keyConfidence < 35) lowConfidenceReviews += 1
    const version = (detected.algorithmVersion ?? 1) >= 2 ? versions.current : versions.legacy
    version.reviewed += 1
    if (bpmHit) version.bpmHits += 1
    if (fullKeyHit) version.fullKeyHits += 1
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
    bpmCandidateAccuracy: percentage(bpmCandidateHits, reviewed.length),
    keyCandidateAccuracy: percentage(keyCandidateHits, reviewed.length),
    halfDoubleErrors,
    relativeKeyErrors,
    lowConfidenceReviews,
    legacy: {
      reviewed: versions.legacy.reviewed,
      bpmAccuracy: percentage(versions.legacy.bpmHits, versions.legacy.reviewed),
      fullKeyAccuracy: percentage(versions.legacy.fullKeyHits, versions.legacy.reviewed)
    },
    current: {
      reviewed: versions.current.reviewed,
      bpmAccuracy: percentage(versions.current.bpmHits, versions.current.reviewed),
      fullKeyAccuracy: percentage(versions.current.fullKeyHits, versions.current.reviewed)
    }
  }
}
