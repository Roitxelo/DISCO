import { createHash } from 'node:crypto'
import { execFile } from 'node:child_process'
import { basename, extname, resolve } from 'node:path'
import { stat } from 'node:fs/promises'
import { AUDIO_FORMATS } from '../../shared/media'
import { analyzeAudio } from './audioAnalysis'
import { getFfmpegPath } from './ytDlp'
import { listHistory, saveHistoryEntry } from './history'
import type { AudioFormat, LocalImportProgress } from '../../shared/media'

function probeDuration(filePath: string): Promise<number> {
  return new Promise((resolveDuration) => {
    execFile(
      getFfmpegPath(),
      ['-hide_banner', '-i', filePath],
      { encoding: 'utf8', windowsHide: true, timeout: 30_000, maxBuffer: 2 * 1024 * 1024 },
      (_error, _stdout, stderr) => {
        const match = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(stderr)
        if (!match) return resolveDuration(0)
        resolveDuration(Math.round(Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3])))
      }
    )
  })
}

function localMediaId(filePath: string): string {
  return `local-${createHash('sha256').update(resolve(filePath).toLowerCase()).digest('hex').slice(0, 24)}`
}

export async function importLocalAudio(
  filePaths: string[],
  onProgress?: (progress: LocalImportProgress) => void
): Promise<{ entries: Awaited<ReturnType<typeof listHistory>>; importedIds: string[]; failed: Array<{ fileName: string; error: string }> }> {
  const importedIds: string[] = []
  const failed: Array<{ fileName: string; error: string }> = []
  for (let index = 0; index < filePaths.length; index += 1) {
    const filePath = filePaths[index]
    const fileName = basename(filePath)
    onProgress?.({ completed: index, total: filePaths.length, title: fileName })
    try {
      const info = await stat(filePath)
      const format = extname(filePath).slice(1).toLowerCase() as AudioFormat
      if (!info.isFile() || !AUDIO_FORMATS.includes(format)) throw new Error('Formato no compatible.')
      const [analysis, durationSeconds] = await Promise.all([analyzeAudio(filePath), probeDuration(filePath)])
      const mediaId = localMediaId(filePath)
      await saveHistoryEntry({
        media: {
          id: mediaId,
          title: basename(filePath, extname(filePath)),
          channel: 'Archivo local',
          durationSeconds,
          thumbnailUrl: null,
          sourceUrl: ''
        },
        format,
        filePath,
        analysis
      })
      importedIds.push(mediaId)
    } catch (error) {
      failed.push({ fileName, error: error instanceof Error ? error.message : 'No se pudo importar el archivo.' })
    }
  }
  onProgress?.({ completed: filePaths.length, total: filePaths.length, title: '' })
  return { entries: await listHistory(), importedIds, failed }
}
