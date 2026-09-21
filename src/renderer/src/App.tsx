import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { AUDIO_FORMATS } from '../../shared/media'
import type { AudioAnalysis, AudioFormat, HistoryEntry, MediaInfo } from '../../shared/media'

const MUSICAL_KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const
const CAMELOT_MAJOR = ['8B', '3B', '10B', '5B', '12B', '7B', '2B', '9B', '4B', '11B', '6B', '1B']
const CAMELOT_MINOR = ['5A', '12A', '7A', '2A', '9A', '4A', '11A', '6A', '1A', '8A', '3A', '10A']

function camelotFor(key: string, mode: AudioAnalysis['mode']): string {
  const index = MUSICAL_KEYS.indexOf(key as (typeof MUSICAL_KEYS)[number])
  if (index < 0) return '—'
  return mode === 'major' ? CAMELOT_MAJOR[index] : CAMELOT_MINOR[index]
}

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

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
  }).format(new Date(value))
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
  const [analysis, setAnalysis] = useState<AudioAnalysis | null>(null)
  const [displayBpm, setDisplayBpm] = useState(0)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisError, setAnalysisError] = useState('')
  const [selectedKey, setSelectedKey] = useState('C')
  const [selectedMode, setSelectedMode] = useState<AudioAnalysis['mode']>('major')
  const [savingCorrection, setSavingCorrection] = useState(false)
  const [correctionSaved, setCorrectionSaved] = useState(false)
  const [editingAnalysis, setEditingAnalysis] = useState(false)
  const [analysisReview, setAnalysisReview] = useState<'pending' | 'confirmed' | 'corrected'>('pending')
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [historyError, setHistoryError] = useState('')

  useEffect(() => {
    void window.disco.listHistory().then((result) => {
      if (result.ok) setHistory(result.entries)
      else setHistoryError(result.error)
    })
  }, [])

  async function saveToHistory(filePath: string, audioAnalysis: AudioAnalysis | null): Promise<void> {
    if (!media) return
    const result = await window.disco.saveHistory({ media, format, filePath, analysis: audioAnalysis })
    if (result.ok) setHistory(result.entries)
    else setHistoryError(result.error)
  }

  async function analyze(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setLoading(true)
    setError('')
    setMedia(null)
    setDownloadedFile('')
    setAnalysis(null)
    setAnalysisError('')
    setCorrectionSaved(false)
    setEditingAnalysis(false)
    setAnalysisReview('pending')

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
    setAnalysis(null)
    setAnalysisError('')
    setCorrectionSaved(false)
    setEditingAnalysis(false)
    setAnalysisReview('pending')
    setError('')

    try {
      const result = await window.disco.downloadAudio({
        url: media.sourceUrl,
        directory,
        format
      })
      if (result.ok) {
        setDownloadedFile(result.filePath)
        setAnalyzing(true)
        const analysisResult = await window.disco.analyzeAudio(result.filePath)
        if (analysisResult.ok) {
          setAnalysis(analysisResult.analysis)
          setDisplayBpm(analysisResult.analysis.bpm)
          setSelectedKey(analysisResult.analysis.key)
          setSelectedMode(analysisResult.analysis.mode)
          await saveToHistory(result.filePath, analysisResult.analysis)
        } else {
          setAnalysisError(analysisResult.error)
          await saveToHistory(result.filePath, null)
        }
      } else {
        setError(result.error)
      }
    } catch {
      setError('La aplicación no pudo completar la descarga.')
    } finally {
      setDownloading(false)
      setAnalyzing(false)
    }
  }

  async function removeHistory(id: string): Promise<void> {
    const result = await window.disco.removeHistory(id)
    if (result.ok) setHistory(result.entries)
    else setHistoryError(result.error)
  }

  async function saveCorrection(): Promise<void> {
    if (!analysis || !downloadedFile || displayBpm < 20 || displayBpm > 300) return
    setSavingCorrection(true)
    setCorrectionSaved(false)
    const corrected: AudioAnalysis = {
      ...analysis,
      bpm: Math.round(displayBpm * 10) / 10,
      key: selectedKey,
      mode: selectedMode,
      camelot: camelotFor(selectedKey, selectedMode)
    }
    const result = await window.disco.updateHistoryAnalysis({
      filePath: downloadedFile,
      analysis: corrected,
      review: 'corrected'
    })
    if (result.ok) {
      setAnalysis(corrected)
      setDisplayBpm(corrected.bpm)
      setHistory(result.entries)
      setCorrectionSaved(true)
      setEditingAnalysis(false)
      setAnalysisReview('corrected')
    } else {
      setAnalysisError(result.error)
    }
    setSavingCorrection(false)
  }

  async function confirmAnalysis(): Promise<void> {
    if (!analysis || !downloadedFile) return
    setSavingCorrection(true)
    const result = await window.disco.updateHistoryAnalysis({
      filePath: downloadedFile,
      analysis,
      review: 'confirmed'
    })
    if (result.ok) {
      setHistory(result.entries)
      setAnalysisReview('confirmed')
    } else {
      setAnalysisError(result.error)
    }
    setSavingCorrection(false)
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

                {analyzing && <p className="analysis-status" role="status">Detectando BPM y tonalidad…</p>}
                {analysisError && <p className="error" role="alert">{analysisError}</p>}

                {analysis && (
                  <section className="analysis-results" aria-label="Análisis musical estimado">
                    <div className="analysis-heading">
                      <span>Análisis estimado</span>
                      <small>Confianza tonal: {analysis.keyConfidence}%</small>
                    </div>
                    <div className="analysis-values">
                      <article>
                        <span>BPM</span>
                        {editingAnalysis ? (
                          <>
                            <input
                              className="analysis-input"
                              type="number"
                              min="20"
                              max="300"
                              step="0.1"
                              value={displayBpm}
                              aria-label="BPM corregido"
                              onChange={(event) => {
                                setDisplayBpm(Number(event.target.value))
                                setCorrectionSaved(false)
                              }}
                            />
                            <div className="bpm-controls">
                              <button type="button" onClick={() => { setDisplayBpm((value) => value / 2); setCorrectionSaved(false) }}>÷2</button>
                              <button type="button" onClick={() => { setDisplayBpm(analysis.bpm); setCorrectionSaved(false) }}>Original</button>
                              <button type="button" onClick={() => { setDisplayBpm((value) => value * 2); setCorrectionSaved(false) }}>×2</button>
                            </div>
                          </>
                        ) : <strong>{analysis.bpm.toFixed(1)}</strong>}
                      </article>
                      <article>
                        <span>Tonalidad</span>
                        {editingAnalysis ? (
                          <div className="key-controls">
                            <select value={selectedKey} aria-label="Tónica" onChange={(event) => { setSelectedKey(event.target.value); setCorrectionSaved(false) }}>
                              {MUSICAL_KEYS.map((key) => <option key={key} value={key}>{key}</option>)}
                            </select>
                            <select value={selectedMode} aria-label="Modo" onChange={(event) => { setSelectedMode(event.target.value as AudioAnalysis['mode']); setCorrectionSaved(false) }}>
                              <option value="major">Mayor</option>
                              <option value="minor">Menor</option>
                            </select>
                          </div>
                        ) : <strong>{analysis.key} {analysis.mode === 'major' ? 'mayor' : 'menor'}</strong>}
                        <small>{editingAnalysis ? camelotFor(selectedKey, selectedMode) : analysis.camelot} · Camelot</small>
                      </article>
                    </div>
                    {editingAnalysis ? (
                      <div className="review-actions">
                        <button className="secondary-action" type="button" onClick={() => setEditingAnalysis(false)}>Cancelar</button>
                        <button className="save-correction" type="button" onClick={saveCorrection} disabled={savingCorrection || displayBpm < 20 || displayBpm > 300}>
                          {savingCorrection ? 'Guardando…' : correctionSaved ? 'Corrección guardada' : 'Guardar corrección'}
                        </button>
                      </div>
                    ) : analysisReview === 'pending' ? (
                      <div className="review-actions">
                        <button className="secondary-action" type="button" onClick={() => setEditingAnalysis(true)}>Corregir</button>
                        <button className="confirm-action" type="button" onClick={confirmAnalysis} disabled={savingCorrection}>Datos correctos</button>
                      </div>
                    ) : (
                      <div className={`review-status ${analysisReview}`}>
                        {analysisReview === 'confirmed' ? 'Datos confirmados' : 'Corrección guardada'}
                        <button type="button" onClick={() => setEditingAnalysis(true)}>Editar</button>
                      </div>
                    )}
                  </section>
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

        <section className="library" aria-labelledby="library-title">
          <div className="library-heading">
            <div>
              <p className="eyebrow">ORGANIZE</p>
              <h2 id="library-title">Biblioteca reciente</h2>
            </div>
            <span>{history.length} {history.length === 1 ? 'descarga' : 'descargas'}</span>
          </div>
          {historyError && <p className="error" role="alert">{historyError}</p>}
          {history.length === 0 ? (
            <p className="empty-library">Tus próximas descargas aparecerán aquí automáticamente.</p>
          ) : (
            <div className="history-list">
              {history.map((entry) => (
                <article className="history-entry" key={entry.id}>
                  {entry.media.thumbnailUrl ? <img src={entry.media.thumbnailUrl} alt="" /> : <div className="history-placeholder" />}
                  <div className="history-copy">
                    <strong title={entry.media.title}>{entry.media.title}</strong>
                    <span>{entry.media.channel} · {formatDate(entry.createdAt)}</span>
                    <div className="history-tags">
                      <span>{entry.format.toUpperCase()}</span>
                      {entry.analysis && <span>{entry.analysis.bpm.toFixed(1)} BPM</span>}
                      {entry.analysis && <span>{entry.analysis.key} {entry.analysis.mode === 'major' ? 'mayor' : 'menor'}</span>}
                      {entry.analysis && <span>{entry.analysis.camelot}</span>}
                      {entry.analysisReview === 'confirmed' && <span className="reviewed">Confirmado</span>}
                      {entry.analysisReview === 'corrected' && <span className="reviewed">Corregido</span>}
                    </div>
                  </div>
                  <div className="history-actions">
                    <button type="button" onClick={() => window.disco.revealFile(entry.filePath)}>Mostrar</button>
                    <button className="remove-button" type="button" onClick={() => removeHistory(entry.id)}>Quitar</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>

      <footer>Usa DISCO únicamente con contenido propio, autorizado o permitido por su licencia.</footer>
    </main>
  )
}

export default App
