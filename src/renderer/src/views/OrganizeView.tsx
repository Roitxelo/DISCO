import type { FormEvent } from 'react'
import { PROJECT_STATUSES } from '../../../shared/media'
import type { HistoryEntry, ProjectStatus } from '../../../shared/media'

const STATUS_LABELS: Record<ProjectStatus, string> = { new: 'Nueva', reviewing: 'En proceso', sampled: 'Sampleada', archived: 'Archivada' }

type OrganizeViewProps = {
  entries: HistoryEntry[]
  visibleEntries: HistoryEntry[]
  availableTags: string[]
  search: string
  favoritesOnly: boolean
  status: ProjectStatus | 'all'
  tag: string
  tagDrafts: Record<string, string>
  error: string
  onSearchChange: (value: string) => void
  onFavoritesChange: (value: boolean) => void
  onStatusChange: (value: ProjectStatus | 'all') => void
  onTagChange: (value: string) => void
  onTagDraftChange: (id: string, value: string) => void
  onClear: () => void
  onUpdate: (id: string, update: { favorite?: boolean; projectStatus?: ProjectStatus }) => void
  onRemoveTag: (entry: HistoryEntry, tag: string) => void
  onAddTag: (entry: HistoryEntry, event: FormEvent<HTMLFormElement>) => void
}

export function OrganizeView(props: OrganizeViewProps): React.JSX.Element {
  const filtered = props.search || props.favoritesOnly || props.status !== 'all' || props.tag !== 'all'
  return <section className="organize-view">
    <div className="organize-intro"><div><p className="eyebrow">ORGANIZA</p><h1>Tu colección, con contexto.</h1></div><p className="intro">Estados, favoritos y etiquetas para encontrar cada idea sin recorrer toda la biblioteca.</p></div>
    <div className="organize-overview" aria-label="Resumen de la colección">
      <button type="button" className={props.favoritesOnly ? 'active' : ''} aria-pressed={props.favoritesOnly} onClick={() => props.onFavoritesChange(!props.favoritesOnly)}><span>★</span><strong>{props.entries.filter((entry) => entry.favorite).length}</strong><small>Favoritas</small></button>
      {PROJECT_STATUSES.map((status) => <button type="button" className={props.status === status ? 'active' : ''} aria-pressed={props.status === status} key={status} onClick={() => props.onStatusChange(props.status === status ? 'all' : status)}><strong>{props.entries.filter((entry) => entry.projectStatus === status).length}</strong><small>{STATUS_LABELS[status]}</small></button>)}
    </div>
    <div className="organize-toolbar" aria-label="Filtros de colección">
      <label className="organize-search"><span className="visually-hidden">Buscar canciones o etiquetas</span><input type="search" value={props.search} placeholder="Buscar canción, artista o etiqueta…" onChange={(event) => props.onSearchChange(event.target.value)} /></label>
      <label><span>Estado</span><select value={props.status} onChange={(event) => props.onStatusChange(event.target.value as ProjectStatus | 'all')}><option value="all">Todos</option>{PROJECT_STATUSES.map((status) => <option value={status} key={status}>{STATUS_LABELS[status]}</option>)}</select></label>
      <label><span>Etiqueta</span><select value={props.tag} onChange={(event) => props.onTagChange(event.target.value)}><option value="all">Todas</option>{props.availableTags.map((tag) => <option value={tag} key={tag}>{tag}</option>)}</select></label>
      {filtered && <button className="clear-filters" type="button" onClick={props.onClear}>Limpiar</button>}
    </div>
    {props.error && <p className="error" role="alert">{props.error}</p>}
    <div className="organize-results-heading"><strong>{props.visibleEntries.length} {props.visibleEntries.length === 1 ? 'canción' : 'canciones'}</strong><span>Guardado automático</span></div>
    {props.visibleEntries.length === 0 ? <p className="empty-library">No hay canciones que coincidan con estos filtros.</p> : <div className="organized-list">
      {props.visibleEntries.map((entry) => <article className="organized-entry" key={entry.id}>
        <button className={`favorite-button ${entry.favorite ? 'active' : ''}`} type="button" aria-label={entry.favorite ? `Quitar ${entry.media.title} de favoritos` : `Añadir ${entry.media.title} a favoritos`} aria-pressed={entry.favorite} onClick={() => props.onUpdate(entry.id, { favorite: !entry.favorite })}>★</button>
        {entry.media.thumbnailUrl ? <img src={entry.media.thumbnailUrl} alt="" /> : <div className="organized-placeholder" />}
        <div className="organized-copy"><strong title={entry.media.title}>{entry.media.title}</strong><span>{entry.media.channel}{entry.analysis ? ` · ${entry.analysis.bpm.toFixed(1)} BPM · ${entry.analysis.camelot}` : ''}</span><div className="organized-tags">{entry.tags.map((tag) => <button type="button" key={tag} title={`Quitar etiqueta ${tag}`} onClick={() => props.onRemoveTag(entry, tag)}>#{tag}<span aria-hidden="true"> ×</span></button>)}{entry.tags.length === 0 && <small>Sin etiquetas</small>}</div></div>
        <label className="status-control"><span className="visually-hidden">Estado de {entry.media.title}</span><select value={entry.projectStatus} onChange={(event) => props.onUpdate(entry.id, { projectStatus: event.target.value as ProjectStatus })}>{PROJECT_STATUSES.map((status) => <option value={status} key={status}>{STATUS_LABELS[status]}</option>)}</select></label>
        <details className="tag-editor"><summary aria-label={`Añadir etiqueta a ${entry.media.title}`}>+ Etiqueta</summary><form onSubmit={(event) => props.onAddTag(entry, event)}><input value={props.tagDrafts[entry.id] ?? ''} maxLength={30} placeholder="Ej. soul, oscuro…" aria-label="Nueva etiqueta" onChange={(event) => props.onTagDraftChange(entry.id, event.target.value)} /><button type="submit" disabled={!(props.tagDrafts[entry.id] ?? '').trim()}>Añadir</button></form></details>
      </article>)}
    </div>}
  </section>
}
