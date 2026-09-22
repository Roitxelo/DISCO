import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { getFfmpegPath } from './ytDlp'
import { SAMPLE_FORMATS } from '../../shared/media'
import type { SampleFormat } from '../../shared/media'

const execFileAsync = promisify(execFile)

async function normalizationGain(
  sourcePath: string,
  startSeconds: number,
  duration: number
): Promise<number> {
  try {
    const { stderr } = await execFileAsync(
      getFfmpegPath(),
      [
        '-hide_banner',
        '-nostats',
        '-ss',
        startSeconds.toFixed(3),
        '-t',
        duration.toFixed(3),
        '-i',
        sourcePath,
        '-af',
        'volumedetect',
        '-f',
        'null',
        '-'
      ],
      { timeout: 10 * 60_000, maxBuffer: 8 * 1024 * 1024, windowsHide: true }
    )
    const match = /max_volume:\s*(-?[\d.]+) dB/.exec(stderr)
    if (!match) return 0
    return Math.max(-30, Math.min(60, -1 - Number(match[1])))
  } catch {
    throw new Error('No se pudo medir el pico del fragmento para normalizarlo.')
  }
}

export async function exportSample(
  sourcePath: string,
  destinationPath: string,
  startSeconds: number,
  endSeconds: number,
  format: SampleFormat,
  normalizePeak: boolean
): Promise<void> {
  if (!SAMPLE_FORMATS.includes(format)) throw new Error('El formato del sample no es válido.')
  if (!Number.isFinite(startSeconds) || !Number.isFinite(endSeconds) || startSeconds < 0) {
    throw new Error('La selección del sample no es válida.')
  }

  const duration = endSeconds - startSeconds
  if (duration < 0.05) throw new Error('Selecciona un fragmento de al menos 0,05 segundos.')
  const fadeDuration = Math.min(0.01, duration / 4)
  const fadeOutStart = Math.max(0, duration - fadeDuration)
  const gain = normalizePeak ? await normalizationGain(sourcePath, startSeconds, duration) : 0
  const filters = [
    ...(normalizePeak ? [`volume=${gain.toFixed(2)}dB`] : []),
    `afade=t=in:st=0:d=${fadeDuration}`,
    `afade=t=out:st=${fadeOutStart}:d=${fadeDuration}`
  ].join(',')
  const codecArguments: Record<SampleFormat, string[]> = {
    wav: ['-c:a', 'pcm_s16le'],
    mp3: ['-c:a', 'libmp3lame', '-b:a', '320k'],
    flac: ['-c:a', 'flac', '-compression_level', '8']
  }

  await execFileAsync(
    getFfmpegPath(),
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',
      '-ss',
      startSeconds.toFixed(3),
      '-i',
      sourcePath,
      '-t',
      duration.toFixed(3),
      '-af',
      `asetpts=PTS-STARTPTS,${filters}`,
      ...codecArguments[format],
      destinationPath
    ],
    { timeout: 10 * 60_000, maxBuffer: 8 * 1024 * 1024, windowsHide: true }
  )
}
