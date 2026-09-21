import { execFile } from 'node:child_process'
import { stat } from 'node:fs/promises'
import Meyda from 'meyda'
import { getFfmpegPath } from './ytDlp'
import type { AudioAnalysis } from '../../shared/media'

const SAMPLE_RATE = 22_050
const FRAME_SIZE = 4_096
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17]
const CAMELOT_MAJOR = ['8B', '3B', '10B', '5B', '12B', '7B', '2B', '9B', '4B', '11B', '6B', '1B']
const CAMELOT_MINOR = ['5A', '12A', '7A', '2A', '9A', '4A', '11A', '6A', '1A', '8A', '3A', '10A']

function decodeAudio(filePath: string): Promise<Float32Array> {
  return new Promise((resolve, reject) => {
    execFile(
      getFfmpegPath(),
      [
        '-hide_banner',
        '-loglevel',
        'error',
        '-i',
        filePath,
        '-t',
        '180',
        '-ac',
        '1',
        '-ar',
        String(SAMPLE_RATE),
        '-f',
        'f32le',
        'pipe:1'
      ],
      { encoding: 'buffer', maxBuffer: 32 * 1024 * 1024, windowsHide: true, timeout: 5 * 60_000 },
      (error, stdout) => {
        if (error) reject(new Error('No se pudo preparar el audio para analizarlo.'))
        else resolve(new Float32Array(stdout.buffer, stdout.byteOffset, Math.floor(stdout.byteLength / 4)))
      }
    )
  })
}

function correlation(values: number[], lag: number): number {
  let product = 0
  let leftEnergy = 0
  let rightEnergy = 0
  for (let index = lag; index < values.length; index += 1) {
    const left = values[index]
    const right = values[index - lag]
    product += left * right
    leftEnergy += left * left
    rightEnergy += right * right
  }
  return product / Math.sqrt(leftEnergy * rightEnergy + 1e-12)
}

function estimateBpm(samples: Float32Array): number {
  const hopSize = 256
  const envelope: number[] = []
  let previousEnergy = 0

  for (let start = 0; start + 1_024 <= samples.length; start += hopSize) {
    let energy = 0
    for (let index = start; index < start + 1_024; index += 1) energy += samples[index] ** 2
    energy = Math.sqrt(energy / 1_024)
    envelope.push(Math.max(0, energy - previousEnergy))
    previousEnergy = energy
  }

  const mean = envelope.reduce((sum, value) => sum + value, 0) / Math.max(1, envelope.length)
  const centered = envelope.map((value) => Math.max(0, value - mean * 0.65))
  const envelopeRate = SAMPLE_RATE / hopSize
  let bestLag = Math.round((60 * envelopeRate) / 120)
  let bestScore = Number.NEGATIVE_INFINITY

  const minimumLag = Math.floor((60 * envelopeRate) / 190)
  const maximumLag = Math.ceil((60 * envelopeRate) / 65)
  const scores = new Map<number, number>()
  for (let lag = minimumLag; lag <= maximumLag; lag += 1) {
    const score = correlation(centered, lag) + correlation(centered, lag * 2) * 0.35
    scores.set(lag, score)
    if (score > bestScore) {
      bestScore = score
      bestLag = lag
    }
  }

  const previous = scores.get(bestLag - 1) ?? bestScore
  const next = scores.get(bestLag + 1) ?? bestScore
  const denominator = previous - 2 * bestScore + next
  const offset = Math.abs(denominator) > 1e-9 ? 0.5 * (previous - next) / denominator : 0
  const refinedLag = bestLag + Math.max(-0.5, Math.min(0.5, offset))
  return Math.round(((60 * envelopeRate) / refinedLag) * 10) / 10
}

function pearson(values: number[], profile: number[], tonic: number): number {
  const rotated = values.map((_, index) => profile[(index - tonic + 12) % 12])
  const valuesMean = values.reduce((sum, value) => sum + value, 0) / 12
  const profileMean = rotated.reduce((sum, value) => sum + value, 0) / 12
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

function estimateKey(samples: Float32Array): Pick<AudioAnalysis, 'key' | 'mode' | 'camelot' | 'keyConfidence'> {
  Meyda.sampleRate = SAMPLE_RATE
  Meyda.bufferSize = FRAME_SIZE
  Meyda.windowingFunction = 'hanning'
  const accumulated = Array<number>(12).fill(0)

  for (let start = 0; start + FRAME_SIZE <= samples.length; start += FRAME_SIZE * 4) {
    const frame = samples.slice(start, start + FRAME_SIZE)
    const features = Meyda.extract(['chroma', 'rms'], frame)
    if (!features?.chroma || !features.rms || features.rms < 0.005) continue
    for (let note = 0; note < 12; note += 1) accumulated[note] += features.chroma[note] * features.rms
  }

  const candidates: Array<{ tonic: number; mode: 'major' | 'minor'; score: number }> = []
  for (let tonic = 0; tonic < 12; tonic += 1) {
    const maximumChroma = Math.max(...accumulated, 1e-12)
    const rootEvidence = accumulated[tonic] / maximumChroma
    const majorThirdEvidence = accumulated[(tonic + 4) % 12] / maximumChroma
    const minorThirdEvidence = accumulated[(tonic + 3) % 12] / maximumChroma
    const fifthEvidence = accumulated[(tonic + 7) % 12] / maximumChroma
    candidates.push({
      tonic,
      mode: 'major',
      score: pearson(accumulated, MAJOR_PROFILE, tonic) + rootEvidence * 0.18 + majorThirdEvidence * 0.05 + fifthEvidence * 0.04
    })
    candidates.push({
      tonic,
      mode: 'minor',
      score: pearson(accumulated, MINOR_PROFILE, tonic) + rootEvidence * 0.18 + minorThirdEvidence * 0.05 + fifthEvidence * 0.04
    })
  }
  candidates.sort((a, b) => b.score - a.score)
  const best = candidates[0]
  const second = candidates[1]
  const confidence = Math.max(0, Math.min(100, ((best.score - second.score) / 0.25) * 100))

  return {
    key: NOTE_NAMES[best.tonic],
    mode: best.mode,
    camelot: best.mode === 'major' ? CAMELOT_MAJOR[best.tonic] : CAMELOT_MINOR[best.tonic],
    keyConfidence: Math.round(confidence)
  }
}

export async function analyzeAudio(filePath: string): Promise<AudioAnalysis> {
  const fileInfo = await stat(filePath).catch(() => null)
  if (!fileInfo?.isFile()) throw new Error('No se encontró el archivo que quieres analizar.')

  const samples = await decodeAudio(filePath)
  if (samples.length < SAMPLE_RATE * 5) throw new Error('El audio es demasiado corto para analizarlo.')

  return {
    bpm: estimateBpm(samples),
    ...estimateKey(samples)
  }
}
