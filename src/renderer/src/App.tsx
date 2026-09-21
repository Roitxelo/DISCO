import { useState } from 'react'
import type { FormEvent } from 'react'
import { AUDIO_FORMATS } from '../../shared/media'
import type { AudioFormat, MediaInfo } from '../../shared/media'

function formatDuration(totalSeconds: number): string {
  if (!totalSeconds) return 'Duración desconocida'
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return [hours, minutes, seconds]
    .filter((_, index) => hours > 0 || index > 0)
    .map((value) => value.toString().padStart(2, '0'))
    .join(':')
}

function App(): React.JSX.Element {
  const [url, setUrl] = useState('')
  const [media, setMedia] = useState<MediaInfo | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [format, setFormat] = useState<AudioFormat>('wav')
  const [directory, setDirectory] = useState('')
  const [downloading, setDownloading] = useState(false)
  const [downloadedFile, setDownloadedFile] = useState('')

  async function analyze(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setLoading(true)
    setError('')
    setMedia(null)
    setDownloadedFile('')

    try {
      const result = await window.disco.analyzeUrl(url)
      if (result.ok) setMedia(result.media)
      else setError(result.error)
    } catch {
      setError('La aplicación no pudo completar el análisis.')
    } finally {
      setLoading(false)
    }
  }

  async function selectFolder(): Promise<void> {
    const selectedDirectory = await window.disco.selectFolder()
    if (selectedDirectory) setDirectory(selectedDirectory)
  }

  async function download(): Promise<void> {
    if (!media || !directory) return
    setDownloading(true)
    setDownloadedFile('')
    setError('')

    try {
      const result = await window.disco.downloadAudio({
        url: media.sourceUrl,
        directory,
        format
      })
      if (result.ok) setDownloadedFile(result.filePath)
      else setError(result.error)
    } catch {
      setError('La aplicación no pudo completar la descarga.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <main>
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <span>DISCO</span>
        </div>
        <span className="version">v{window.disco.version}</span>
      </header>

      <section className="hero">
        <p className="eyebrow">DOWNLOAD · IDENTIFY · SAMPLE · CONVERT · ORGANIZE</p>
        <h1>Del enlace al estudio.</h1>
        <p className="intro">
          Prepara audio para producir y descubre su BPM y tonalidad desde una sola herramienta.
        </p>

        <form className="url-form" onSubmit={analyze}>
          <label htmlFor="source-url">Enlace de YouTube</label>
          <div className="input-row">
            <input
              id="source-url"
              type="url"
              inputMode="url"
              autoComplete="off"
              placeholder="https://www.youtube.com/watch?v=..."
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              disabled={loading}
              required
            />
            <button type="submit" disabled={!url.trim() || loading}>
              {loading ? 'Analizando…' : 'Analizar'}
            </button>
          </div>
          {loading && (
            <p className="status" role="status">
              La primera ejecución puede tardar mientras DISCO prepara el motor de análisis.
            </p>
          )}
          {error && <p className="error" role="alert">{error}</p>}
        </form>

        {media && (
          <article className="media-card">
            {media.thumbnailUrl && <img src={media.thumbnailUrl} alt="" />}
            <div className="media-copy">
              <span className="media-source">YouTube · {formatDuration(media.durationSeconds)}</span>
              <h2>{media.title}</h2>
              <p>{media.channel}</p>
              <div className="export-panel">
                <fieldset>
                  <legend>Formato</legend>
                  <div className="format-options">
                    {AUDIO_FORMATS.map((audioFormat) => (
                      <label key={audioFormat} className={format === audioFormat ? 'selected' : ''}>
                        <input
                          type="radio"
                          name="format"
                          value={audioFormat}
                          checked={format === audioFormat}
                          onChange={() => setFormat(audioFormat)}
                          disabled={downloading}
                        />
                        {audioFormat.toUpperCase()}
                      </label>
                    ))}
                  </div>
                </fieldset>

                <button className="folder-button" type="button" onClick={selectFolder} disabled={downloading}>
                  {directory ? 'Cambiar carpeta' : 'Elegir carpeta'}
                </button>
                {directory && <span className="folder-path" title={directory}>{directory}</span>}

                <button
                  className="download-button"
                  type="button"
                  onClick={download}
                  disabled={!directory || downloading}
                >
                  {downloading ? `Preparando ${format.toUpperCase()}…` : `Descargar ${format.toUpperCase()}`}
                </button>

                {downloadedFile && (
                  <button
                    className="success-button"
                    type="button"
                    onClick={() => window.disco.revealFile(downloadedFile)}
                  >
                    Descarga terminada · Mostrar archivo
                  </button>
                )}
              </div>
            </div>
          </article>
        )}

        {!media && (
          <div className="features" aria-label="Próximas funciones">
            <article><strong>WAV</strong><span>Formato principal</span></article>
            <article><strong>— BPM</strong><span>Análisis rítmico</span></article>
            <article><strong>— KEY</strong><span>Tonalidad y Camelot</span></article>
          </div>
        )}
      </section>

      <footer>Usa DISCO únicamente con contenido propio, autorizado o permitido por su licencia.</footer>
    </main>
  )
}

export default App
