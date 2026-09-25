import type { FormEvent } from 'react'
import { AUDIO_FORMATS } from '../../../shared/media'
import type { AudioFormat, DownloadProgress, LocalImportProgress, MediaInfo } from '../../../shared/media'

type DownloadViewProps = {
  url: string
  media: MediaInfo | null
  format: AudioFormat
  directory: string
  loading: boolean
  downloading: boolean
  analyzing: boolean
  importingLocal: boolean
  localImportProgress: LocalImportProgress | null
  error: string
  progress: DownloadProgress | null
  onUrlChange: (url: string) => void
  onFormatChange: (format: AudioFormat) => void
  onAnalyze: (event: FormEvent<HTMLFormElement>) => void
  onImportLocal: () => void
  onSelectFolder: () => void
  onDownload: () => void
  onCancel: () => void
}

function duration(totalSeconds: number): string {
  if (!totalSeconds) return 'Duración desconocida'
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return [hours, minutes, seconds]
    .filter((_, index) => hours > 0 || index > 0)
    .map((value) => value.toString().padStart(2, '0'))
    .join(':')
}

export function DownloadView({
  url,
  media,
  format,
  directory,
  loading,
  downloading,
  analyzing,
  importingLocal,
  localImportProgress,
  error,
  progress,
  onUrlChange,
  onFormatChange,
  onAnalyze,
  onImportLocal,
  onSelectFolder,
  onDownload,
  onCancel
}: DownloadViewProps): React.JSX.Element {
  return <section className="download-view">
    <header className="view-intro download-intro">
      <div><p className="eyebrow">DESCARGA</p><h1>Empieza con un enlace.</h1></div>
      <p className="intro">Trae el audio a DISCO y deja preparado el análisis musical.</p>
    </header>

    <form className="url-form" onSubmit={onAnalyze}>
      <label htmlFor="source-url">Enlace de YouTube</label>
      <div className="input-row">
        <input id="source-url" type="url" inputMode="url" autoComplete="off" placeholder="https://www.youtube.com/watch?v=..." value={url} onChange={(event) => onUrlChange(event.target.value)} disabled={loading} required />
        <button type="submit" disabled={!url.trim() || loading}>{loading ? 'Analizando…' : 'Analizar'}</button>
      </div>
      {loading && <p className="status" role="status">Preparando la información del vídeo…</p>}
      {error && <p className="error" role="alert">{error}</p>}
    </form>

    <div className="local-import-entry">
      <span><strong>¿El audio ya está en tu equipo?</strong><small>Añade WAV, MP3, FLAC o M4A sin pasar por YouTube.</small></span>
      <button type="button" disabled={importingLocal || downloading} onClick={onImportLocal}>{importingLocal ? 'Importando…' : 'Añadir audio local'}</button>
      {importingLocal && localImportProgress && <p role="status">{localImportProgress.completed}/{localImportProgress.total || '—'} · {localImportProgress.title}</p>}
    </div>

    {media ? <article className="media-card download-card">
      {media.thumbnailUrl ? <img src={media.thumbnailUrl} alt="" /> : <div className="media-placeholder" />}
      <div className="media-copy">
        <span className="media-source">YouTube · {duration(media.durationSeconds)}</span>
        <h2>{media.title}</h2><p>{media.channel}</p>
        <div className="export-panel">
          <fieldset><legend>Formato de audio</legend><div className="format-options">
            {AUDIO_FORMATS.map((option) => <label key={option} className={format === option ? 'selected' : ''}>
              <input type="radio" name="format" value={option} checked={format === option} onChange={() => onFormatChange(option)} disabled={downloading} />{option.toUpperCase()}
            </label>)}
          </div></fieldset>
          <div className="download-destination">
            <button className="folder-button" type="button" onClick={onSelectFolder} disabled={downloading}>{directory ? 'Cambiar carpeta' : 'Elegir carpeta'}</button>
            <span className="folder-path" title={directory}>{directory || 'Selecciona dónde guardar el audio'}</span>
          </div>
          <button className="download-button" type="button" onClick={onDownload} disabled={!directory || downloading}>{downloading ? `Preparando ${format.toUpperCase()}…` : error ? `Reintentar en ${format.toUpperCase()}` : `Descargar y analizar · ${format.toUpperCase()}`}</button>
          {downloading && progress && <div className="download-progress" role="status" aria-live="polite">
            <div><span>{progress.detail}</span><strong>{progress.percent === null ? '…' : `${Math.round(progress.percent)}%`}</strong></div>
            <progress max="100" value={progress.percent ?? undefined} />
            <button type="button" onClick={onCancel}>Cancelar</button>
          </div>}
          {analyzing && <p className="analysis-status" role="status">Detectando BPM y tonalidad…</p>}
        </div>
      </div>
    </article> : <div className="flow-summary" aria-label="Flujo de trabajo"><span><b>1</b> Descarga</span><span><b>2</b> Identifica</span><span><b>3</b> Samplea</span><span><b>4</b> Colección</span></div>}
  </section>
}
