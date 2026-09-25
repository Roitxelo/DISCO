import { analyzeAudioV3 } from './audioAnalysisV3'
import { listHistory } from './history'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { app } from 'electron'
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
): Promise<{ cases: AnalysisComparisonCase[]; summary: AnalysisComparisonSummary; reportPath: string }> {
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

  const evaluations = cases.map((item) => ({
    historyId: item.historyId,
    bpmV2Hit: bpmHit(item.v2.bpm, item.reference.bpm),
    bpmV3Hit: bpmHit(item.v3.bpm, item.reference.bpm),
    keyV2Hit: keyHit(item.v2, item.reference),
    keyV3Hit: keyHit(item.v3, item.reference),
    bpmV2CandidateHit: bpmCandidateHit(item.v2, item.reference),
    bpmV3CandidateHit: bpmCandidateHit(item.v3, item.reference),
    keyV2CandidateHit: keyCandidateHit(item.v2, item.reference),
    keyV3CandidateHit: keyCandidateHit(item.v3, item.reference)
  }))
  const summary: AnalysisComparisonSummary = {
    reviewed: cases.length,
    bpmV2Hits: evaluations.filter((item) => item.bpmV2Hit).length,
    bpmV3Hits: evaluations.filter((item) => item.bpmV3Hit).length,
    keyV2Hits: evaluations.filter((item) => item.keyV2Hit).length,
    keyV3Hits: evaluations.filter((item) => item.keyV3Hit).length,
    bpmV2CandidateHits: evaluations.filter((item) => item.bpmV2CandidateHit).length,
    bpmV3CandidateHits: evaluations.filter((item) => item.bpmV3CandidateHit).length,
    keyV2CandidateHits: evaluations.filter((item) => item.keyV2CandidateHit).length,
    keyV3CandidateHits: evaluations.filter((item) => item.keyV3CandidateHit).length
  }
  const reportPath = join(app.getPath('userData'), 'analysis-v3-report.json')
  await writeFile(reportPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    algorithmVersion: 3.1,
    bpmTolerance: BPM_TOLERANCE,
    summary,
    evaluations,
    cases
  }, null, 2), 'utf8')
  return { cases, summary, reportPath }
}
