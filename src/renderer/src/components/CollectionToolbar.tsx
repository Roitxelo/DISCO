export type CollectionSort = 'recent' | 'title' | 'bpm' | 'key'

type CollectionToolbarProps = {
  search: string
  sort: CollectionSort
  onSearchChange: (value: string) => void
  onSortChange: (value: CollectionSort) => void
}

export function CollectionToolbar({ search, sort, onSearchChange, onSortChange }: CollectionToolbarProps): React.JSX.Element {
  return <div className="collection-toolbar" aria-label="Buscar y ordenar la colección">
    <label><span className="visually-hidden">Buscar en la colección</span><input type="search" value={search} placeholder="Buscar canción o artista…" onChange={(event) => onSearchChange(event.target.value)} /></label>
    <label><span>Ordenar</span><select value={sort} onChange={(event) => onSortChange(event.target.value as CollectionSort)}><option value="recent">Más recientes</option><option value="title">Título</option><option value="bpm">BPM</option><option value="key">Tonalidad</option></select></label>
    {search && <button type="button" onClick={() => onSearchChange('')}>Limpiar</button>}
  </div>
}
