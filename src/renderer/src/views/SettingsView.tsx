import { AUDIO_FORMATS, SAMPLE_FORMATS } from '../../../shared/media'
import type { AnalysisComparisonProgress, AnalysisComparisonSummary, AudioFormat, SampleFormat } from '../../../shared/media'

export type AppSettings = {
  directory: string
  downloadFormat: AudioFormat
  sampleFormatMode: 'source' | 'fixed'
  fixedSampleFormat: SampleFormat
  normalizeSamples: boolean
  loopSelection: boolean
  reduceMotion: boolean
}

type SettingsViewProps = {
  settings: AppSettings
  directory: string
  version: string
  comparisonRunning: boolean
  comparisonProgress: AnalysisComparisonProgress | null
  comparisonSummary: AnalysisComparisonSummary | null
  comparisonError: string
  onRunComparison: () => void
  onChange: (settings: AppSettings) => void
  onSelectFolder: () => void
  onDownloadFormatChange: (format: AudioFormat) => void
}

export function SettingsView({ settings, directory, version, comparisonRunning, comparisonProgress, comparisonSummary, comparisonError, onRunComparison, onChange, onSelectFolder, onDownloadFormatChange }: SettingsViewProps): React.JSX.Element {
  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]): void => onChange({ ...settings, [key]: value })
  return <section className="settings-view">
    <div className="settings-intro"><p className="eyebrow">AJUSTES</p><h1>Tu flujo, a tu manera.</h1><p className="intro">DISCO recordará estas preferencias la próxima vez que lo abras.</p></div>
    <div className="settings-groups">
      <section className="settings-group" aria-labelledby="download-settings-title">
        <div><span className="settings-icon" aria-hidden="true">↓</span><div><h2 id="download-settings-title">Descargas</h2><p>Destino y formato que DISCO seleccionará al empezar.</p></div></div>
        <label className="settings-row settings-folder"><span><strong>Carpeta predeterminada</strong><small title={directory}>{directory || 'Todavía no has elegido una carpeta'}</small></span><button type="button" onClick={onSelectFolder}>{directory ? 'Cambiar' : 'Elegir'}</button></label>
        <label className="settings-row"><span><strong>Formato de descarga</strong><small>Se puede cambiar en cada descarga.</small></span><select value={settings.downloadFormat} onChange={(event) => onDownloadFormatChange(event.target.value as AudioFormat)}>{AUDIO_FORMATS.map((format) => <option value={format} key={format}>{format.toUpperCase()}</option>)}</select></label>
      </section>
      <section className="settings-group" aria-labelledby="sample-settings-title">
        <div><span className="settings-icon" aria-hidden="true">◫</span><div><h2 id="sample-settings-title">Samplea</h2><p>Valores iniciales para nuevos fragmentos.</p></div></div>
        <label className="settings-row"><span><strong>Formato inicial</strong><small>Seguir la fuente evita conversiones innecesarias.</small></span><select value={settings.sampleFormatMode} onChange={(event) => update('sampleFormatMode', event.target.value as AppSettings['sampleFormatMode'])}><option value="source">Seguir la fuente</option><option value="fixed">Formato fijo</option></select></label>
        {settings.sampleFormatMode === 'fixed' && <label className="settings-row"><span><strong>Formato fijo</strong><small>Aplicado al abrir una canción en Samplea.</small></span><select value={settings.fixedSampleFormat} onChange={(event) => update('fixedSampleFormat', event.target.value as SampleFormat)}>{SAMPLE_FORMATS.map((format) => <option value={format} key={format}>{format.toUpperCase()}</option>)}</select></label>}
        <label className="settings-row toggle-row"><span><strong>Normalizar samples</strong><small>Ajusta el pico a −1 dBFS por defecto.</small></span><input type="checkbox" checked={settings.normalizeSamples} onChange={(event) => update('normalizeSamples', event.target.checked)} /></label>
        <label className="settings-row toggle-row"><span><strong>Repetir selección</strong><small>Activa el bucle al abrir Samplea.</small></span><input type="checkbox" checked={settings.loopSelection} onChange={(event) => update('loopSelection', event.target.checked)} /></label>
      </section>
      <section className="settings-group" aria-labelledby="interface-settings-title">
        <div><span className="settings-icon" aria-hidden="true">Aa</span><div><h2 id="interface-settings-title">Interfaz</h2><p>Comportamiento visual y accesibilidad.</p></div></div>
        <label className="settings-row toggle-row"><span><strong>Reducir animaciones</strong><small>Desactiva transiciones y movimientos decorativos.</small></span><input type="checkbox" checked={settings.reduceMotion} onChange={(event) => update('reduceMotion', event.target.checked)} /></label>
        <div className="settings-row app-version"><span><strong>Versión de DISCO</strong><small>Aplicación de escritorio</small></span><code>v{version}</code></div>
      </section>
      <section className="settings-group" aria-labelledby="analysis-test-title">
        <div><span className="settings-icon" aria-hidden="true">V3</span><div><h2 id="analysis-test-title">Banco de análisis</h2><p>Compara v2 y v3 sin modificar tus correcciones ni el historial.</p></div></div>
        <div className="settings-row analysis-comparison-row">
          <span><strong>Comparar canciones revisadas</strong><small>{comparisonRunning && comparisonProgress ? `${comparisonProgress.completed}/${comparisonProgress.total || '—'} · ${comparisonProgress.title}` : 'Procesa de nuevo los archivos locales y conserva v2 como referencia.'}</small></span>
          <button type="button" disabled={comparisonRunning} onClick={onRunComparison}>{comparisonRunning ? 'Analizando…' : 'Ejecutar prueba'}</button>
        </div>
        {comparisonRunning && <div className="comparison-progress" role="status" aria-live="polite"><progress max={Math.max(1, comparisonProgress?.total ?? 1)} value={comparisonProgress?.completed ?? 0} /></div>}
        {comparisonError && <p className="comparison-error" role="alert">{comparisonError}</p>}
        {comparisonSummary && <div className="comparison-results" role="status">
          <div><span>BPM principal</span><strong>v2 {comparisonSummary.bpmV2Hits}/{comparisonSummary.reviewed}</strong><strong>v3 {comparisonSummary.bpmV3Hits}/{comparisonSummary.reviewed}</strong></div>
          <div><span>BPM con alternativas</span><strong>v2 {comparisonSummary.bpmV2CandidateHits}/{comparisonSummary.reviewed}</strong><strong>v3 {comparisonSummary.bpmV3CandidateHits}/{comparisonSummary.reviewed}</strong></div>
          <div><span>Tonalidad principal</span><strong>v2 {comparisonSummary.keyV2Hits}/{comparisonSummary.reviewed}</strong><strong>v3 {comparisonSummary.keyV3Hits}/{comparisonSummary.reviewed}</strong></div>
          <div><span>Tono con alternativas</span><strong>v2 {comparisonSummary.keyV2CandidateHits}/{comparisonSummary.reviewed}</strong><strong>v3 {comparisonSummary.keyV3CandidateHits}/{comparisonSummary.reviewed}</strong></div>
        </div>}
      </section>
    </div>
  </section>
}
