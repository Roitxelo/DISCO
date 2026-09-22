import type { AudioAnalysis, MediaInfo } from '../../../shared/media'

type IdentifyViewProps = {
  media: MediaInfo
  durationLabel: string
  downloadedFile: string
  analysis: AudioAnalysis | null
  analyzing: boolean
  analysisError: string
  editing: boolean
  review: 'pending' | 'confirmed' | 'corrected'
  bpm: number
  selectedKey: string
  selectedMode: AudioAnalysis['mode']
  selectedCamelot: string
  saving: boolean
  correctionSaved: boolean
  musicalKeys: readonly string[]
  onRevealFile: () => void
  onBpmChange: (bpm: number) => void
  onKeyChange: (key: string) => void
  onModeChange: (mode: AudioAnalysis['mode']) => void
  onEditingChange: (editing: boolean) => void
  onSave: () => void
  onConfirm: () => void
  onCreateSamples: () => void
  onFinish: () => void
}

export function IdentifyView(props: IdentifyViewProps): React.JSX.Element {
  const { media, analysis } = props
  return <article className="media-card identify-card">
    {media.thumbnailUrl ? <img src={media.thumbnailUrl} alt="" /> : <div className="media-placeholder" />}
    <div className="media-copy">
      <div className="identify-track-heading">
        <div><span className="media-source">YouTube · {props.durationLabel}</span><h2>{media.title}</h2><p>{media.channel}</p></div>
        <button className="file-ready" type="button" onClick={props.onRevealFile}>Mostrar archivo</button>
      </div>
      {props.analyzing && <p className="analysis-status" role="status">Detectando BPM y tonalidad…</p>}
      {props.analysisError && <p className="error" role="alert">{props.analysisError}</p>}

      {analysis && <section className="analysis-results" aria-label="Análisis musical estimado">
        <div className="analysis-heading"><span>Motor v{analysis.algorithmVersion ?? 1}</span><small>Confianza · BPM {analysis.bpmConfidence ?? '—'}% · tono {analysis.keyConfidence}%</small></div>
        <div className="analysis-values">
          <article><span>BPM</span>{props.editing ? <>
            <input className="analysis-input" type="number" min="20" max="300" step="0.1" value={props.bpm} aria-label="BPM corregido" onChange={(event) => props.onBpmChange(Number(event.target.value))} />
            <div className="bpm-controls"><button type="button" onClick={() => props.onBpmChange(props.bpm / 2)}>÷2</button><button type="button" onClick={() => props.onBpmChange(analysis.bpm)}>Original</button><button type="button" onClick={() => props.onBpmChange(props.bpm * 2)}>×2</button></div>
          </> : <strong>{analysis.bpm.toFixed(1)}</strong>}</article>
          <article><span>Tonalidad</span>{props.editing ? <div className="key-controls">
            <select value={props.selectedKey} aria-label="Tónica" onChange={(event) => props.onKeyChange(event.target.value)}>{props.musicalKeys.map((key) => <option key={key} value={key}>{key}</option>)}</select>
            <select value={props.selectedMode} aria-label="Modo" onChange={(event) => props.onModeChange(event.target.value as AudioAnalysis['mode'])}><option value="major">Mayor</option><option value="minor">Menor</option></select>
          </div> : <strong>{analysis.key} {analysis.mode === 'major' ? 'mayor' : 'menor'}</strong>}<small>{props.editing ? props.selectedCamelot : analysis.camelot} · Camelot</small></article>
        </div>

        {((analysis.bpmAlternatives?.length ?? 0) > 0 || (analysis.keyAlternatives?.length ?? 0) > 0) && <details className="analysis-alternatives"><summary>Ver alternativas</summary><div>
          {(analysis.bpmAlternatives?.length ?? 0) > 0 && <section><span>BPM posibles</span><div>{analysis.bpmAlternatives!.map((candidate) => <button type="button" key={candidate} onClick={() => { props.onBpmChange(candidate); props.onEditingChange(true) }}>{candidate.toFixed(1)}</button>)}</div></section>}
          {(analysis.keyAlternatives?.length ?? 0) > 0 && <section><span>Tonos posibles</span><div>{analysis.keyAlternatives!.map((candidate) => <button type="button" key={`${candidate.key}-${candidate.mode}`} onClick={() => { props.onKeyChange(candidate.key); props.onModeChange(candidate.mode); props.onEditingChange(true) }}>{candidate.key} {candidate.mode === 'major' ? 'mayor' : 'menor'} · {candidate.camelot}</button>)}</div></section>}
        </div></details>}

        {props.editing ? <div className="review-actions"><button className="secondary-action" type="button" onClick={() => props.onEditingChange(false)}>Cancelar</button><button className="save-correction" type="button" onClick={props.onSave} disabled={props.saving || props.bpm < 20 || props.bpm > 300}>{props.saving ? 'Guardando…' : props.correctionSaved ? 'Corrección guardada' : 'Guardar corrección'}</button></div>
          : props.review === 'pending' ? <div className="review-actions"><button className="secondary-action" type="button" onClick={() => props.onEditingChange(true)}>Corregir</button><button className="confirm-action" type="button" onClick={props.onConfirm} disabled={props.saving}>Datos correctos</button></div>
            : <div className={`review-status ${props.review}`}>{props.review === 'confirmed' ? 'Datos confirmados' : 'Corrección guardada'}<div><button type="button" onClick={() => props.onEditingChange(true)}>Editar</button><button type="button" onClick={props.onCreateSamples}>Crear samples</button><button type="button" onClick={props.onFinish}>Finalizar</button></div></div>}
      </section>}
    </div>
  </article>
}
