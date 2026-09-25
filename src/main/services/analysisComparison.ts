import { analyzeAudioV3 } from './audioAnalysisV3'
import { listHistory } from './history'
import type {
  AnalysisComparisonCase,
  AnalysisComparisonProgress,
  AnalysisComparisonSummary,
  AudioAnalysis
} from '../../shared/media'

const BPM_TOLERANCE = 1.6

function bpmHit(candidate: number, reference: number): boolean {
  return Math.abs(candidate - reference) <= BPM_TOLERANCE
}

function bpmCandidateHit(analysis: AudioAnalysis, reference: AudioAnalysis): boolean {
  return bpmHit(analysis.bpm, reference.bpm) || Boolean(
    analysis.bpmAlternatives?.some((candidate) => bpmHit(candidate, reference.bpm))
  )
}

function keyHit(candidate: AudioAnalysis, reference: AudioAnalysis): boolean {
  return candidate.key === reference.key && candidate.mode === reference.mode
}

function keyCandidateHit(analysis: AudioAnalysis, reference: AudioAnalysis): boolean {
  return keyHit(analysis, reference) || Boolean(
    analysis.keyAlternatives?.some((candidate) => candidate.key === reference.key && candidate.mode === reference.mode)
  )
}

export async function compareReviewedHistory(
  onProgress?: (progress: AnalysisComparisonProgress) => void
): Promise<{ cases: AnalysisComparisonCase[]; summary: AnalysisComparisonSummary }> {
  const reviewed = (await listHistory()).filter(
    (entry) => entry.analysisReview !== 'pending' && entry.detectedAnalysis && entry.analysis
  )
  const cases: AnalysisComparisonCase[] = []
  for (let index = 0; index < reviewed.length; index += 1) {
    const entry = reviewed[index]
    onProgress?.({ completed: index, total: reviewed.length, title: entry.media.title })
    const v3 = await analyzeAudioV3(entry.filePath)
    cases.push({
      historyId: entry.id,
      title: entry.media.title,
      reference: entry.analysis!,
      v2: entry.detectedAnalysis!,
      v3
    })
  }
  onProgress?.({ completed: reviewed.length, total: reviewed.length, title: '' })

  const summary: AnalysisComparisonSummary = {
    reviewed: cases.length,
    bpmV2Hits: cases.filter((item) => bpmHit(item.v2.bpm, item.reference.bpm)).length,
    bpmV3Hits: cases.filter((item) => bpmHit(item.v3.bpm, item.reference.bpm)).length,
    keyV2Hits: cases.filter((item) => keyHit(item.v2, item.reference)).length,
    keyV3Hits: cases.filter((item) => keyHit(item.v3, item.reference)).length,
    bpmV2CandidateHits: cases.filter((item) => bpmCandidateHit(item.v2, item.reference)).length,
    bpmV3CandidateHits: cases.filter((item) => bpmCandidateHit(item.v3, item.reference)).length,
    keyV2CandidateHits: cases.filter((item) => keyCandidateHit(item.v2, item.reference)).length,
    keyV3CandidateHits: cases.filter((item) => keyCandidateHit(item.v3, item.reference)).length
  }
  return { cases, summary }
}
