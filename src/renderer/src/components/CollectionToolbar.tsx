type CollectionToolbarProps = {
  search: string
  onSearchChange: (value: string) => void
}

export function CollectionToolbar({ search, onSearchChange }: CollectionToolbarProps): React.JSX.Element {
  return <div className="collection-toolbar" role="search">
    <label>
      <span className="visually-hidden">Buscar en la colección</span>
      <input type="search" value={search} placeholder="Buscar canción o artista…" onChange={(event) => onSearchChange(event.target.value)} />
    </label>
    {search && <button type="button" onClick={() => onSearchChange('')}>Limpiar</button>}
  </div>
}
