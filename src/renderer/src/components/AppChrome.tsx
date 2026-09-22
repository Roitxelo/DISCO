export type AppView = 'download' | 'identify' | 'sample' | 'collection' | 'organize' | 'settings'

type NavigationItem = {
  id: Exclude<AppView, 'settings'>
  label: string
  hint?: string
}

type SidebarProps = {
  view: AppView
  pendingCount: number
  currentLabel: string
  currentDetail: string
  currentActionLabel: string
  canFinishCurrentWork: boolean
  version: string
  onNavigate: (view: AppView) => void
  onContinueCurrentWork: () => void
  onFinishCurrentWork: () => void
}

const VIEW_COPY: Record<AppView, { label: string; description: string }> = {
  download: { label: 'Descarga', description: 'Del enlace al estudio.' },
  identify: { label: 'Identifica', description: 'Revisa antes de guardar.' },
  sample: { label: 'Samplea', description: 'Encuentra el fragmento.' },
  collection: { label: 'Colección', description: 'Tu música, siempre editable.' },
  organize: { label: 'Organiza', description: 'Pon orden a tus proyectos.' },
  settings: { label: 'Ajustes', description: 'Configura tu forma de trabajar.' }
}

export function Sidebar({
  view,
  pendingCount,
  currentLabel,
  currentDetail,
  currentActionLabel,
  canFinishCurrentWork,
  version,
  onNavigate,
  onContinueCurrentWork,
  onFinishCurrentWork
}: SidebarProps): React.JSX.Element {
  const navigation: NavigationItem[] = [
    { id: 'download', label: 'Descarga' },
    { id: 'identify', label: 'Identifica', hint: pendingCount ? String(pendingCount) : undefined },
    { id: 'sample', label: 'Samplea' },
    { id: 'collection', label: 'Colección' },
    { id: 'organize', label: 'Organiza' }
  ]

  return <aside className="sidebar">
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
          onClick={() => onNavigate(item.id)}
        >
          <span className="navigation-label"><b aria-hidden="true">{item.label.charAt(0)}</b>{item.label.slice(1)}</span>
          {item.hint && <span className="navigation-count" aria-label={`${item.hint} pendientes`}>{item.hint}</span>}
        </button>
      ))}
    </nav>
    <section className="current-work" aria-labelledby="current-work-title">
      <span className="sidebar-label" id="current-work-title">Trabajo actual</span>
      <strong title={currentLabel}>{currentLabel}</strong>
      <small>{currentDetail}</small>
      <div className="current-work-actions">
        <button type="button" onClick={onContinueCurrentWork}>{currentActionLabel}</button>
        {canFinishCurrentWork && <button className="finish-work" type="button" onClick={onFinishCurrentWork}>Finalizar trabajo</button>}
      </div>
    </section>
    <button className={`sidebar-settings ${view === 'settings' ? 'active' : ''}`} type="button" aria-current={view === 'settings' ? 'page' : undefined} onClick={() => onNavigate('settings')}>
      <span aria-hidden="true">⚙</span> Ajustes
    </button>
    <div className="sidebar-footer"><span>Motor listo</span><span>v{version}</span></div>
  </aside>
}

export function Topbar({ view }: { view: AppView }): React.JSX.Element {
  const copy = VIEW_COPY[view]
  return <header className="topbar">
    <div>
      <span className="eyebrow">{copy.label}</span>
      <strong>{copy.description}</strong>
    </div>
    <span className="engine-status"><span aria-hidden="true" /> Motor listo</span>
  </header>
}
