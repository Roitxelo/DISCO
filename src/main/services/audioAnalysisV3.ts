import Meyda from 'meyda'
import { stat } from 'node:fs/promises'
import { ANALYSIS_SAMPLE_RATE, decodeAudio } from './audioAnalysis'
import type {
  AudioAnalysis,
  BpmCandidateDiagnostic,
  KeyCandidateDiagnostic
} from '../../shared/media'

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const CAMELOT_MAJOR = ['8B', '3B', '10B', '5B', '12B', '7B', '2B', '9B', '4B', '11B', '6B', '1B']
const CAMELOT_MINOR = ['5A', '12A', '7A', '2A', '9A', '4A', '11A', '6A', '1A', '8A', '3A', '10A']
const KRUMHANSL_MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]
const KRUMHANSL_MINOR = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17]
const TEMPERLEY_MAJOR = [5, 2, 3.5, 2, 4.5, 4, 2, 4.5, 2, 3.5, 1.5, 4]
const TEMPERLEY_MINOR = [5, 2, 3.5, 4.5, 2, 4, 2, 4.5, 3.5, 2, 1.5, 4]

function clamp(value: number, minimum = 0, maximum = 1): number {
  return Math.max(minimum, Math.min(maximum, value))
}

function mean(values: number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
}

function median(values: number[]): number {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

function correlation(values: number[], lag: number, start = lag, end = values.length): number {
  let product = 0
  let leftEnergy = 0
  let rightEnergy = 0
  for (let index = Math.max(start, lag); index < Math.min(end, values.length); index += 1) {
    const left = values[index]
    const right = values[index - lag]
    product += left * right
    leftEnergy += left * left
    rightEnergy += right * right
  }
  return product / Math.sqrt(leftEnergy * rightEnergy + 1e-12)
}

function normalizeEnvelope(values: number[]): number[] {
  const floor = median(values)
  const deviations = values.map((value) => Math.abs(value - floor))
  const scale = Math.max(median(deviations) * 2.5, 1e-9)
  const normalized = values.map((value) => clamp((value - floor) / scale, 0, 4))
  const result = Array<number>(normalized.length).fill(0)
  const radius = 8
  let localSum = 0
  for (let index = 0; index < normalized.length; index += 1) {
    localSum += normalized[index]
    if (index - radius >= 0) localSum -= normalized[index - radius]
    const localMean = localSum / Math.min(radius, index + 1)
    result[index] = Math.max(0, normalized[index] - localMean * 0.55)
  }
  return result
}

function createOnsetEnvelope(samples: Float32Array): { envelope: number[]; rate: number } {
  const frameSize = 2_048
  const hopSize = 512
  Meyda.sampleRate = ANALYSIS_SAMPLE_RATE
  Meyda.bufferSize = frameSize
  Meyda.windowingFunction = 'hanning'
  const raw: number[] = []
  let previousSpectrum: number[] | null = null
  let previousRms = 0

  for (let start = 0; start + frameSize <= samples.length; start += hopSize) {
    const frame = samples.slice(start, start + frameSize)
    const features = Meyda.extract(['amplitudeSpectrum', 'rms'], frame)
    const spectrum = features?.amplitudeSpectrum
    const rms = features?.rms ?? 0
    if (!spectrum || !previousSpectrum) {
      raw.push(0)
      previousSpectrum = spectrum ? [...spectrum] : null
      previousRms = rms
      continue
    }

    let lowFlux = 0
    let middleFlux = 0
    let highFlux = 0
    let highFrequencyContent = 0
    for (let bin = 1; bin < spectrum.length; bin += 1) {
      const frequency = (bin * ANALYSIS_SAMPLE_RATE) / frameSize
      const difference = Math.max(0, spectrum[bin] - previousSpectrum[bin])
      if (frequency < 180) lowFlux += difference
      else if (frequency < 2_000) middleFlux += difference
      else if (frequency < 8_000) highFlux += difference
      if (frequency > 1_500) highFrequencyContent += difference * Math.sqrt(frequency / 1_500)
    }
    const rmsFlux = Math.max(0, rms - previousRms)
    raw.push(lowFlux * 0.36 + middleFlux * 0.3 + highFlux * 0.2 + highFrequencyContent * 0.04 + rmsFlux * 18)
    previousSpectrum = [...spectrum]
    previousRms = rms
  }
  return { envelope: normalizeEnvelope(raw), rate: ANALYSIS_SAMPLE_RATE / hopSize }
}

function beatGridFit(envelope: number[], period: number): number {
  const roundedPeriod = Math.max(2, Math.round(period))
  let best = 0
  const total = envelope.reduce((sum, value) => sum + value, 0) + 1e-9
  for (let phase = 0; phase < roundedPeriod; phase += 1) {
    let score = 0
    let beats = 0
    for (let index = phase; index < envelope.length; index += roundedPeriod) {
      score += envelope[index] + (envelope[index - 1] ?? 0) * 0.55 + (envelope[index + 1] ?? 0) * 0.55
      beats += 1
    }
    best = Math.max(best, score / Math.max(1, beats))
  }
  return clamp(best / Math.max(total / envelope.length, 1e-9) / 3)
}

function segmentAgreement(envelope: number[], lag: number, rate: number): number {
  const segmentLength = Math.max(lag * 4, Math.round(rate * 24))
  const scores: number[] = []
  for (let start = 0; start + segmentLength <= envelope.length; start += segmentLength) {
    scores.push(Math.max(0, correlation(envelope, lag, start + lag, start + segmentLength)))
  }
  if (!scores.length) return Math.max(0, correlation(envelope, lag))
  const positive = scores.filter((score) => score >= 0.08).length / scores.length
  return clamp(mean(scores) * 0.65 + positive * 0.35)
}

function estimateBpmV3(samples: Float32Array): Pick<AudioAnalysis, 'bpm' | 'bpmConfidence' | 'bpmAlternatives'> & { diagnostics: BpmCandidateDiagnostic[] } {
  const { envelope, rate } = createOnsetEnvelope(samples)
  const minimumBpm = 55
  const maximumBpm = 210
  const minimumLag = Math.floor((60 * rate) / maximumBpm)
  const maximumLag = Math.ceil((60 * rate) / minimumBpm)
  const rawCandidates: Array<{ bpm: number; lag: number; periodicity: number }> = []

  for (let lag = minimumLag; lag <= maximumLag; lag += 1) {
    const score = Math.max(0, correlation(envelope, lag))
    const previous = Math.max(0, correlation(envelope, lag - 1))
    const next = Math.max(0, correlation(envelope, lag + 1))
    if (score < previous || score < next) continue
    const denominator = previous - 2 * score + next
    const offset = Math.abs(denominator) > 1e-9 ? 0.5 * (previous - next) / denominator : 0
    const refinedLag = lag + clamp(offset, -0.5, 0.5)
    rawCandidates.push({
      bpm: Math.round(((60 * rate) / refinedLag) * 10) / 10,
      lag: refinedLag,
      periodicity: score
    })
  }

  rawCandidates.sort((a, b) => b.periodicity - a.periodicity)
  const unique = rawCandidates.filter((candidate, index, all) =>
    all.findIndex((other) => Math.abs(other.bpm - candidate.bpm) < 1.5) === index
  ).slice(0, 14)

  const diagnostics = unique.map((candidate): BpmCandidateDiagnostic => {
    const relatedRatios = [0.5, 2, 2 / 3, 1.5, 0.75, 4 / 3]
    const related = unique.filter((other) => relatedRatios.some((ratio) => Math.abs(other.bpm - candidate.bpm * ratio) < 2))
    const familySupport = clamp(candidate.periodicity + related.reduce((sum, item) => sum + item.periodicity, 0) * 0.22)
    const beatFit = beatGridFit(envelope, candidate.lag)
    const agreement = segmentAgreement(envelope, Math.round(candidate.lag), rate)
    const finalScore = candidate.periodicity * 0.34 + beatFit * 0.29 + agreement * 0.27 + familySupport * 0.1
    return {
      bpm: candidate.bpm,
      periodicity: candidate.periodicity,
      beatFit,
      segmentAgreement: agreement,
      familySupport,
      finalScore
    }
  }).sort((a, b) => b.finalScore - a.finalScore)

  const selected: BpmCandidateDiagnostic[] = []
  for (const candidate of diagnostics) {
    if (!selected.some((other) => Math.abs(other.bpm - candidate.bpm) < 2)) selected.push(candidate)
    if (selected.length === 4) break
  }
  const best = selected[0] ?? { bpm: 120, finalScore: 0, periodicity: 0, beatFit: 0, segmentAgreement: 0, familySupport: 0 }
  const second = selected[1]
  const margin = second ? clamp((best.finalScore - second.finalScore) / Math.max(best.finalScore, 0.05)) : 1
  const confidence = Math.round(100 * clamp(margin * 0.45 + best.segmentAgreement * 0.3 + best.beatFit * 0.25))
  return {
    bpm: best.bpm,
    bpmConfidence: confidence,
    bpmAlternatives: selected.slice(1, 4).map((candidate) => candidate.bpm),
    diagnostics: diagnostics.slice(0, 8)
  }
}

function pearson(values: number[], profile: number[], tonic: number): number {
  const rotated = values.map((_, index) => profile[(index - tonic + 12) % 12])
  const valuesMean = mean(values)
  const profileMean = mean(rotated)
  let numerator = 0
  let valuesEnergy = 0
  let profileEnergy = 0
  for (let index = 0; index < 12; index += 1) {
    const a = values[index] - valuesMean
    const b = rotated[index] - profileMean
    numerator += a * b
    valuesEnergy += a * a
    profileEnergy += b * b
  }
  return numerator / Math.sqrt(valuesEnergy * profileEnergy + 1e-12)
}

function normalizeChroma(chroma: number[]): number[] {
  const sum = chroma.reduce((total, value) => total + value, 0)
  return sum > 0 ? chroma.map((value) => value / sum) : chroma
}

function estimateTuning(peaks: Array<{ frequency: number; weight: number }>): number {
  let x = 0
  let y = 0
  for (const peak of peaks) {
    const midi = 69 + 12 * Math.log2(peak.frequency / 440)
    const cents = (midi - Math.round(midi)) * 100
    const angle = (cents / 100) * Math.PI * 2
    x += Math.cos(angle) * peak.weight
    y += Math.sin(angle) * peak.weight
  }
  const cents = (Math.atan2(y, x) / (Math.PI * 2)) * 100
  return Math.round(clamp(cents, -50, 50) * 10) / 10
}

function createSegmentChromas(samples: Float32Array): { segments: number[][]; accumulated: number[]; tuningCents: number } {
  const frameSize = 8_192
  const hopSize = 8_192
  Meyda.sampleRate = ANALYSIS_SAMPLE_RATE
  Meyda.bufferSize = frameSize
  Meyda.windowingFunction = 'hanning'
  const frames: Array<{ segment: number; peaks: Array<{ frequency: number; weight: number }> }> = []
  const tuningPeaks: Array<{ frequency: number; weight: number }> = []

  for (let start = 0; start + frameSize <= samples.length; start += hopSize) {
    const frame = samples.slice(start, start + frameSize)
    const features = Meyda.extract(['amplitudeSpectrum', 'rms'], frame)
    const spectrum = features?.amplitudeSpectrum
    if (!spectrum || (features?.rms ?? 0) < 0.004) continue
    const maximum = Math.max(...spectrum, 1e-12)
    const peaks: Array<{ frequency: number; weight: number }> = []
    for (let bin = 2; bin < spectrum.length - 1; bin += 1) {
      const frequency = (bin * ANALYSIS_SAMPLE_RATE) / frameSize
      if (frequency < 55 || frequency > 5_000) continue
      const amplitude = spectrum[bin]
      if (amplitude < maximum * 0.04 || amplitude < spectrum[bin - 1] || amplitude < spectrum[bin + 1]) continue
      const weight = Math.sqrt(amplitude / maximum) / Math.sqrt(Math.max(1, frequency / 220))
      peaks.push({ frequency, weight })
      tuningPeaks.push({ frequency, weight })
    }
    if (peaks.length) frames.push({ segment: Math.floor(start / (ANALYSIS_SAMPLE_RATE * 15)), peaks })
  }

  const tuningCents = estimateTuning(tuningPeaks)
  const segmentMap = new Map<number, number[]>()
  for (const frame of frames) {
    const chroma = segmentMap.get(frame.segment) ?? Array<number>(12).fill(0)
    for (const peak of frame.peaks) {
      const midi = 69 + 12 * Math.log2(peak.frequency / 440) - tuningCents / 100
      const position = ((midi % 12) + 12) % 12
      for (let note = 0; note < 12; note += 1) {
        const distance = Math.min(Math.abs(position - note), 12 - Math.abs(position - note))
        if (distance <= 1) chroma[note] += peak.weight * (0.5 + 0.5 * Math.cos(Math.PI * distance))
      }
    }
    segmentMap.set(frame.segment, chroma)
  }
  const segments = [...segmentMap.values()].map(normalizeChroma).filter((chroma) => Math.max(...chroma) > 0)
  const accumulated = normalizeChroma(segments.reduce((total, chroma) => total.map((value, index) => value + chroma[index]), Array<number>(12).fill(0)))
  return { segments, accumulated, tuningCents }
}

function estimateKeyV3(samples: Float32Array): Pick<AudioAnalysis, 'key' | 'mode' | 'camelot' | 'keyConfidence' | 'keyAlternatives'> & { diagnostics: KeyCandidateDiagnostic[]; tuningCents: number } {
  const { segments, accumulated, tuningCents } = createSegmentChromas(samples)
  const candidates: KeyCandidateDiagnostic[] = []
  for (let tonic = 0; tonic < 12; tonic += 1) {
    for (const mode of ['major', 'minor'] as const) {
      const profiles = mode === 'major'
        ? [KRUMHANSL_MAJOR, TEMPERLEY_MAJOR]
        : [KRUMHANSL_MINOR, TEMPERLEY_MINOR]
      const globalScore = mean(profiles.map((profile) => pearson(accumulated, profile, tonic)))
      const segmentScores = segments.map((segment) => mean(profiles.map((profile) => pearson(segment, profile, tonic))))
      const segmentWins = segments.filter((segment) => {
        const own = mean(profiles.map((profile) => pearson(segment, profile, tonic)))
        let bestOther = -Infinity
        for (let otherTonic = 0; otherTonic < 12; otherTonic += 1) {
          for (const otherMode of ['major', 'minor'] as const) {
            if (otherTonic === tonic && otherMode === mode) continue
            const otherProfiles = otherMode === 'major' ? [KRUMHANSL_MAJOR, TEMPERLEY_MAJOR] : [KRUMHANSL_MINOR, TEMPERLEY_MINOR]
            bestOther = Math.max(bestOther, mean(otherProfiles.map((profile) => pearson(segment, profile, otherTonic))))
          }
        }
        return own >= bestOther
      }).length
      const segmentVotes = segments.length ? segmentWins / segments.length : 0
      const tonicEvidence = accumulated[tonic] / Math.max(...accumulated, 1e-12)
      const third = mode === 'major' ? (tonic + 4) % 12 : (tonic + 3) % 12
      const fifth = (tonic + 7) % 12
      const oppositeThird = mode === 'major' ? (tonic + 3) % 12 : (tonic + 4) % 12
      const triadEvidence = clamp((accumulated[tonic] + accumulated[third] + accumulated[fifth] - accumulated[oppositeThird] * 0.35) * 2.3)
      const temporalScore = mean(segmentScores)
      const finalScore = globalScore * 0.48 + temporalScore * 0.24 + segmentVotes * 0.12 + tonicEvidence * 0.1 + triadEvidence * 0.06
      candidates.push({
        key: NOTE_NAMES[tonic],
        mode,
        globalScore,
        segmentVotes,
        tonicEvidence,
        triadEvidence,
        finalScore
      })
    }
  }
  candidates.sort((a, b) => b.finalScore - a.finalScore)
  const best = candidates[0]
  const second = candidates[1]
  const margin = clamp((best.finalScore - second.finalScore) / 0.18)
  const confidence = Math.round(100 * clamp(margin * 0.5 + best.segmentVotes * 0.3 + clamp(best.globalScore) * 0.2))
  const bestTonic = NOTE_NAMES.indexOf(best.key)
  return {
    key: best.key,
    mode: best.mode,
    camelot: best.mode === 'major' ? CAMELOT_MAJOR[bestTonic] : CAMELOT_MINOR[bestTonic],
    keyConfidence: confidence,
    keyAlternatives: candidates.slice(1, 4).map((candidate) => {
      const tonic = NOTE_NAMES.indexOf(candidate.key)
      return {
        key: candidate.key,
        mode: candidate.mode,
        camelot: candidate.mode === 'major' ? CAMELOT_MAJOR[tonic] : CAMELOT_MINOR[tonic]
      }
    }),
    diagnostics: candidates.slice(0, 8),
    tuningCents
  }
}

export async function analyzeAudioV3(filePath: string): Promise<AudioAnalysis> {
  const fileInfo = await stat(filePath).catch(() => null)
  if (!fileInfo?.isFile()) throw new Error('No se encontró el archivo que quieres analizar.')
  const samples = await decodeAudio(filePath)
  if (samples.length < ANALYSIS_SAMPLE_RATE * 5) throw new Error('El audio es demasiado corto para analizarlo.')
  const bpm = estimateBpmV3(samples)
  const key = estimateKeyV3(samples)
  return {
    bpm: bpm.bpm,
    bpmConfidence: bpm.bpmConfidence,
    bpmAlternatives: bpm.bpmAlternatives,
    key: key.key,
    mode: key.mode,
    camelot: key.camelot,
    keyConfidence: key.keyConfidence,
    keyAlternatives: key.keyAlternatives,
    algorithmVersion: 3,
    diagnostics: {
      analyzedSeconds: Math.round((samples.length / ANALYSIS_SAMPLE_RATE) * 10) / 10,
      tuningCents: key.tuningCents,
      bpmCandidates: bpm.diagnostics,
      keyCandidates: key.diagnostics
    }
  }
}
