import type { LocalImportProgress } from '../../../shared/media'

type CollectionToolbarProps = {
  search: string
  importing: boolean
  progress: LocalImportProgress | null
  onImport: () => void
  onSearchChange: (value: string) => void
}

export function CollectionToolbar({ search, importing, progress, onImport, onSearchChange }: CollectionToolbarProps): React.JSX.Element {
  return <div className="collection-toolbar" role="search">
    <label>
      <span className="visually-hidden">Buscar en la colección</span>
      <input type="search" value={search} placeholder="Buscar canción o artista…" onChange={(event) => onSearchChange(event.target.value)} />
    </label>
    {search && <button type="button" onClick={() => onSearchChange('')}>Limpiar</button>}
    <button className="collection-import" type="button" disabled={importing} onClick={onImport}>{importing ? `${progress?.completed ?? 0}/${progress?.total || '—'} · Analizando` : '+ Añadir audio'}</button>
  </div>
}
