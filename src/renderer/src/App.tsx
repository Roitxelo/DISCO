import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from 'react'
import { AUDIO_FORMATS, SAMPLE_FORMATS } from '../../shared/media'
import type { AudioAnalysis, AudioFormat, HistoryEntry, MediaInfo, SampleFormat } from '../../shared/media'
import { evaluateAnalysis } from './analysisEvaluation'

type AppView = 'download' | 'identify' | 'sample' | 'collection' | 'organize'

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

function formatTimestamp(seconds: number): string {
  if (!Number.isFinite(seconds)) return '0:00.0'
  const minutes = Math.floor(seconds / 60)
  const remaining = (seconds % 60).toFixed(1).padStart(4, '0')
  return `${minutes}:${remaining}`
}

function App(): React.JSX.Element {
  const [view, setView] = useState<AppView>('download')
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
  const [playingEntryId, setPlayingEntryId] = useState('')
  const [audioSource, setAudioSource] = useState('')
  const [waveformUrl, setWaveformUrl] = useState('')
  const [waveformLoading, setWaveformLoading] = useState(false)
  const [audioDuration, setAudioDuration] = useState(0)
  const [playheadTime, setPlayheadTime] = useState(0)
  const [waveformZoom, setWaveformZoom] = useState(1)
  const [waveformViewStart, setWaveformViewStart] = useState(0)
  const [selectionStart, setSelectionStart] = useState(0)
  const [selectionEnd, setSelectionEnd] = useState(0)
  const [loopSelection, setLoopSelection] = useState(true)
  const [sampleFormat, setSampleFormat] = useState<SampleFormat>('wav')
  const [exportingSample, setExportingSample] = useState(false)
  const [exportedSample, setExportedSample] = useState('')
  const [sampleError, setSampleError] = useState('')
  const [samplePreviewId, setSamplePreviewId] = useState('')
  const [samplePreviewUrl, setSamplePreviewUrl] = useState('')
  const [normalizeSample, setNormalizeSample] = useState(false)
  const [selectedBars, setSelectedBars] = useState<number | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const waveformRef = useRef<HTMLDivElement>(null)
  const dragModeRef = useRef<'selection' | 'start' | 'end' | null>(null)
  const dragAnchorRef = useRef(0)
  const dragStartXRef = useRef(0)
  const clickSelectionLengthRef = useRef(0)
  const evaluation = useMemo(() => evaluateAnalysis(history), [history])
  const pendingEntries = useMemo(
    () => history.filter((entry) => entry.analysisReview === 'pending'),
    [history]
  )
  const collectionEntries = useMemo(
    () => history.filter((entry) => entry.analysisReview !== 'pending'),
    [history]
  )
  const activeEntry = useMemo(
    () => history.find((entry) => entry.id === playingEntryId) ?? null,
    [history, playingEntryId]
  )
  const currentEntry = useMemo(
    () => history.find((entry) => entry.filePath === downloadedFile) ?? activeEntry ?? pendingEntries[0] ?? null,
    [history, downloadedFile, activeEntry, pendingEntries]
  )

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
    const existingSong = history.find((entry) => entry.media.id === media.id)
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
          if (existingSong && existingSong.analysisReview !== 'pending') {
            setAnalysis(existingSong.analysis)
            setAnalysisReview(existingSong.analysisReview)
            setView('collection')
          } else {
            setView('identify')
          }
        } else {
          setAnalysisError(analysisResult.error)
          await saveToHistory(result.filePath, null)
          setView('identify')
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
    if (result.ok) {
      setHistory(result.entries)
      if (playingEntryId === id) {
        setPlayingEntryId('')
        setAudioSource('')
        setWaveformUrl('')
      }
    }
    else setHistoryError(result.error)
  }

  async function togglePlayer(id: string): Promise<void> {
    setHistoryError('')
    if (playingEntryId === id) {
      setPlayingEntryId('')
      setAudioSource('')
      setWaveformUrl('')
      setPlayheadTime(0)
      return
    }
    const result = await window.disco.getAudioSource(id)
    if (result.ok) {
      setPlayingEntryId(id)
      setAudioSource(result.url)
      setWaveformUrl('')
      setAudioDuration(0)
      setPlayheadTime(0)
      setWaveformZoom(1)
      setWaveformViewStart(0)
      setSelectionStart(0)
      setSelectionEnd(0)
      setSelectedBars(null)
      setExportedSample('')
      setSampleError('')
      setWaveformLoading(true)
      const waveform = await window.disco.getWaveform(id)
      if (waveform.ok) setWaveformUrl(waveform.imageUrl)
      else setHistoryError(waveform.error)
      setWaveformLoading(false)
    } else {
      setHistoryError(result.error)
    }
  }

  function openIdentification(entry: HistoryEntry): void {
    setMedia(entry.media)
    setUrl(entry.media.sourceUrl)
    setDownloadedFile(entry.filePath)
    setAnalysis(entry.analysis)
    setAnalysisReview(entry.analysisReview)
    setEditingAnalysis(false)
    setCorrectionSaved(false)
    if (entry.analysis) {
      setDisplayBpm(entry.analysis.bpm)
      setSelectedKey(entry.analysis.key)
      setSelectedMode(entry.analysis.mode)
    }
    setView('identify')
  }

  async function openSampler(entry: HistoryEntry): Promise<void> {
    if (playingEntryId !== entry.id) await togglePlayer(entry.id)
    setView('sample')
  }

  function closeSampler(): void {
    setPlayingEntryId('')
    setAudioSource('')
    setWaveformUrl('')
    setAudioDuration(0)
    setPlayheadTime(0)
    setWaveformZoom(1)
    setWaveformViewStart(0)
    setExportedSample('')
    setSampleError('')
  }

  function prepareAnotherFormat(entry: HistoryEntry): void {
    setMedia(entry.media)
    setUrl(entry.media.sourceUrl)
    setDownloadedFile('')
    setAnalysis(null)
    setAnalysisReview('pending')
    setView('download')
  }

  function finishCurrentWork(): void {
    setDownloadedFile('')
    setMedia(null)
    setAnalysis(null)
    setAnalysisReview('pending')
    setPlayingEntryId('')
    setAudioSource('')
    setWaveformUrl('')
    setPlayheadTime(0)
    setSamplePreviewId('')
    setSamplePreviewUrl('')
    setView('collection')
  }

  async function toggleSamplePreview(historyId: string, sampleId: string): Promise<void> {
    setHistoryError('')
    if (samplePreviewId === sampleId) {
      setSamplePreviewId('')
      setSamplePreviewUrl('')
      return
    }
    const result = await window.disco.getSampleSource(historyId, sampleId)
    if (result.ok) {
      setSamplePreviewId(sampleId)
      setSamplePreviewUrl(result.url)
    } else {
      setHistoryError(result.error)
    }
  }

  function playSelection(): void {
    const player = audioRef.current
    if (!player) return
    player.currentTime = selectionStart
    setPlayheadTime(selectionStart)
    void player.play()
  }

  function selectBarLength(bars: number): void {
    const bpm = activeEntry?.analysis?.bpm
    if (!bpm || !audioDuration) return
    const length = (bars * 4 * 60) / bpm
    const start = Math.min(selectionStart, Math.max(0, audioDuration - length))
    setSelectionStart(start)
    setSelectionEnd(Math.min(audioDuration, start + length))
    setSelectedBars(bars)
  }

  function changeSelectionStart(nextStart: number): void {
    const bpm = activeEntry?.analysis?.bpm
    if (selectedBars && bpm) {
      const length = (selectedBars * 4 * 60) / bpm
      const start = Math.min(nextStart, Math.max(0, audioDuration - length))
      setSelectionStart(start)
      setSelectionEnd(Math.min(audioDuration, start + length))
      return
    }
    setSelectionStart(Math.min(nextStart, selectionEnd - 0.05))
  }

  function timeFromWaveformPointer(event: ReactPointerEvent): number {
    const bounds = waveformRef.current?.getBoundingClientRect()
    if (!bounds || !audioDuration) return 0
    const ratio = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width))
    return waveformViewStart + ratio * (audioDuration / waveformZoom)
  }

  function handleWaveformWheel(event: ReactWheelEvent<HTMLDivElement>): void {
    if (!audioDuration) return
    const bounds = waveformRef.current?.getBoundingClientRect()
    if (!bounds) return
    const visibleDuration = audioDuration / waveformZoom

    if (event.ctrlKey) {
      event.preventDefault()
      const pointerRatio = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width))
      const anchorTime = waveformViewStart + pointerRatio * visibleDuration
      const factor = event.deltaY < 0 ? 1.25 : 0.8
      const nextZoom = Math.min(16, Math.max(1, waveformZoom * factor))
      const nextVisibleDuration = audioDuration / nextZoom
      const nextStart = Math.min(
        audioDuration - nextVisibleDuration,
        Math.max(0, anchorTime - pointerRatio * nextVisibleDuration)
      )
      setWaveformZoom(nextZoom)
      setWaveformViewStart(nextStart)
      return
    }

    if (waveformZoom > 1) {
      event.preventDefault()
      const wheelDistance = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
      const nextStart = waveformViewStart + (wheelDistance / bounds.width) * visibleDuration
      setWaveformViewStart(Math.min(audioDuration - visibleDuration, Math.max(0, nextStart)))
    }
  }

  function resetWaveformZoom(): void {
    setWaveformZoom(1)
    setWaveformViewStart(0)
  }

  function beginWaveformSelection(event: ReactPointerEvent<HTMLDivElement>): void {
    if (!audioDuration) return
    const time = timeFromWaveformPointer(event)
    dragModeRef.current = 'selection'
    dragAnchorRef.current = time
    dragStartXRef.current = event.clientX
    clickSelectionLengthRef.current = Math.max(0.05, selectionEnd - selectionStart)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function beginHandleDrag(event: ReactPointerEvent<HTMLButtonElement>, edge: 'start' | 'end'): void {
    event.stopPropagation()
    dragModeRef.current = edge
    dragStartXRef.current = event.clientX
    waveformRef.current?.setPointerCapture(event.pointerId)
  }

  function moveWaveformSelection(event: ReactPointerEvent<HTMLDivElement>): void {
    const mode = dragModeRef.current
    if (!mode || !audioDuration) return
    const time = timeFromWaveformPointer(event)
    setSelectedBars(null)
    if (mode === 'start') {
      setSelectionStart(Math.min(time, selectionEnd - 0.05))
      return
    }
    if (mode === 'end') {
      setSelectionEnd(Math.max(time, selectionStart + 0.05))
      return
    }
    const start = Math.min(dragAnchorRef.current, time)
    const end = Math.max(dragAnchorRef.current, time)
    setSelectionStart(Math.min(start, audioDuration - 0.05))
    setSelectionEnd(Math.min(audioDuration, Math.max(end, start + 0.05)))
  }

  function endWaveformSelection(event: ReactPointerEvent<HTMLDivElement>): void {
    const mode = dragModeRef.current
    if (!mode) return
    if (mode === 'selection' && Math.abs(event.clientX - dragStartXRef.current) < 3) {
      const time = timeFromWaveformPointer(event)
      const length = Math.min(clickSelectionLengthRef.current, audioDuration)
      const start = Math.min(time, Math.max(0, audioDuration - length))
      setSelectionStart(start)
      setSelectionEnd(start + length)
    }
    dragModeRef.current = null
    if (waveformRef.current?.hasPointerCapture(event.pointerId)) {
      waveformRef.current.releasePointerCapture(event.pointerId)
    }
  }

  function adjustSelectionEdge(edge: 'start' | 'end', event: ReactKeyboardEvent<HTMLButtonElement>): void {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return
    event.preventDefault()
    const amount = (event.shiftKey ? 0.1 : 0.01) * (event.key === 'ArrowRight' ? 1 : -1)
    setSelectedBars(null)
    if (edge === 'start') setSelectionStart((value) => Math.max(0, Math.min(value + amount, selectionEnd - 0.05)))
    else setSelectionEnd((value) => Math.min(audioDuration, Math.max(value + amount, selectionStart + 0.05)))
  }

  function keepPlaybackInsideSelection(): void {
    const player = audioRef.current
    if (!player) return
    setPlayheadTime(player.currentTime)
    if (selectionEnd <= selectionStart || player.currentTime < selectionEnd) return
    if (loopSelection) {
      player.currentTime = selectionStart
      void player.play()
    } else {
      player.pause()
    }
  }

  async function saveSample(): Promise<void> {
    if (!playingEntryId || selectionEnd <= selectionStart) return
    setExportingSample(true)
    setExportedSample('')
    setSampleError('')
    const result = await window.disco.exportSample({
      historyId: playingEntryId,
      startSeconds: selectionStart,
      endSeconds: selectionEnd,
      format: sampleFormat,
      normalizePeak: normalizeSample
    })
    if (result.ok) {
      if (result.filePath) {
        setExportedSample(result.filePath)
        const refreshed = await window.disco.listHistory()
        if (refreshed.ok) setHistory(refreshed.entries)
      }
    } else {
      setSampleError(result.error)
    }
    setExportingSample(false)
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

  const navigation: Array<{ id: AppView; label: string; hint?: string }> = [
    { id: 'download', label: 'Descarga' },
    { id: 'identify', label: 'Identifica', hint: pendingEntries.length ? String(pendingEntries.length) : undefined },
    { id: 'sample', label: 'Samplea' },
    { id: 'collection', label: 'Colección' },
    { id: 'organize', label: 'Organiza' }
  ]

  const visibleEntries = view === 'identify'
    ? pendingEntries
    : view === 'collection' || view === 'sample'
      ? collectionEntries
      : history.slice(0, 3)
  const displayedEntries = view === 'sample' && activeEntry ? [activeEntry] : visibleEntries

  const currentStep = !currentEntry
    ? { label: 'Ninguna canción activa', detail: 'Empieza con una nueva descarga', target: 'download' as AppView }
    : currentEntry.analysisReview === 'pending'
      ? { label: currentEntry.media.title, detail: currentEntry.analysis ? 'Revisar identificación' : 'Análisis pendiente', target: 'identify' as AppView }
      : { label: currentEntry.media.title, detail: 'Guardada · sampleo opcional', target: 'sample' as AppView }

  const waveformViewDuration = audioDuration > 0 ? audioDuration / waveformZoom : 0
  const waveformViewEnd = waveformViewStart + waveformViewDuration
  const waveformPercent = (time: number): number => waveformViewDuration > 0
    ? ((time - waveformViewStart) / waveformViewDuration) * 100
    : 0
  const selectionVisible = selectionEnd >= waveformViewStart && selectionStart <= waveformViewEnd
  const visibleSelectionStart = Math.max(selectionStart, waveformViewStart)
  const visibleSelectionEnd = Math.min(selectionEnd, waveformViewEnd)
  const playheadVisible = playheadTime >= waveformViewStart && playheadTime <= waveformViewEnd

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand sidebar-brand">
          <span className="brand-mark" aria-hidden="true" />
          <span>DISCO</span>
        </div>
        <nav className="main-navigation" aria-label="Navegación principal">
          {navigation.map((item) => (
            <button
              type="button"
              key={item.id}
              className={view === item.id ? 'active' : ''}
              aria-label={item.hint ? `${item.label}, ${item.hint} pendientes` : item.label}
              aria-current={view === item.id ? 'page' : undefined}
              onClick={() => setView(item.id)}
            >
              <span>{item.label}</span>
              {item.hint && <span className="navigation-count" aria-label={`${item.hint} pendientes`}>{item.hint}</span>}
            </button>
          ))}
        </nav>
        <section className="current-work" aria-labelledby="current-work-title">
          <span className="sidebar-label" id="current-work-title">Trabajo actual</span>
          <strong title={currentStep.label}>{currentStep.label}</strong>
          <small>{currentStep.detail}</small>
          <div className="current-work-actions">
            <button type="button" onClick={() => {
              if (currentEntry && currentStep.target === 'identify') openIdentification(currentEntry)
              else if (currentEntry && currentStep.target === 'sample') void openSampler(currentEntry)
              else setView(currentStep.target)
            }}>
              {!currentEntry ? 'Nueva descarga' : currentEntry.analysisReview === 'pending' ? 'Continuar' : 'Samplear'}
            </button>
            {currentEntry && currentEntry.analysisReview !== 'pending' && <button className="finish-work" type="button" onClick={finishCurrentWork}>Finalizar trabajo</button>}
          </div>
        </section>
        <div className="sidebar-footer"><span>Motor listo</span><span>v{window.disco.version}</span></div>
      </aside>

      <main className="app-main">
      <header className="topbar">
        <div>
          <span className="eyebrow">{navigation.find((item) => item.id === view)?.label}</span>
          <strong>{view === 'download' ? 'Del enlace al estudio.' : view === 'identify' ? 'Revisa antes de guardar.' : view === 'sample' ? 'Encuentra el fragmento.' : view === 'collection' ? 'Tu música, siempre editable.' : 'Pon orden a tus proyectos.'}</strong>
        </div>
        <span className="engine-status"><span aria-hidden="true" /> Motor listo</span>
      </header>

      <section className="hero">
        {view === 'download' && <>
        <p className="eyebrow">DESCARGA</p>
        <h1>Empieza con un enlace.</h1>
        <p className="intro">Descarga el audio y deja que DISCO prepare su identificación musical.</p>

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
          <article className="media-card download-card">
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
                        <input type="radio" name="format" value={audioFormat} checked={format === audioFormat} onChange={() => setFormat(audioFormat)} disabled={downloading} />
                        {audioFormat.toUpperCase()}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <button className="folder-button" type="button" onClick={selectFolder} disabled={downloading}>{directory ? 'Cambiar carpeta' : 'Elegir carpeta'}</button>
                {directory && <span className="folder-path" title={directory}>{directory}</span>}
                <button className="download-button" type="button" onClick={download} disabled={!directory || downloading}>{downloading ? `Preparando ${format.toUpperCase()}…` : `Descargar y analizar en ${format.toUpperCase()}`}</button>
                {analyzing && <p className="analysis-status" role="status">Detectando BPM y tonalidad…</p>}
              </div>
            </div>
          </article>
        )}

        {!media && <div className="flow-summary" aria-label="Flujo de trabajo"><span><b>1</b> Descarga</span><span><b>2</b> Identifica</span><span><b>3</b> Samplea</span><span><b>4</b> Colección</span></div>}
        </>}

        {view === 'identify' && media && downloadedFile && (
          <article className="media-card">
            {media.thumbnailUrl && <img src={media.thumbnailUrl} alt="" />}
            <div className="media-copy">
              <span className="media-source">YouTube · {formatDuration(media.durationSeconds)}</span>
              <h2>{media.title}</h2>
              <p>{media.channel}</p>
              <div className="export-panel">
                <fieldset className="identification-format">
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
                        <div><button type="button" onClick={() => setEditingAnalysis(true)}>Editar</button><button type="button" onClick={() => currentEntry && void openSampler(currentEntry)}>Crear samples</button><button type="button" onClick={finishCurrentWork}>Finalizar</button></div>
                      </div>
                    )}
                  </section>
                )}
              </div>
            </div>
          </article>
        )}

        {(view === 'identify' || view === 'sample' || view === 'collection') && <section className={`library ${view === 'sample' ? 'sample-library' : ''} ${view === 'sample' && activeEntry ? 'sample-studio' : ''}`} aria-labelledby="library-title">
          <div className="library-heading">
            <div>
              <p className="eyebrow">{view === 'identify' ? 'PENDIENTES' : view === 'sample' ? activeEntry ? 'MESA DE SAMPLEO' : 'ELIGE UNA CANCIÓN' : 'COLECCIÓN'}</p>
              <h2 id="library-title">{view === 'identify' ? 'Por revisar' : view === 'sample' ? activeEntry ? activeEntry.media.title : 'Canciones listas para samplear' : 'Canciones validadas'}</h2>
            </div>
            {view === 'sample' && activeEntry
              ? <button className="change-song" type="button" onClick={closeSampler}>Cambiar canción</button>
              : <span>{visibleEntries.length} {visibleEntries.length === 1 ? 'canción' : 'canciones'}</span>}
          </div>
          {view === 'identify' && <details className="evaluation-panel">
            <summary>
              <span>Calidad del análisis</span>
              <span>{evaluation.reviewed} revisados · {evaluation.pending} pendientes</span>
            </summary>
            {evaluation.reviewed === 0 ? (
              <p>Confirma o corrige resultados para empezar a medir la precisión.</p>
            ) : (
              <div className="evaluation-content">
                <div className="evaluation-metrics">
                  <article><span>BPM ±1</span><strong>{evaluation.bpmAccuracy}%</strong></article>
                  <article><span>Tónica</span><strong>{evaluation.tonicAccuracy}%</strong></article>
                  <article><span>Mayor / menor</span><strong>{evaluation.modeAccuracy}%</strong></article>
                  <article><span>Tonalidad completa</span><strong>{evaluation.fullKeyAccuracy}%</strong></article>
                </div>
                <p>
                  {evaluation.confirmed} aciertos confirmados · {evaluation.corrected} correcciones
                  {evaluation.halfDoubleErrors > 0 && ` · ${evaluation.halfDoubleErrors} errores de mitad/doble tempo`}
                </p>
                {evaluation.reviewed < 10 && <small>La muestra todavía es pequeña; necesitaremos al menos 10–20 revisiones para extraer conclusiones.</small>}
              </div>
            )}
          </details>}
          {historyError && <p className="error" role="alert">{historyError}</p>}
          {visibleEntries.length === 0 ? (
            <p className="empty-library">{view === 'identify' ? 'No hay canciones pendientes de revisar.' : 'Todavía no hay canciones validadas en esta sección.'}</p>
          ) : (
            <div className={`history-list ${view === 'sample' && activeEntry ? 'studio-list' : ''}`}>
              {displayedEntries.map((entry) => (
                <article className={`history-entry ${view === 'sample' && activeEntry ? 'studio-entry' : ''}`} key={entry.id}>
                  {entry.media.thumbnailUrl ? <img src={entry.media.thumbnailUrl} alt="" /> : <div className="history-placeholder" />}
                  <div className="history-copy">
                    <strong title={entry.media.title}>{entry.media.title}</strong>
                    <span>{entry.media.channel} · {formatDate(entry.createdAt)}</span>
                    <div className="history-tags">
                      {entry.audioFiles.map((file) => <span key={`${entry.id}-${file.format}`}>{file.format.toUpperCase()}</span>)}
                      {entry.samples.length > 0 && <span>{entry.samples.length} {entry.samples.length === 1 ? 'sample' : 'samples'}</span>}
                      {entry.analysis && <span>{entry.analysis.bpm.toFixed(1)} BPM</span>}
                      {entry.analysis && <span>{entry.analysis.key} {entry.analysis.mode === 'major' ? 'mayor' : 'menor'}</span>}
                      {entry.analysis && <span>{entry.analysis.camelot}</span>}
                      {entry.analysisReview === 'confirmed' && <span className="reviewed">Confirmado</span>}
                      {entry.analysisReview === 'corrected' && <span className="reviewed">Corregido</span>}
                    </div>
                  </div>
                  <div className="history-actions">
                    {view === 'identify' && <button type="button" onClick={() => openIdentification(entry)}>Revisar</button>}
                    {view === 'sample' && !activeEntry && <button type="button" onClick={() => void openSampler(entry)}>Abrir editor</button>}
                    {view === 'collection' && <button type="button" onClick={() => void openSampler(entry)}>Samplear</button>}
                    {view === 'collection' && <button type="button" onClick={() => openIdentification(entry)}>Editar datos</button>}
                    {view === 'collection' && <button type="button" onClick={() => prepareAnotherFormat(entry)}>Otro formato</button>}
                    <button type="button" onClick={() => window.disco.revealFile(entry.filePath)}>Mostrar</button>
                    {view !== 'sample' && <button className="remove-button" type="button" onClick={() => removeHistory(entry.id)}>Quitar</button>}
                  </div>
                  {(view === 'collection' || view === 'sample') && entry.samples.length > 0 && (
                    <details className="associated-samples" open={view === 'sample'}>
                      <summary>{entry.samples.length} {entry.samples.length === 1 ? 'sample asociado' : 'samples asociados'}</summary>
                      <div className="sample-list">
                        {entry.samples.map((sample, index) => (
                          <article className="sample-row" key={sample.id}>
                            <div>
                              <strong>Sample {String(index + 1).padStart(2, '0')}</strong>
                              <span>{formatTimestamp(sample.startSeconds)}–{formatTimestamp(sample.endSeconds)} · {sample.format.toUpperCase()}{sample.normalizePeak ? ' · normalizado' : ''}</span>
                            </div>
                            <div className="sample-row-actions">
                              <button type="button" onClick={() => void toggleSamplePreview(entry.id, sample.id)}>{samplePreviewId === sample.id ? 'Cerrar' : 'Escuchar'}</button>
                              <button type="button" onClick={() => window.disco.revealFile(sample.filePath)}>Localizar</button>
                            </div>
                            {samplePreviewId === sample.id && samplePreviewUrl && <audio src={samplePreviewUrl} controls autoPlay preload="metadata">Tu sistema no permite reproducir este formato.</audio>}
                          </article>
                        ))}
                      </div>
                    </details>
                  )}
                  {view === 'sample' && playingEntryId === entry.id && audioSource && (
                    <div className="history-player">
                      <div className="waveform-panel">
                        {waveformLoading && <div className="waveform-loading">Generando forma de onda…</div>}
                        {waveformUrl && (
                          <>
                          <div
                            className="waveform-view interactive-waveform"
                            ref={waveformRef}
                            onPointerDown={beginWaveformSelection}
                            onPointerMove={moveWaveformSelection}
                            onPointerUp={endWaveformSelection}
                            onPointerCancel={endWaveformSelection}
                            onWheel={handleWaveformWheel}
                          >
                            <img
                              src={waveformUrl}
                              alt="Forma de onda del audio. Arrastra para seleccionar un fragmento. Usa Control y la rueda para ampliar."
                              draggable="false"
                              style={{
                                width: `${waveformZoom * 100}%`,
                                left: `${-(waveformViewStart / Math.max(audioDuration, 1)) * waveformZoom * 100}%`
                              }}
                            />
                            {audioDuration > 0 && (
                              <>
                                {selectionVisible && <div
                                  className={`waveform-selection ${selectionStart < waveformViewStart ? 'clipped-start' : ''} ${selectionEnd > waveformViewEnd ? 'clipped-end' : ''}`}
                                  style={{
                                    left: `${waveformPercent(visibleSelectionStart)}%`,
                                    width: `${waveformPercent(visibleSelectionEnd) - waveformPercent(visibleSelectionStart)}%`
                                  }}
                                >
                                  {selectionStart >= waveformViewStart && <button className="selection-handle start" type="button" aria-label={`Ajustar inicio, ${formatTimestamp(selectionStart)}`} onPointerDown={(event) => beginHandleDrag(event, 'start')} onKeyDown={(event) => adjustSelectionEdge('start', event)} />}
                                  {selectionEnd <= waveformViewEnd && <button className="selection-handle end" type="button" aria-label={`Ajustar final, ${formatTimestamp(selectionEnd)}`} onPointerDown={(event) => beginHandleDrag(event, 'end')} onKeyDown={(event) => adjustSelectionEdge('end', event)} />}
                                </div>}
                                {playheadVisible && <div className="waveform-playhead" aria-hidden="true" style={{ left: `${waveformPercent(playheadTime)}%` }} />}
                                <button className="waveform-zoom" type="button" onClick={resetWaveformZoom} aria-label={`Zoom ${waveformZoom.toFixed(1)}. Restablecer vista completa.`}>{waveformZoom.toFixed(1)}×</button>
                              </>
                            )}
                          </div>
                          {audioDuration > 0 && <div className="waveform-scale" aria-hidden="true"><span>{formatTimestamp(waveformViewStart)}</span><span>{formatTimestamp(waveformViewStart + waveformViewDuration / 2)}</span><span>{formatTimestamp(waveformViewEnd)}</span></div>}
                          </>
                        )}
                        {audioDuration > 0 && (
                          <div className="selection-controls">
                            <label>
                              <span>Inicio · {formatTimestamp(selectionStart)}</span>
                              <input
                                type="range"
                                min="0"
                                max={audioDuration}
                                step="0.01"
                                value={selectionStart}
                                onChange={(event) => changeSelectionStart(Number(event.target.value))}
                              />
                            </label>
                            <label>
                              <span>Final · {formatTimestamp(selectionEnd)}</span>
                              <input
                                type="range"
                                min="0"
                                max={audioDuration}
                                step="0.01"
                                value={selectionEnd}
                                onChange={(event) => {
                                  setSelectionEnd(Math.max(Number(event.target.value), selectionStart + 0.05))
                                  setSelectedBars(null)
                                }}
                              />
                            </label>
                            {activeEntry?.analysis && (
                              <div className="bar-presets">
                                <span>Duración 4/4 · {activeEntry.analysis.bpm.toFixed(1)} BPM</span>
                                {[1, 2, 4, 8].map((bars) => {
                                  const requiredSeconds = (bars * 4 * 60) / activeEntry.analysis!.bpm
                                  return (
                                    <button
                                      className={selectedBars === bars ? 'selected' : ''}
                                      type="button"
                                      key={bars}
                                      disabled={requiredSeconds > audioDuration}
                                      onClick={() => selectBarLength(bars)}
                                    >
                                      {bars} {bars === 1 ? 'compás' : 'compases'}
                                    </button>
                                  )
                                })}
                              </div>
                            )}
                            <div className="selection-actions">
                              <button type="button" onClick={playSelection}>Reproducir selección</button>
                              <label className="loop-option">
                                <input type="checkbox" checked={loopSelection} onChange={(event) => setLoopSelection(event.target.checked)} />
                                Repetir
                              </label>
                              <span>{formatTimestamp(selectionEnd - selectionStart)}</span>
                            </div>
                            <div className="sample-export">
                              <label>
                                Formato
                                <select value={sampleFormat} onChange={(event) => setSampleFormat(event.target.value as SampleFormat)} disabled={exportingSample}>
                                  {SAMPLE_FORMATS.map((value) => <option key={value} value={value}>{value.toUpperCase()}</option>)}
                                </select>
                              </label>
                              <label className="normalize-option" title="Ajusta el pico máximo del fragmento a −1 dBFS sin comprimir su dinámica.">
                                <input type="checkbox" checked={normalizeSample} onChange={(event) => setNormalizeSample(event.target.checked)} disabled={exportingSample} />
                                Normalizar a −1 dB
                              </label>
                              <button type="button" onClick={saveSample} disabled={exportingSample || selectionEnd - selectionStart < 0.05}>
                                {exportingSample ? 'Exportando…' : 'Exportar sample'}
                              </button>
                              {exportedSample && <button className="export-success" type="button" onClick={() => window.disco.revealFile(exportedSample)}>Mostrar sample</button>}
                            </div>
                            {sampleError && <p className="error" role="alert">{sampleError}</p>}
                          </div>
                        )}
                      </div>
                      <audio
                        ref={audioRef}
                        src={audioSource}
                        controls
                        autoPlay
                        preload="metadata"
                        onLoadedMetadata={(event) => {
                          const duration = event.currentTarget.duration
                          setAudioDuration(duration)
                          setPlayheadTime(0)
                          setWaveformZoom(1)
                          setWaveformViewStart(0)
                          setSelectionStart(0)
                          setSelectionEnd(duration)
                          setSelectedBars(null)
                        }}
                        onTimeUpdate={keepPlaybackInsideSelection}
                        onError={() => setHistoryError('No se pudo reproducir este archivo.')}
                      >
                        Tu sistema no permite reproducir este formato de audio.
                      </audio>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>}

        {view === 'organize' && <section className="organize-view">
          <div className="organize-intro"><p className="eyebrow">ORGANIZA</p><h1>Tu colección, con contexto.</h1><p className="intro">Carpetas, etiquetas, favoritos y estados de proyecto estarán aquí sin alterar los archivos originales.</p></div>
          <div className="organize-grid">
            <article><span className="organize-icon">★</span><div><strong>Favoritos</strong><small>Acceso rápido a tus mejores hallazgos</small></div><b>0</b></article>
            <article><span className="organize-icon">#</span><div><strong>Etiquetas</strong><small>Agrupa por género, energía o uso</small></div><b>Próximamente</b></article>
            <article><span className="organize-icon">□</span><div><strong>Proyectos</strong><small>Organiza canciones y samples por beat</small></div><b>Próximamente</b></article>
          </div>
          <details className="evaluation-panel organize-evaluation"><summary><span>Calidad del análisis</span><span>{evaluation.reviewed} revisados · {evaluation.pending} pendientes</span></summary><div className="evaluation-content"><div className="evaluation-metrics"><article><span>BPM ±1</span><strong>{evaluation.bpmAccuracy}%</strong></article><article><span>Tónica</span><strong>{evaluation.tonicAccuracy}%</strong></article><article><span>Mayor / menor</span><strong>{evaluation.modeAccuracy}%</strong></article><article><span>Tonalidad completa</span><strong>{evaluation.fullKeyAccuracy}%</strong></article></div></div></details>
        </section>}
      </section>

      <footer>Usa DISCO únicamente con contenido propio, autorizado o permitido por su licencia.</footer>
      </main>
    </div>
  )
}

export default App
