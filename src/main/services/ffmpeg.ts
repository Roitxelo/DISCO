import { createHash } from 'node:crypto'
import { createWriteStream } from 'node:fs'
import { access, chmod, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { arch, platform } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { app } from 'electron'

const FFMPEG_RELEASE = 'b6.1.1'
const FFMPEG_RELEASE_BASE = `https://github.com/eugeneware/ffmpeg-static/releases/download/${FFMPEG_RELEASE}`

type PlatformBinary = {
  asset: string
  sha256: string
}

const BINARIES: Record<string, PlatformBinary> = {
  'win32-x64': {
    asset: 'ffmpeg-win32-x64',
    sha256: '04e1307997530f9cf2fe35cba2ca7e8875ca91da02f89d6c7243df819c94ad00'
  },
  'darwin-x64': {
    asset: 'ffmpeg-darwin-x64',
    sha256: 'ebdddc936f61e14049a2d4b549a412b8a40deeff6540e58a9f2a2da9e6b18894'
  },
  'darwin-arm64': {
    asset: 'ffmpeg-darwin-arm64',
    sha256: 'a90e3db6a3fd35f6074b013f948b1aa45b31c6375489d39e572bea3f18336584'
  },
  'linux-x64': {
    asset: 'ffmpeg-linux-x64',
    sha256: 'e7e7fb30477f717e6f55f9180a70386c62677ef8a4d4d1a5d948f4098aa3eb99'
  },
  'linux-arm64': {
    asset: 'ffmpeg-linux-arm64',
    sha256: '6bb182d0d75d23028db82e9e4f723ca69b853d055698486e6984ddb2c06fb8ce'
  }
}

let ffmpegPromise: Promise<string> | null = null

function currentBinary(): PlatformBinary {
  const key = `${platform()}-${arch()}`
  const binary = BINARIES[key]
  if (!binary) throw new Error('FFmpeg todavía no está disponible para este sistema operativo.')
  return binary
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

async function installFfmpeg(): Promise<string> {
  const binary = currentBinary()
  const binDirectory = join(app.getPath('userData'), 'bin')
  const binaryPath = join(binDirectory, platform() === 'win32' ? 'ffmpeg.exe' : 'ffmpeg')
  const markerPath = `${binaryPath}.sha256`

  await mkdir(binDirectory, { recursive: true })

  if (await fileExists(binaryPath)) {
    const installedHash = await sha256(binaryPath).catch(() => '')
    if (installedHash === binary.sha256) return binaryPath
  }

  const sourceUrl = new URL(`${FFMPEG_RELEASE_BASE}/${binary.asset}`)
  if (sourceUrl.protocol !== 'https:' || sourceUrl.hostname !== 'github.com') {
    throw new Error('La URL de FFmpeg no es de confianza.')
  }

  const response = await fetch(sourceUrl, {
    headers: { 'User-Agent': 'DISCO-desktop' },
    redirect: 'follow'
  })
  if (!response.ok || !response.body) {
    throw new Error('No se pudo descargar FFmpeg.')
  }

  const temporaryPath = `${binaryPath}.download`
  await rm(temporaryPath, { force: true })

  try {
    await pipeline(
      Readable.fromWeb(response.body as import('node:stream/web').ReadableStream),
      createWriteStream(temporaryPath, { mode: 0o755 })
    )

    const actualHash = await sha256(temporaryPath)
    if (actualHash !== binary.sha256) {
      throw new Error('La verificación de seguridad de FFmpeg no coincide.')
    }

    if (platform() !== 'win32') await chmod(temporaryPath, 0o755)
    await rm(binaryPath, { force: true })
    await rename(temporaryPath, binaryPath)
    await writeFile(markerPath, `${binary.sha256}\n`, 'utf8')
    return binaryPath
  } catch (error) {
    await rm(temporaryPath, { force: true })
    throw error
  }
}

export function getFfmpegPath(): Promise<string> {
  ffmpegPromise ??= installFfmpeg().catch((error) => {
    ffmpegPromise = null
    throw error
  })
  return ffmpegPromise
}
