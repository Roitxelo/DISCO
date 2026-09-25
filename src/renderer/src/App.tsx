import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from 'react'
import { SAMPLE_FORMATS } from '../../shared/media'
import type { AnalysisComparisonProgress, AnalysisComparisonSummary, AudioAnalysis, AudioFormat, DownloadProgress, HistoryEntry, MediaInfo, ProjectStatus, SampleFormat } from '../../shared/media'
import { evaluateAnalysis } from './analysisEvaluation'
import { Sidebar, Topbar } from './components/AppChrome'
import type { AppView } from './components/AppChrome'
import { DownloadView } from './views/DownloadView'
import { IdentifyView } from './views/IdentifyView'
import { SettingsView } from './views/SettingsView'
import type { AppSettings } from './views/SettingsView'
import { OrganizeView } from './views/OrganizeView'
import { WaveformEditor } from './components/WaveformEditor'
import { CollectionToolbar } from './components/CollectionToolbar'

const SETTINGS_KEY = 'disco:settings:v1'
const DEFAULT_SETTINGS: AppSettings = {
  directory: '',
  downloadFormat: 'wav',
  sampleFormatMode: 'source',
  fixedSampleFormat: 'wav',
  normalizeSamples: false,
  loopSelection: true,
  reduceMotion: false
}

function loadSettings(): AppSettings {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') }
  } catch {
    return DEFAULT_SETTINGS
  }
}

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

function defaultSampleFormat(sourceFormat: AudioFormat): SampleFormat {
  return sourceFormat === 'm4a' ? 'wav' : sourceFormat
}

function App(): React.JSX.Element {
  const [settings, setSettings] = useState<AppSettings>(loadSettings)
  const [view, setView] = useState<AppView>('download')
  const [url, setUrl] = useState('')
  const [media, setMedia] = useState<MediaInfo | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [format, setFormat] = useState<AudioFormat>(() => loadSettings().downloadFormat)
  const [directory, setDirectory] = useState(() => loadSettings().directory)
  const [downloading, setDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null)
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
  const [comparisonRunning, setComparisonRunning] = useState(false)
  const [comparisonProgress, setComparisonProgress] = useState<AnalysisComparisonProgress | null>(null)
  const [comparisonSummary, setComparisonSummary] = useState<AnalysisComparisonSummary | null>(null)
  const [comparisonError, setComparisonError] = useState('')
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [historyError, setHistoryError] = useState('')
  const [playingEntryId, setPlayingEntryId] = useState('')
  const [playingAudioFormat, setPlayingAudioFormat] = useState<AudioFormat | null>(null)
  const [audioSource, setAudioSource] = useState('')
  const [waveformUrl, setWaveformUrl] = useState('')
  const [waveformLoading, setWaveformLoading] = useState(false)
  const [audioDuration, setAudioDuration] = useState(0)
  const [playheadTime, setPlayheadTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [waveformZoom, setWaveformZoom] = useState(1)
  const [waveformViewStart, setWaveformViewStart] = useState(0)
  const [selectionStart, setSelectionStart] = useState(0)
  const [selectionEnd, setSelectionEnd] = useState(0)
  const [loopSelection, setLoopSelection] = useState(() => loadSettings().loopSelection)
  const [sampleFormat, setSampleFormat] = useState<SampleFormat>('wav')
  const [exportingSample, setExportingSample] = useState(false)
  const [exportedSample, setExportedSample] = useState('')
  const [sampleError, setSampleError] = useState('')
  const [samplePreviewId, setSamplePreviewId] = useState('')
  const [samplePreviewUrl, setSamplePreviewUrl] = useState('')
  const [formatPreviewKey, setFormatPreviewKey] = useState('')
  const [formatPreviewUrl, setFormatPreviewUrl] = useState('')
  const [editingSampleId, setEditingSampleId] = useState('')
  const [pendingSampleName, setPendingSampleName] = useState('')
  const [renamingSampleId, setRenamingSampleId] = useState('')
  const [sampleNameDraft, setSampleNameDraft] = useState('')
  const [openSampleMenuId, setOpenSampleMenuId] = useState('')
  const [openSongMenuId, setOpenSongMenuId] = useState('')
  const [normalizeSample, setNormalizeSample] = useState(() => loadSettings().normalizeSamples)
  const [selectedBars, setSelectedBars] = useState<number | null>(null)
  const [organizeSearch, setOrganizeSearch] = useState('')
  const [organizeFavoritesOnly, setOrganizeFavoritesOnly] = useState(false)
  const [organizeStatus, setOrganizeStatus] = useState<ProjectStatus | 'all'>('all')
  const [organizeTag, setOrganizeTag] = useState('all')
  const [collectionSearch, setCollectionSearch] = useState('')
  const [tagDrafts, setTagDrafts] = useState<Record<string, string>>({})
  const [availableAudioFiles, setAvailableAudioFiles] = useState<Record<string, boolean>>({})
  const [availableSamples, setAvailableSamples] = useState<Record<string, boolean>>({})
  const audioRef = useRef<HTMLAudioElement>(null)
  const waveformRef = useRef<HTMLDivElement>(null)
  const dragModeRef = useRef<'selection' | 'move' | 'start' | 'end' | null>(null)
  const dragAnchorRef = useRef(0)
  const dragStartXRef = useRef(0)
  const dragSelectionStartRef = useRef(0)
  const dragSelectionEndRef = useRef(0)
  const playbackUsesSelectionRef = useRef(false)
  const evaluation = useMemo(() => evaluateAnalysis(history), [history])
  const pendingEntries = useMemo(
    () => history.filter((entry) => entry.analysisReview === 'pending'),
    [history]
  )
  const collectionEntries = useMemo(
    () => history.filter((entry) => entry.analysisReview !== 'pending'),
    [history]
  )
  const availableTags = useMemo(
    () => [...new Set(collectionEntries.flatMap((entry) => entry.tags))].sort((a, b) => a.localeCompare(b, 'es')),
    [collectionEntries]
  )
  const filteredCollectionEntries = useMemo(() => {
    const search = collectionSearch.trim().toLocaleLowerCase('es')
    return collectionEntries
      .filter((entry) => !search || `${entry.media.title} ${entry.media.channel}`.toLocaleLowerCase('es').includes(search))
  }, [collectionEntries, collectionSearch])
  const organizedEntries = useMemo(() => {
    const search = organizeSearch.trim().toLocaleLowerCase('es')
    return collectionEntries.filter((entry) => {
      const matchesSearch = !search || `${entry.media.title} ${entry.media.channel} ${entry.tags.join(' ')}`.toLocaleLowerCase('es').includes(search)
      const matchesFavorite = !organizeFavoritesOnly || entry.favorite
      const matchesStatus = organizeStatus === 'all' || entry.projectStatus === organizeStatus
      const matchesTag = organizeTag === 'all' || entry.tags.includes(organizeTag)
      return matchesSearch && matchesFavorite && matchesStatus && matchesTag
    })
  }, [collectionEntries, organizeFavoritesOnly, organizeSearch, organizeStatus, organizeTag])
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
    void refreshAvailability()
  }, [])

  useEffect(() => window.disco.onDownloadProgress(setDownloadProgress), [])

  useEffect(() => window.disco.onAnalysisComparisonProgress(setComparisonProgress), [])

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    document.documentElement.classList.toggle('reduce-motion', settings.reduceMotion)
  }, [settings])

  useEffect(() => {
    const checkFiles = (): void => { void refreshAvailability() }
    window.addEventListener('focus', checkFiles)
    return () => window.removeEventListener('focus', checkFiles)
  }, [])

  async function refreshAvailability(): Promise<void> {
    const result = await window.disco.checkHistoryAvailability()
    if (result.ok) {
      setAvailableAudioFiles(result.audioFiles)
      setAvailableSamples(result.samples)
    }
  }

  useEffect(() => {
    function handlePlaybackShortcut(event: KeyboardEvent): void {
      if (event.code !== 'Space' || event.repeat || view !== 'sample' || !audioSource) return
      const target = event.target as HTMLElement | null
      if (target?.closest('input, select, textarea, button, [contenteditable="true"]')) return
      event.preventDefault()
      togglePlayback()
    }
    window.addEventListener('keydown', handlePlaybackShortcut)
    return () => window.removeEventListener('keydown', handlePlaybackShortcut)
  }, [view, audioSource, audioDuration, selectionStart, selectionEnd])

  useEffect(() => {
    function closeMenus(event: MouseEvent): void {
      if (!(event.target as HTMLElement | null)?.closest('.action-menu')) {
        setOpenSampleMenuId('')
        setOpenSongMenuId('')
      }
    }
    function closeMenusWithKeyboard(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        setOpenSampleMenuId('')
        setOpenSongMenuId('')
      }
    }
    document.addEventListener('click', closeMenus)
    document.addEventListener('keydown', closeMenusWithKeyboard)
    return () => {
      document.removeEventListener('click', closeMenus)
      document.removeEventListener('keydown', closeMenusWithKeyboard)
    }
  }, [])

  async function saveToHistory(filePath: string, audioAnalysis: AudioAnalysis | null): Promise<void> {
    if (!media) return
    const result = await window.disco.saveHistory({ media, format, filePath, analysis: audioAnalysis })
    if (result.ok) {
      setHistory(result.entries)
      await refreshAvailability()
    }
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
    if (selectedDirectory) {
      setDirectory(selectedDirectory)
      setSettings((current) => ({ ...current, directory: selectedDirectory }))
    }
  }

  async function download(): Promise<void> {
    if (!media || !directory) return
    const existingSong = history.find((entry) => entry.media.id === media.id)
    setDownloading(true)
    setDownloadProgress({ phase: 'downloading', percent: 0, detail: 'Iniciando descarga' })
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
        setDownloadProgress({ phase: 'finalizing', percent: 100, detail: 'Detectando BPM y tonalidad' })
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
      setDownloadProgress(null)
      setAnalyzing(false)
    }
  }

  async function cancelDownload(): Promise<void> {
    await window.disco.cancelDownload()
  }

  async function removeHistory(id: string): Promise<void> {
    setHistoryError('')
    const result = await window.disco.removeHistory(id)
    if (result.ok) {
      setHistory(result.entries)
      const stillExists = result.entries.some((entry) => entry.id === id)
      if (stillExists) return
      if (playingEntryId === id) {
        setPlayingEntryId('')
        setPlayingAudioFormat(null)
        setAudioSource('')
        setWaveformUrl('')
      }
      await refreshAvailability()
    }
    else setHistoryError(result.error)
  }

  async function togglePlayer(id: string, audioFormat?: AudioFormat): Promise<void> {
    setHistoryError('')
    if (playingEntryId === id && !audioFormat) {
      setPlayingEntryId('')
      setPlayingAudioFormat(null)
      setAudioSource('')
      setWaveformUrl('')
      setPlayheadTime(0)
      setIsPlaying(false)
      return
    }
    const entry = history.find((item) => item.id === id)
    const selectedFormat = audioFormat ?? entry?.format
    if (!selectedFormat) return
    const result = await window.disco.getAudioSource({ historyId: id, format: selectedFormat })
    if (result.ok) {
      setPlayingEntryId(id)
      setPlayingAudioFormat(selectedFormat)
      setAudioSource(result.url)
      setWaveformUrl('')
      setAudioDuration(0)
      setPlayheadTime(0)
      setIsPlaying(false)
      setWaveformZoom(1)
      setWaveformViewStart(0)
      setSelectionStart(0)
      setSelectionEnd(0)
      setSelectedBars(null)
      setExportedSample('')
      setSampleError('')
      setWaveformLoading(true)
      const waveform = await window.disco.getWaveform({ historyId: id, format: selectedFormat })
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
    if (playingEntryId !== entry.id) {
      setEditingSampleId('')
      setSampleFormat(settings.sampleFormatMode === 'source' ? defaultSampleFormat(entry.format) : settings.fixedSampleFormat)
      setNormalizeSample(settings.normalizeSamples)
      setLoopSelection(settings.loopSelection)
      await togglePlayer(entry.id)
    }
    setView('sample')
  }

  async function openSamplerWithFormat(entry: HistoryEntry, audioFormat: AudioFormat): Promise<void> {
    if (entry.format !== audioFormat) {
      const result = await window.disco.setPrimaryAudioFile({ historyId: entry.id, format: audioFormat })
      if (!result.ok) {
        setHistoryError(result.error)
        return
      }
      setHistory(result.entries)
    }
    setFormatPreviewKey('')
    setFormatPreviewUrl('')
    setEditingSampleId('')
    setSampleFormat(settings.sampleFormatMode === 'source' ? defaultSampleFormat(audioFormat) : settings.fixedSampleFormat)
    setNormalizeSample(settings.normalizeSamples)
    setLoopSelection(settings.loopSelection)
    await togglePlayer(entry.id, audioFormat)
    setView('sample')
  }

  async function setPrimaryFormat(historyId: string, audioFormat: AudioFormat): Promise<void> {
    setHistoryError('')
    const result = await window.disco.setPrimaryAudioFile({ historyId, format: audioFormat })
    if (result.ok) setHistory(result.entries)
    else setHistoryError(result.error)
  }

  async function toggleFormatPreview(historyId: string, audioFormat: AudioFormat): Promise<void> {
    const previewKey = `${historyId}:${audioFormat}`
    setHistoryError('')
    if (formatPreviewKey === previewKey) {
      setFormatPreviewKey('')
      setFormatPreviewUrl('')
      return
    }
    const result = await window.disco.getAudioSource({ historyId, format: audioFormat })
    if (result.ok) {
      setSamplePreviewId('')
      setSamplePreviewUrl('')
      setFormatPreviewKey(previewKey)
      setFormatPreviewUrl(result.url)
    } else setHistoryError(result.error)
  }

  async function removeAudioFormat(historyId: string, audioFormat: AudioFormat): Promise<void> {
    setHistoryError('')
    const result = await window.disco.removeAudioFile({ historyId, format: audioFormat })
    if (!result.ok) {
      setHistoryError(result.error)
      return
    }
    setHistory(result.entries)
    const previewKey = `${historyId}:${audioFormat}`
    const stillExists = result.entries.some((entry) =>
      entry.id === historyId && entry.audioFiles.some((file) => file.format === audioFormat)
    )
    if (!stillExists && formatPreviewKey === previewKey) {
      setFormatPreviewKey('')
      setFormatPreviewUrl('')
    }
    await refreshAvailability()
  }

  async function relinkFile(historyId: string, target: { format: AudioFormat } | { sampleId: string }): Promise<void> {
    setHistoryError('')
    const result = await window.disco.relinkHistoryFile({ historyId, ...target })
    if (result.ok) {
      setHistory(result.entries)
      await refreshAvailability()
    } else setHistoryError(result.error)
  }

  async function updateOrganization(
    historyId: string,
    update: { favorite?: boolean; tags?: string[]; projectStatus?: ProjectStatus }
  ): Promise<void> {
    setHistoryError('')
    const result = await window.disco.updateOrganization({ historyId, ...update })
    if (result.ok) setHistory(result.entries)
    else setHistoryError(result.error)
  }

  async function addTag(entry: HistoryEntry): Promise<void> {
    const tag = (tagDrafts[entry.id] ?? '').trim().replace(/\s+/g, ' ')
    if (!tag || entry.tags.some((current) => current.toLocaleLowerCase('es') === tag.toLocaleLowerCase('es'))) return
    await updateOrganization(entry.id, { tags: [...entry.tags, tag] })
    setTagDrafts((current) => ({ ...current, [entry.id]: '' }))
  }

  async function removeTag(entry: HistoryEntry, tag: string): Promise<void> {
    await updateOrganization(entry.id, { tags: entry.tags.filter((current) => current !== tag) })
    if (organizeTag === tag) setOrganizeTag('all')
  }

  function closeSampler(): void {
    setPlayingEntryId('')
    setPlayingAudioFormat(null)
    setAudioSource('')
    setWaveformUrl('')
    setAudioDuration(0)
    setPlayheadTime(0)
    setIsPlaying(false)
    setWaveformZoom(1)
    setWaveformViewStart(0)
    setExportedSample('')
    setSampleError('')
    setEditingSampleId('')
    setPendingSampleName('')
    setRenamingSampleId('')
    setOpenSampleMenuId('')
    setOpenSongMenuId('')
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
    setPlayingAudioFormat(null)
    setAudioSource('')
    setWaveformUrl('')
    setPlayheadTime(0)
    setIsPlaying(false)
    setSamplePreviewId('')
    setSamplePreviewUrl('')
    setFormatPreviewKey('')
    setFormatPreviewUrl('')
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

  function editSample(sample: HistoryEntry['samples'][number]): void {
    const duration = sample.endSeconds - sample.startSeconds
    setEditingSampleId(sample.id)
    setPendingSampleName(sample.name)
    setSelectionStart(sample.startSeconds)
    setSelectionEnd(sample.endSeconds)
    setSampleFormat(sample.format)
    setNormalizeSample(sample.normalizePeak)
    setExportedSample('')
    setSampleError('')

    const bpm = activeEntry?.analysis?.bpm
    const matchingBars = bpm
      ? [1, 2, 4, 8].find((bars) => Math.abs((bars * 4 * 60) / bpm - duration) < 0.04) ?? null
      : null
    setSelectedBars(matchingBars)

    if (audioDuration > 0) {
      const visibleDuration = Math.min(audioDuration, Math.max(duration * 1.8, audioDuration / 16))
      const zoom = audioDuration / visibleDuration
      const centeredStart = sample.startSeconds - (visibleDuration - duration) / 2
      setWaveformZoom(zoom)
      setWaveformViewStart(Math.min(audioDuration - visibleDuration, Math.max(0, centeredStart)))
    }
  }

  function duplicateSample(sample: HistoryEntry['samples'][number]): void {
    editSample(sample)
    setEditingSampleId('')
    setPendingSampleName(`${sample.name} copia`)
  }

  function beginSampleRename(sample: HistoryEntry['samples'][number]): void {
    setRenamingSampleId(sample.id)
    setSampleNameDraft(sample.name)
  }

  async function saveSampleName(historyId: string, sampleId: string): Promise<void> {
    const name = sampleNameDraft.trim()
    if (!name) return
    const result = await window.disco.renameSample({ historyId, sampleId, name })
    if (result.ok) {
      setHistory(result.entries)
      if (editingSampleId === sampleId) setPendingSampleName(name)
      setRenamingSampleId('')
    } else {
      setHistoryError(result.error)
    }
  }

  async function removeSample(historyId: string, sampleId: string): Promise<void> {
    const result = await window.disco.removeSample(historyId, sampleId)
    if (result.ok) {
      setHistory(result.entries)
      const stillExists = result.entries.some((entry) => entry.samples.some((sample) => sample.id === sampleId))
      if (stillExists) return
      if (samplePreviewId === sampleId) {
        setSamplePreviewId('')
        setSamplePreviewUrl('')
      }
      if (editingSampleId === sampleId) cancelSampleEditing()
      if (renamingSampleId === sampleId) setRenamingSampleId('')
    } else {
      setHistoryError(result.error)
    }
  }

  function cancelSampleEditing(): void {
    setEditingSampleId('')
    setPendingSampleName('')
    setExportedSample('')
    setSampleError('')
  }

  function playSelection(): void {
    const player = audioRef.current
    if (!player) return
    player.currentTime = selectionStart
    setPlayheadTime(selectionStart)
    playbackUsesSelectionRef.current = true
    void player.play()
  }

  function togglePlayback(): void {
    const player = audioRef.current
    if (!player || !audioDuration) return
    if (!player.paused) {
      player.pause()
      return
    }
    const startTime = player.currentTime >= audioDuration - 0.01 ? 0 : player.currentTime
    player.currentTime = startTime
    setPlayheadTime(startTime)
    playbackUsesSelectionRef.current = startTime >= selectionStart && startTime < selectionEnd
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
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function beginHandleDrag(event: ReactPointerEvent<HTMLButtonElement>, edge: 'start' | 'end'): void {
    event.stopPropagation()
    dragModeRef.current = edge
    dragStartXRef.current = event.clientX
    waveformRef.current?.setPointerCapture(event.pointerId)
  }

  function beginSelectionMove(event: ReactPointerEvent<HTMLDivElement>): void {
    event.stopPropagation()
    dragModeRef.current = 'move'
    dragAnchorRef.current = timeFromWaveformPointer(event)
    dragStartXRef.current = event.clientX
    dragSelectionStartRef.current = selectionStart
    dragSelectionEndRef.current = selectionEnd
    waveformRef.current?.setPointerCapture(event.pointerId)
  }

  function moveWaveformSelection(event: ReactPointerEvent<HTMLDivElement>): void {
    const mode = dragModeRef.current
    if (!mode || !audioDuration) return
    const time = timeFromWaveformPointer(event)
    if (mode !== 'move') setSelectedBars(null)
    if (mode === 'start') {
      setSelectionStart(Math.min(time, selectionEnd - 0.05))
      return
    }
    if (mode === 'end') {
      setSelectionEnd(Math.max(time, selectionStart + 0.05))
      return
    }
    if (mode === 'move') {
      const duration = dragSelectionEndRef.current - dragSelectionStartRef.current
      const offset = time - dragAnchorRef.current
      const start = Math.min(
        Math.max(0, dragSelectionStartRef.current + offset),
        Math.max(0, audioDuration - duration)
      )
      setSelectionStart(start)
      setSelectionEnd(Math.min(audioDuration, start + duration))
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
    const wasClick = mode === 'selection' && Math.abs(event.clientX - dragStartXRef.current) < 3
    if (wasClick) {
      const time = timeFromWaveformPointer(event)
      const player = audioRef.current
      if (player) player.currentTime = time
      setPlayheadTime(time)
      playbackUsesSelectionRef.current = time >= selectionStart && time < selectionEnd
    } else if (mode === 'selection') {
      const start = Math.min(dragAnchorRef.current, timeFromWaveformPointer(event))
      const player = audioRef.current
      if (player) player.currentTime = start
      setPlayheadTime(start)
      playbackUsesSelectionRef.current = true
    } else if (mode === 'move') {
      const player = audioRef.current
      if (player) player.currentTime = selectionStart
      setPlayheadTime(selectionStart)
      playbackUsesSelectionRef.current = true
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
    if (waveformZoom > 1) {
      const visibleDuration = audioDuration / waveformZoom
      const visibleEnd = waveformViewStart + visibleDuration
      if (player.currentTime < waveformViewStart || player.currentTime > visibleEnd) {
        setWaveformViewStart(Math.min(
          audioDuration - visibleDuration,
          Math.max(0, player.currentTime - visibleDuration * 0.1)
        ))
      }
    }
    if (!playbackUsesSelectionRef.current || selectionEnd <= selectionStart || player.currentTime < selectionEnd) return
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
      sampleId: editingSampleId || undefined,
      sampleName: pendingSampleName || undefined,
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
        setEditingSampleId('')
        setPendingSampleName('')
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

  async function runAnalysisComparison(): Promise<void> {
    setComparisonRunning(true)
    setComparisonError('')
    setComparisonSummary(null)
    setComparisonProgress({ completed: 0, total: 0, title: 'Preparando banco de prueba' })
    const result = await window.disco.compareAnalysisV3()
    if (result.ok) setComparisonSummary(result.summary)
    else setComparisonError(result.error)
    setComparisonRunning(false)
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

  const visibleEntries = view === 'identify'
    ? pendingEntries
    : view === 'collection'
      ? filteredCollectionEntries
      : view === 'sample'
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
      <Sidebar
        view={view}
        pendingCount={pendingEntries.length}
        currentLabel={currentStep.label}
        currentDetail={currentStep.detail}
        currentActionLabel={!currentEntry ? 'Nueva descarga' : currentEntry.analysisReview === 'pending' ? 'Continuar' : 'Samplear'}
        canFinishCurrentWork={Boolean(currentEntry && currentEntry.analysisReview !== 'pending')}
        version={window.disco.version}
        onNavigate={setView}
        onContinueCurrentWork={() => {
          if (currentEntry && currentStep.target === 'identify') openIdentification(currentEntry)
          else if (currentEntry && currentStep.target === 'sample') void openSampler(currentEntry)
          else setView(currentStep.target)
        }}
        onFinishCurrentWork={finishCurrentWork}
      />

      <main className="app-main">
      <Topbar view={view} />

      <section className="hero">
        {view === 'download' && <DownloadView url={url} media={media} format={format} directory={directory} loading={loading} downloading={downloading} analyzing={analyzing} error={error} progress={downloadProgress} onUrlChange={setUrl} onFormatChange={setFormat} onAnalyze={analyze} onSelectFolder={() => void selectFolder()} onDownload={() => void download()} onCancel={() => void cancelDownload()} />}

        {view === 'identify' && media && downloadedFile && <IdentifyView media={media} durationLabel={formatDuration(media.durationSeconds)} downloadedFile={downloadedFile} analysis={analysis} analyzing={analyzing} analysisError={analysisError} editing={editingAnalysis} review={analysisReview} bpm={displayBpm} selectedKey={selectedKey} selectedMode={selectedMode} selectedCamelot={camelotFor(selectedKey, selectedMode)} saving={savingCorrection} correctionSaved={correctionSaved} musicalKeys={MUSICAL_KEYS} onRevealFile={() => window.disco.revealFile(downloadedFile)} onBpmChange={(value) => { setDisplayBpm(value); setCorrectionSaved(false) }} onKeyChange={(value) => { setSelectedKey(value); setCorrectionSaved(false) }} onModeChange={(value) => { setSelectedMode(value); setCorrectionSaved(false) }} onEditingChange={setEditingAnalysis} onSave={() => void saveCorrection()} onConfirm={() => void confirmAnalysis()} onCreateSamples={() => currentEntry && void openSampler(currentEntry)} onFinish={finishCurrentWork} />}

        {(view === 'identify' || view === 'sample' || view === 'collection') && <section className={`library ${view === 'sample' ? 'sample-library' : ''} ${view === 'sample' && activeEntry ? 'sample-studio' : ''}`} aria-labelledby="library-title">
          <div className="library-heading">
            <div>
              <p className="eyebrow">{view === 'identify' ? 'PENDIENTES' : view === 'sample' ? activeEntry ? 'MESA DE SAMPLEO' : 'ELIGE UNA CANCIÓN' : 'COLECCIÓN'}</p>
              <h2 id="library-title">{view === 'identify' ? 'Por revisar' : view === 'sample' ? activeEntry ? activeEntry.media.title : 'Canciones listas para samplear' : 'Canciones validadas'}</h2>
              {view === 'sample' && activeEntry && playingAudioFormat && <span className="sampler-source">Fuente · {playingAudioFormat.toUpperCase()}</span>}
            </div>
            {view === 'sample' && activeEntry
              ? <button className="change-song" type="button" onClick={closeSampler}>Cambiar canción</button>
              : <span>{visibleEntries.length} {visibleEntries.length === 1 ? 'canción' : 'canciones'}</span>}
          </div>
          {view === 'collection' && <CollectionToolbar search={collectionSearch} onSearchChange={setCollectionSearch} />}
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
                  {evaluation.relativeKeyErrors > 0 && ` · ${evaluation.relativeKeyErrors} confusiones de tonalidad relativa`}
                </p>
                <p>Cobertura con alternativas: {evaluation.bpmCandidateAccuracy}% BPM · {evaluation.keyCandidateAccuracy}% tonalidad</p>
                {evaluation.legacy.reviewed > 0 && evaluation.current.reviewed > 0 && <p>Comparativa: v1 ({evaluation.legacy.reviewed}) {evaluation.legacy.bpmAccuracy}% BPM / {evaluation.legacy.fullKeyAccuracy}% tono · v2 ({evaluation.current.reviewed}) {evaluation.current.bpmAccuracy}% BPM / {evaluation.current.fullKeyAccuracy}% tono</p>}
                {evaluation.lowConfidenceReviews > 0 && <small>{evaluation.lowConfidenceReviews} análisis revisados tenían confianza baja; son los casos más útiles para seguir afinando.</small>}
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
                    {view === 'collection' && <button type="button" disabled={availableAudioFiles[`${entry.id}:${entry.format}`] === false} onClick={() => void openSampler(entry)}>Samplear</button>}
                    {view === 'collection' && <button type="button" onClick={() => openIdentification(entry)}>Editar datos</button>}
                    {view === 'sample' && <button type="button" disabled={availableAudioFiles[`${entry.id}:${entry.format}`] === false} onClick={() => window.disco.revealFile(entry.filePath)}>Mostrar</button>}
                    {view !== 'sample' && <details className="song-menu sample-menu action-menu" open={openSongMenuId === entry.id}>
                      <summary aria-label={`Más acciones para ${entry.media.title}`} aria-expanded={openSongMenuId === entry.id} title="Más acciones" onClick={(event) => { event.preventDefault(); setOpenSampleMenuId(''); setOpenSongMenuId((current) => current === entry.id ? '' : entry.id) }}>•••</summary>
                      <div>
                        {view === 'collection' && <button type="button" onClick={() => { prepareAnotherFormat(entry); setOpenSongMenuId('') }}>Añadir otro formato</button>}
                        <button type="button" disabled={availableAudioFiles[`${entry.id}:${entry.format}`] === false} onClick={() => { window.disco.revealFile(entry.filePath); setOpenSongMenuId('') }}>Mostrar archivo principal</button>
                        <span className="menu-separator" aria-hidden="true" />
                        <button className="destructive" type="button" onClick={() => { setOpenSongMenuId(''); void removeHistory(entry.id) }}>Quitar canción…</button>
                      </div>
                    </details>}
                  </div>
                  {view === 'collection' && (
                    <details className="associated-formats">
                      <summary>Gestionar archivos · {entry.audioFiles.length}</summary>
                      <div className="format-file-list">
                        {entry.audioFiles.map((file) => {
                          const previewKey = `${entry.id}:${file.format}`
                          const isPrimary = entry.format === file.format
                          const isAvailable = availableAudioFiles[previewKey] !== false
                          return (
                            <article className="format-file-row" key={previewKey}>
                              <div className="format-file-copy">
                                <strong>{file.format.toUpperCase()}</strong>
                                <span className={isAvailable ? '' : 'missing-file'}>{isAvailable ? (isPrimary ? 'Principal' : `Añadido ${formatDate(file.createdAt)}`) : 'Archivo no encontrado'}</span>
                              </div>
                              <div className="format-file-actions">
                                <button type="button" disabled={!isAvailable} onClick={() => void toggleFormatPreview(entry.id, file.format)}>
                                  {formatPreviewKey === previewKey ? 'Cerrar' : 'Escuchar'}
                                </button>
                                <button type="button" disabled={!isAvailable} onClick={() => void openSamplerWithFormat(entry, file.format)}>Samplear</button>
                                {!isPrimary && <button type="button" disabled={!isAvailable} onClick={() => void setPrimaryFormat(entry.id, file.format)}>Principal</button>}
                                {isAvailable
                                  ? <button type="button" onClick={() => window.disco.revealFile(file.filePath)}>Localizar</button>
                                  : <button type="button" onClick={() => void relinkFile(entry.id, { format: file.format })}>Enlazar</button>}
                                <button className="destructive" type="button" title={entry.audioFiles.length === 1 ? 'La canción debe conservar un archivo' : 'Eliminar formato'} disabled={entry.audioFiles.length === 1} onClick={() => void removeAudioFormat(entry.id, file.format)}>Eliminar</button>
                              </div>
                              {formatPreviewKey === previewKey && formatPreviewUrl && <audio src={formatPreviewUrl} controls autoPlay preload="metadata">Tu sistema no permite reproducir este formato.</audio>}
                            </article>
                          )
                        })}
                      </div>
                    </details>
                  )}
                  {(view === 'collection' || view === 'sample') && entry.samples.length > 0 && (
                    <details className={`associated-samples ${view === 'sample' ? 'saved-samples' : ''}`}>
                      <summary>{view === 'sample' ? 'Samples guardados' : `${entry.samples.length} ${entry.samples.length === 1 ? 'sample asociado' : 'samples asociados'}`} <span>{view === 'sample' ? entry.samples.length : ''}</span></summary>
                      <div className="sample-list">
                        {entry.samples.map((sample) => (
                          <article className={`sample-row ${editingSampleId === sample.id ? 'editing' : ''}`} key={sample.id}>
                            <div>
                              {renamingSampleId === sample.id ? (
                                <form className="sample-rename" onSubmit={(event) => { event.preventDefault(); void saveSampleName(entry.id, sample.id) }}>
                                  <input value={sampleNameDraft} maxLength={80} aria-label="Nombre del sample" autoFocus onChange={(event) => setSampleNameDraft(event.target.value)} />
                                  <button type="submit" disabled={!sampleNameDraft.trim()}>Guardar</button>
                                  <button type="button" onClick={() => setRenamingSampleId('')}>Cancelar</button>
                                </form>
                              ) : <strong>{sample.name}</strong>}
                              <span className={availableSamples[`${entry.id}:${sample.id}`] === false ? 'missing-file' : ''}>{availableSamples[`${entry.id}:${sample.id}`] === false ? 'Archivo no encontrado' : `${formatTimestamp(sample.startSeconds)}–${formatTimestamp(sample.endSeconds)} · ${sample.format.toUpperCase()}${sample.normalizePeak ? ' · normalizado' : ''}`}</span>
                            </div>
                            <div className="sample-row-actions">
                              <button type="button" disabled={availableSamples[`${entry.id}:${sample.id}`] === false} onClick={() => void toggleSamplePreview(entry.id, sample.id)}>{samplePreviewId === sample.id ? 'Cerrar' : 'Escuchar'}</button>
                              <details className="sample-menu action-menu" open={openSampleMenuId === sample.id}>
                                <summary aria-label={`Más acciones para ${sample.name}`} aria-expanded={openSampleMenuId === sample.id} title="Más acciones" onClick={(event) => { event.preventDefault(); setOpenSongMenuId(''); setOpenSampleMenuId((current) => current === sample.id ? '' : sample.id) }}>•••</summary>
                                <div>
                                  {view === 'sample' && <button type="button" onClick={() => { editSample(sample); setOpenSampleMenuId('') }} disabled={editingSampleId === sample.id}>Editar</button>}
                                  {view === 'sample' && <button type="button" onClick={() => { duplicateSample(sample); setOpenSampleMenuId('') }}>Duplicar</button>}
                                  <button type="button" onClick={() => { beginSampleRename(sample); setOpenSampleMenuId('') }}>Renombrar</button>
                                  {availableSamples[`${entry.id}:${sample.id}`] === false
                                    ? <button type="button" onClick={() => { setOpenSampleMenuId(''); void relinkFile(entry.id, { sampleId: sample.id }) }}>Volver a enlazar</button>
                                    : <button type="button" onClick={() => { window.disco.revealFile(sample.filePath); setOpenSampleMenuId('') }}>Localizar</button>}
                                  <span className="menu-separator" aria-hidden="true" />
                                  <button className="destructive" type="button" onClick={() => { setOpenSampleMenuId(''); void removeSample(entry.id, sample.id) }}>Eliminar</button>
                                </div>
                              </details>
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
                        <WaveformEditor containerRef={waveformRef} loading={waveformLoading} imageUrl={waveformUrl} zoom={waveformZoom} audioDuration={audioDuration} viewStart={waveformViewStart} viewEnd={waveformViewEnd} selectionStart={selectionStart} selectionEnd={selectionEnd} visibleSelectionStart={visibleSelectionStart} visibleSelectionEnd={visibleSelectionEnd} selectionVisible={selectionVisible} playheadTime={playheadTime} playheadVisible={playheadVisible} formatTime={formatTimestamp} percent={waveformPercent} onSelectionStart={beginWaveformSelection} onSelectionMove={moveWaveformSelection} onSelectionEnd={endWaveformSelection} onWheel={handleWaveformWheel} onMoveSelection={beginSelectionMove} onHandleStart={beginHandleDrag} onHandleKey={adjustSelectionEdge} onResetZoom={resetWaveformZoom} />
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
                            <div className="transport" aria-label="Reproductor">
                              <button className="transport-play" type="button" onClick={togglePlayback} aria-label={isPlaying ? 'Pausar' : 'Reproducir'}>
                                <span aria-hidden="true">{isPlaying ? 'Ⅱ' : '▶'}</span>
                              </button>
                              <span className="transport-time">{formatTimestamp(playheadTime)} <small>/ {formatTimestamp(audioDuration)}</small></span>
                              <button className="selection-play" type="button" onClick={playSelection}>Selección</button>
                              <label className="loop-option">
                                <input type="checkbox" checked={loopSelection} onChange={(event) => setLoopSelection(event.target.checked)} />
                                Repetir
                              </label>
                              <span className="selection-duration">{formatTimestamp(selectionEnd - selectionStart)}</span>
                            </div>
                            {(editingSampleId || pendingSampleName) && <div className="sample-editing" role="status"><span>{editingSampleId ? `Editando ${pendingSampleName}` : `Nueva copia · ${pendingSampleName}`}</span><button type="button" onClick={cancelSampleEditing}>Cancelar</button></div>}
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
                                {exportingSample ? 'Exportando…' : editingSampleId ? 'Actualizar sample' : pendingSampleName ? 'Guardar copia' : 'Exportar sample'}
                              </button>
                              {exportedSample && <button className="export-success" type="button" onClick={() => window.disco.revealFile(exportedSample)}>Mostrar sample</button>}
                            </div>
                            {sampleError && <p className="error" role="alert">{sampleError}</p>}
                          </div>
                        )}
                      </div>
                      <audio
                        ref={audioRef}
                        className="audio-engine"
                        src={audioSource}
                        preload="metadata"
                        onLoadedMetadata={(event) => {
                          const duration = event.currentTarget.duration
                          const bpm = activeEntry?.analysis?.bpm
                          const fourBars = bpm ? (4 * 4 * 60) / bpm : 10
                          const initialSelectionEnd = Math.min(duration, fourBars)
                          setAudioDuration(duration)
                          setPlayheadTime(0)
                          setWaveformZoom(1)
                          setWaveformViewStart(0)
                          setSelectionStart(0)
                          setSelectionEnd(initialSelectionEnd)
                          setSelectedBars(bpm && initialSelectionEnd === fourBars ? 4 : null)
                        }}
                        onTimeUpdate={keepPlaybackInsideSelection}
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                        onEnded={() => { setIsPlaying(false); setPlayheadTime(audioDuration) }}
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

        {view === 'settings' && <SettingsView settings={settings} directory={directory} version={window.disco.version} comparisonRunning={comparisonRunning} comparisonProgress={comparisonProgress} comparisonSummary={comparisonSummary} comparisonError={comparisonError} onRunComparison={() => void runAnalysisComparison()} onChange={setSettings} onSelectFolder={() => void selectFolder()} onDownloadFormatChange={(value) => { setSettings((current) => ({ ...current, downloadFormat: value })); setFormat(value) }} />}

        {view === 'organize' && <OrganizeView entries={collectionEntries} visibleEntries={organizedEntries} availableTags={availableTags} search={organizeSearch} favoritesOnly={organizeFavoritesOnly} status={organizeStatus} tag={organizeTag} tagDrafts={tagDrafts} error={historyError} onSearchChange={setOrganizeSearch} onFavoritesChange={setOrganizeFavoritesOnly} onStatusChange={setOrganizeStatus} onTagChange={setOrganizeTag} onTagDraftChange={(id, value) => setTagDrafts((current) => ({ ...current, [id]: value }))} onClear={() => { setOrganizeSearch(''); setOrganizeFavoritesOnly(false); setOrganizeStatus('all'); setOrganizeTag('all') }} onUpdate={(id, update) => void updateOrganization(id, update)} onRemoveTag={(entry, tag) => void removeTag(entry, tag)} onAddTag={(entry, event) => { event.preventDefault(); void addTag(entry) }} />}
      </section>

      <footer>Usa DISCO únicamente con contenido propio, autorizado o permitido por su licencia.</footer>
      </main>
    </div>
  )
}

export default App
