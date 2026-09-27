import { createHash } from 'node:crypto'
import { createWriteStream } from 'node:fs'
import { access, chmod, mkdir, readFile, rename, rm } from 'node:fs/promises'
import { arch, platform } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { app } from 'electron'

type FfmpegAsset = {
  binaryName: string
  binaryUrl: string
  binarySha256: string
  licenseUrl: string
  licenseSha256: string
}

const FFMPEG_RELEASE = 'b6.1.1'

const ASSETS: Record<string, FfmpegAsset> = {
  'win32-x64': {
    binaryName: 'ffmpeg.exe',
    binaryUrl: `https://github.com/eugeneware/ffmpeg-static/releases/download/${FFMPEG_RELEASE}/ffmpeg-win32-x64`,
    binarySha256: '04e1307997530f9cf2fe35cba2ca7e8875ca91da02f89d6c7243df819c94ad00',
    licenseUrl: `https://github.com/eugeneware/ffmpeg-static/releases/download/${FFMPEG_RELEASE}/win32-x64.LICENSE`,
    licenseSha256: '8ceb4b9ee5adedde47b31e975c1d90c73ad27b6b165a1dcd80c7c545eb65b903'
  },
  'darwin-x64': {
    binaryName: 'ffmpeg',
    binaryUrl: `https://github.com/eugeneware/ffmpeg-static/releases/download/${FFMPEG_RELEASE}/ffmpeg-darwin-x64`,
    binarySha256: 'ebdddc936f61e14049a2d4b549a412b8a40deeff6540e58a9f2a2da9e6b18894',
    licenseUrl: `https://github.com/eugeneware/ffmpeg-static/releases/download/${FFMPEG_RELEASE}/darwin-x64.LICENSE`,
    licenseSha256: '2e1d16c72fd74e12063776371da757322f8b77589386532f4fd8634bde7de1af'
  }
}

let ffmpegPromise: Promise<string> | null = null

function ffmpegAsset(): FfmpegAsset {
  const key = `${platform()}-${arch()}`
  const asset = ASSETS[key]
  if (!asset) {
    throw new Error('FFmpeg todavía no está preparado para esta plataforma.')
  }
  return asset
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

function trustedGithubAsset(rawUrl: string): URL {
  const url = new URL(rawUrl)
  if (url.protocol !== 'https:' || url.hostname !== 'github.com') {
    throw new Error('El origen de FFmpeg no es de confianza.')
  }
  return url
}

async function downloadVerifiedFile(url: string, targetPath: string, expectedSha256: string): Promise<void> {
  const response = await fetch(trustedGithubAsset(url), {
    headers: { 'User-Agent': 'DISCO-desktop' }
  })
  if (!response.ok || !response.body) {
    throw new Error('No se pudo descargar FFmpeg.')
  }

  const temporaryPath = `${targetPath}.download`
  await rm(temporaryPath, { force: true })

  try {
    await pipeline(
      Readable.fromWeb(response.body as import('node:stream/web').ReadableStream),
      createWriteStream(temporaryPath, { mode: 0o755 })
    )

    if (await sha256(temporaryPath) !== expectedSha256) {
      throw new Error('La verificación SHA-256 de FFmpeg no coincide.')
    }

    await rm(targetPath, { force: true })
    await rename(temporaryPath, targetPath)
  } catch (error) {
    await rm(temporaryPath, { force: true })
    throw error
  }
}

async function ensureFfmpeg(): Promise<string> {
  const asset = ffmpegAsset()
  const binDirectory = join(app.getPath('userData'), 'bin')
  const binaryPath = join(binDirectory, asset.binaryName)
  const licensePath = join(binDirectory, 'FFMPEG-LICENSE.txt')
  await mkdir(binDirectory, { recursive: true })

  const binaryValid = await fileExists(binaryPath) && await sha256(binaryPath) === asset.binarySha256
  if (!binaryValid) {
    await downloadVerifiedFile(asset.binaryUrl, binaryPath, asset.binarySha256)
    if (platform() !== 'win32') await chmod(binaryPath, 0o755)
  }

  const licenseValid = await fileExists(licensePath) && await sha256(licensePath) === asset.licenseSha256
  if (!licenseValid) {
    await downloadVerifiedFile(asset.licenseUrl, licensePath, asset.licenseSha256)
    if (platform() !== 'win32') await chmod(licensePath, 0o644)
  }

  return binaryPath
}

export function getFfmpegPath(): Promise<string> {
  ffmpegPromise ??= ensureFfmpeg().catch((error) => {
    ffmpegPromise = null
    throw error
  })
  return ffmpegPromise
}
