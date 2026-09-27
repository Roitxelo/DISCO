import { createHash } from 'node:crypto'
import { createWriteStream } from 'node:fs'
import { access, chmod, mkdir, readFile, readdir, rename, rm, stat } from 'node:fs/promises'
import { arch, platform } from 'node:os'
import { extname, isAbsolute, join, resolve } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { execFile, spawn } from 'node:child_process'
import { promisify } from 'node:util'
import { app } from 'electron'
import ffmpegPath from 'ffmpeg-static'
import { AUDIO_FORMATS } from '../../shared/media'
import type { AudioFormat, DownloadProgress, MediaInfo } from '../../shared/media'

const execFileAsync = promisify(execFile)
const RELEASE_URL = 'https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest'
let binaryPromise: Promise<string> | null = null

type GithubAsset = {
  name: string
  browser_download_url: string
  digest: string | null
}

type GithubRelease = {
  assets: GithubAsset[]
}

type YtDlpInfo = {
  id?: string
  title?: string
  channel?: string
  uploader?: string
  duration?: number
  thumbnail?: string
  webpage_url?: string
}

function assetName(): string {
  if (platform() === 'win32') return 'yt-dlp.exe'
  if (platform() === 'darwin') return 'yt-dlp_macos'
  if (platform() === 'linux' && arch() === 'arm64') return 'yt-dlp_linux_aarch64'
  if (platform() === 'linux') return 'yt-dlp_linux'
  throw new Error('DISCO todavía no es compatible con este sistema operativo.')
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

async function sha256(path: string): Promise<string> {
  const buffer = await readFile(path)
  return createHash('sha256').update(buffer).digest('hex')
}

async function downloadBinary(targetPath: string): Promise<void> {
  const releaseResponse = await fetch(RELEASE_URL, {
    headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'DISCO-desktop' }
  })

  if (!releaseResponse.ok) {
    throw new Error('No se pudo consultar la versión de yt-dlp.')
  }

  const release = (await releaseResponse.json()) as GithubRelease
  const asset = release.assets.find((candidate) => candidate.name === assetName())
  if (!asset?.digest?.startsWith('sha256:')) {
    throw new Error('No se encontró un binario verificable de yt-dlp para este equipo.')
  }

  const assetUrl = new URL(asset.browser_download_url)
  if (assetUrl.protocol !== 'https:' || assetUrl.hostname !== 'github.com') {
    throw new Error('La URL del binario de yt-dlp no es de confianza.')
  }

  const binaryResponse = await fetch(assetUrl, {
    headers: { 'User-Agent': 'DISCO-desktop' }
  })
  if (!binaryResponse.ok || !binaryResponse.body) {
    throw new Error('No se pudo descargar el componente de análisis.')
  }

  const temporaryPath = `${targetPath}.download`
  await rm(temporaryPath, { force: true })

  try {
    await pipeline(
      Readable.fromWeb(binaryResponse.body as import('node:stream/web').ReadableStream),
      createWriteStream(temporaryPath, { mode: 0o755 })
    )

    const expectedHash = asset.digest.slice('sha256:'.length).toLowerCase()
    const actualHash = await sha256(temporaryPath)
    if (actualHash !== expectedHash) {
      throw new Error('La verificación de seguridad de yt-dlp no coincide.')
    }

    if (platform() !== 'win32') await chmod(temporaryPath, 0o755)
    await rm(targetPath, { force: true })
    await rename(temporaryPath, targetPath)
  } catch (error) {
    await rm(temporaryPath, { force: true })
    throw error
  }
}

async function ensureBinary(forceDownload = false): Promise<string> {
  const binDirectory = join(app.getPath('userData'), 'bin')
  const binaryPath = join(binDirectory, assetName())
  await mkdir(binDirectory, { recursive: true })

  if (forceDownload || !(await fileExists(binaryPath))) await downloadBinary(binaryPath)
  return binaryPath
}

function getBinary(forceDownload = false): Promise<string> {
  if (forceDownload) binaryPromise = null
  binaryPromise ??= ensureBinary(forceDownload).catch((error) => {
    binaryPromise = null
    throw error
  })
  return binaryPromise
}

function isForbiddenError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const processError = error as Error & { stderr?: string }
  return `${error.message}\n${processError.stderr ?? ''}`.includes('HTTP Error 403')
}

export function getFfmpegPath(): string {
  if (!ffmpegPath) throw new Error('FFmpeg no está disponible en esta instalación.')
  return app.isPackaged ? ffmpegPath.replace('app.asar', 'app.asar.unpacked') : ffmpegPath
}

export function validateYoutubeUrl(rawUrl: string): URL {
  let url: URL
  try {
    url = new URL(rawUrl.trim())
  } catch {
    throw new Error('Introduce un enlace válido de YouTube.')
  }

  const allowedHosts = new Set([
    'youtube.com',
    'www.youtube.com',
    'm.youtube.com',
    'music.youtube.com',
    'youtu.be'
  ])

  if (url.protocol !== 'https:' || !allowedHosts.has(url.hostname.toLowerCase())) {
    throw new Error('Por ahora DISCO solo admite enlaces HTTPS de YouTube.')
  }

  return url
}

export async function getMediaInfo(rawUrl: string): Promise<MediaInfo> {
  const url = validateYoutubeUrl(rawUrl)
  const binaryPath = await getBinary()
  const { stdout } = await execFileAsync(
    binaryPath,
    ['--dump-single-json', '--skip-download', '--no-playlist', '--socket-timeout', '15', url.href],
    { timeout: 45_000, maxBuffer: 8 * 1024 * 1024, windowsHide: true }
  )
  const info = JSON.parse(stdout) as YtDlpInfo

  if (!info.id || !info.title) throw new Error('YouTube no devolvió información suficiente del vídeo.')

  return {
    id: info.id,
    title: info.title,
    channel: info.channel ?? info.uploader ?? 'Canal desconocido',
    durationSeconds: Math.max(0, Math.round(info.duration ?? 0)),
    thumbnailUrl: info.thumbnail ?? null,
    sourceUrl: info.webpage_url ?? url.href
  }
}

export async function downloadAudio(
  rawUrl: string,
  directory: string,
  format: AudioFormat,
  onProgress?: (progress: DownloadProgress) => void,
  signal?: AbortSignal
): Promise<string> {
  const url = validateYoutubeUrl(rawUrl)
  if (!AUDIO_FORMATS.includes(format)) throw new Error('El formato seleccionado no es válido.')

  const directoryInfo = await stat(directory).catch(() => null)
  if (!directoryInfo?.isDirectory()) throw new Error('Selecciona una carpeta de destino válida.')

  const outputTemplate = join(directory, '%(title).180B [%(id)s].%(ext)s')
  const downloadStartedAt = Date.now()
  const commonArguments = [
      '--no-playlist',
      '--newline',
      '--progress',
      '--progress-template',
      'download:[download] %(progress._percent_str)s',
      '--no-warnings',
      '--retries',
      '3',
      '--fragment-retries',
      '3',
      '--extract-audio',
      '--audio-format',
      format,
      '--audio-quality',
      '0',
      '--ffmpeg-location',
      getFfmpegPath(),
      '--output',
      outputTemplate,
      '--print',
      'after_move:filepath'
  ]

  async function attemptDownload(binaryPath: string, alternativeClient = false): Promise<string> {
    const clientArguments = alternativeClient
      ? ['--extractor-args', 'youtube:player-client=default,android_vr']
      : []
    return new Promise((resolveDownload, rejectDownload) => {
      if (signal?.aborted) {
        rejectDownload(new Error('Descarga cancelada.'))
        return
      }
      const child = spawn(binaryPath, [...commonArguments, ...clientArguments, url.href], {
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe']
      })
      let stdout = ''
      let stderr = ''
      let lineBuffer = ''
      let settled = false
      let timedOut = false
      const stopChild = (): void => {
        if (process.platform === 'win32' && child.pid) {
          spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' })
        } else child.kill()
      }
      const timeout = setTimeout(() => {
        timedOut = true
        stopChild()
      }, 30 * 60_000)

      const reportOutput = (chunk: Buffer): void => {
        lineBuffer += chunk.toString()
        const lines = lineBuffer.split(/\r?\n|\r/)
        lineBuffer = lines.pop() ?? ''
        for (const line of lines) {
          const progress = /\[download\]\s+([\d.]+)%/.exec(line)
          if (progress) {
            onProgress?.({ phase: 'downloading', percent: Math.min(100, Number(progress[1])), detail: 'Descargando audio' })
          } else if (/\[(ExtractAudio|Merger|ffmpeg)\]/i.test(line)) {
            onProgress?.({ phase: 'converting', percent: null, detail: `Convirtiendo a ${format.toUpperCase()}` })
          }
        }
      }
      child.stdout.on('data', (chunk: Buffer) => {
        stdout += chunk.toString()
        reportOutput(chunk)
      })
      child.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString()
        reportOutput(chunk)
      })
      const abort = (): void => { stopChild() }
      signal?.addEventListener('abort', abort, { once: true })
      child.on('error', (error) => {
        if (settled) return
        settled = true
        clearTimeout(timeout)
        signal?.removeEventListener('abort', abort)
        rejectDownload(error)
      })
      child.on('close', (code) => {
        if (settled) return
        settled = true
        clearTimeout(timeout)
        signal?.removeEventListener('abort', abort)
        if (signal?.aborted) {
          rejectDownload(new Error('Descarga cancelada.'))
        } else if (timedOut) {
          rejectDownload(new Error('La descarga ha superado el tiempo máximo de espera. Puedes volver a intentarlo.'))
        } else if (code === 0) {
          onProgress?.({ phase: 'finalizing', percent: 100, detail: 'Preparando el análisis' })
          resolveDownload(stdout)
        } else {
          const error = new Error(stderr.trim() || `yt-dlp terminó con el código ${code ?? 'desconocido'}.`) as Error & { stderr?: string }
          error.stderr = stderr
          rejectDownload(error)
        }
      })
    })
  }

  let stdout: string
  const binaryPath = await getBinary()
  try {
    stdout = await attemptDownload(binaryPath)
  } catch (error) {
    if (!isForbiddenError(error)) throw error

    let refreshedBinary = binaryPath
    try {
      refreshedBinary = await getBinary(true)
    } catch {
      // Si GitHub no está accesible, todavía podemos reintentar con el binario existente.
    }
    try {
      stdout = await attemptDownload(refreshedBinary, true)
    } catch (retryError) {
      if (isForbiddenError(retryError)) {
        throw new Error(
          'YouTube ha rechazado temporalmente este audio (error 403). Inténtalo de nuevo más tarde o prueba otro vídeo.'
        )
      }
      throw retryError
    }
  }

  const printedPath = stdout
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .at(-1)
    ?.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, '')
    .replace(/^['"]|['"]$/g, '')
    .trim()
  const resolvedPrintedPath = printedPath
    ? isAbsolute(printedPath) ? printedPath : resolve(directory, printedPath)
    : null

  if (resolvedPrintedPath && await fileExists(resolvedPrintedPath)) return resolvedPrintedPath

  const candidates = await Promise.all(
    (await readdir(directory)).map(async (name) => {
      const path = join(directory, name)
      const info = await stat(path).catch(() => null)
      return { path, name, info }
    })
  )
  const fallback = candidates
    .filter(({ name, info }) =>
      info?.isFile() &&
      extname(name).toLowerCase() === `.${format}` &&
      info.mtimeMs >= downloadStartedAt - 5_000
    )
    .sort((a, b) => (b.info?.mtimeMs ?? 0) - (a.info?.mtimeMs ?? 0))[0]

  if (!fallback) {
    throw new Error('La descarga terminó, pero DISCO no pudo localizar el archivo resultante.')
  }
  return fallback.path
}
