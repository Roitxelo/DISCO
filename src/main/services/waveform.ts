import { execFile } from 'node:child_process'
import { stat } from 'node:fs/promises'
import { getFfmpegPath } from './ytDlp'

export async function generateWaveform(filePath: string): Promise<string> {
  const file = await stat(filePath).catch(() => null)
  if (!file?.isFile()) throw new Error('No se encuentra el archivo de audio.')

  return new Promise((resolve, reject) => {
    execFile(
      getFfmpegPath(),
      [
        '-hide_banner',
        '-loglevel',
        'error',
        '-i',
        filePath,
        '-filter_complex',
        '[0:a]aformat=channel_layouts=mono,showwavespic=s=1600x240:colors=0xff6335[v]',
        '-map',
        '[v]',
        '-frames:v',
        '1',
        '-f',
        'image2pipe',
        '-vcodec',
        'png',
        'pipe:1'
      ],
      { encoding: 'buffer', maxBuffer: 16 * 1024 * 1024, windowsHide: true, timeout: 2 * 60_000 },
      (error, stdout) => {
        if (error || !stdout.length) reject(new Error('No se pudo generar la forma de onda.'))
        else resolve(`data:image/png;base64,${stdout.toString('base64')}`)
      }
    )
  })
}
