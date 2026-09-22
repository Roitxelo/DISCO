import type { KeyboardEvent, PointerEvent, RefObject, WheelEvent } from 'react'

type WaveformEditorProps = {
  containerRef: RefObject<HTMLDivElement | null>
  loading: boolean
  imageUrl: string
  zoom: number
  audioDuration: number
  viewStart: number
  viewEnd: number
  selectionStart: number
  selectionEnd: number
  visibleSelectionStart: number
  visibleSelectionEnd: number
  selectionVisible: boolean
  playheadTime: number
  playheadVisible: boolean
  formatTime: (seconds: number) => string
  percent: (seconds: number) => number
  onSelectionStart: (event: PointerEvent<HTMLDivElement>) => void
  onSelectionMove: (event: PointerEvent<HTMLDivElement>) => void
  onSelectionEnd: (event: PointerEvent<HTMLDivElement>) => void
  onWheel: (event: WheelEvent<HTMLDivElement>) => void
  onMoveSelection: (event: PointerEvent<HTMLDivElement>) => void
  onHandleStart: (event: PointerEvent<HTMLButtonElement>, edge: 'start' | 'end') => void
  onHandleKey: (edge: 'start' | 'end', event: KeyboardEvent<HTMLButtonElement>) => void
  onResetZoom: () => void
}

export function WaveformEditor(props: WaveformEditorProps): React.JSX.Element {
  const viewDuration = props.viewEnd - props.viewStart
  return <div className="waveform-stage">
    {props.loading && <div className="waveform-loading">Generando forma de onda…</div>}
    {props.imageUrl && <>
      <div className="waveform-view interactive-waveform" ref={props.containerRef} onPointerDown={props.onSelectionStart} onPointerMove={props.onSelectionMove} onPointerUp={props.onSelectionEnd} onPointerCancel={props.onSelectionEnd} onWheel={props.onWheel}>
        <img src={props.imageUrl} alt="Forma de onda. Arrastra para seleccionar o mueve el rango desde su interior." draggable="false" style={{ width: `${props.zoom * 100}%`, left: `${-(props.viewStart / Math.max(props.audioDuration, 1)) * props.zoom * 100}%` }} />
        {props.audioDuration > 0 && <>
          {props.selectionVisible && <div className={`waveform-selection ${props.selectionStart < props.viewStart ? 'clipped-start' : ''} ${props.selectionEnd > props.viewEnd ? 'clipped-end' : ''}`} onPointerDown={props.onMoveSelection} style={{ left: `${props.percent(props.visibleSelectionStart)}%`, width: `${props.percent(props.visibleSelectionEnd) - props.percent(props.visibleSelectionStart)}%` }}>
            <span className="selection-drag-hint" aria-hidden="true">Arrastrar selección</span>
            {props.selectionStart >= props.viewStart && <button className="selection-handle start" type="button" aria-label={`Ajustar inicio, ${props.formatTime(props.selectionStart)}`} onPointerDown={(event) => props.onHandleStart(event, 'start')} onKeyDown={(event) => props.onHandleKey('start', event)} />}
            {props.selectionEnd <= props.viewEnd && <button className="selection-handle end" type="button" aria-label={`Ajustar final, ${props.formatTime(props.selectionEnd)}`} onPointerDown={(event) => props.onHandleStart(event, 'end')} onKeyDown={(event) => props.onHandleKey('end', event)} />}
          </div>}
          {props.playheadVisible && <div className="waveform-playhead" aria-hidden="true" style={{ left: `${props.percent(props.playheadTime)}%` }} />}
          <button className="waveform-zoom" type="button" onClick={props.onResetZoom} aria-label={`Zoom ${props.zoom.toFixed(1)}. Restablecer vista completa.`}>{props.zoom.toFixed(1)}×</button>
        </>}
      </div>
      {props.audioDuration > 0 && <div className="waveform-scale" aria-hidden="true"><span>{props.formatTime(props.viewStart)}</span><span>{props.formatTime(props.viewStart + viewDuration / 2)}</span><span>{props.formatTime(props.viewEnd)}</span></div>}
    </>}
  </div>
}
