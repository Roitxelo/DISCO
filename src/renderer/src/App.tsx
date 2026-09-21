import { useState } from 'react'

function App(): React.JSX.Element {
  const [url, setUrl] = useState('')

  return (
    <main>
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <span>DISCO</span>
        </div>
        <span className="version">v{window.disco.version}</span>
      </header>

      <section className="hero">
        <p className="eyebrow">DOWNLOAD · IDENTIFY · SAMPLE · CONVERT · ORGANIZE</p>
        <h1>Del enlace al estudio.</h1>
        <p className="intro">
          Prepara audio para producir y descubre su BPM y tonalidad desde una sola herramienta.
        </p>

        <form className="url-form" onSubmit={(event) => event.preventDefault()}>
          <label htmlFor="source-url">Enlace de YouTube</label>
          <div className="input-row">
            <input
              id="source-url"
              type="url"
              placeholder="https://www.youtube.com/watch?v=..."
              value={url}
              onChange={(event) => setUrl(event.target.value)}
            />
            <button type="submit" disabled={!url.trim()}>
              Analizar
            </button>
          </div>
        </form>

        <div className="features" aria-label="Próximas funciones">
          <article><strong>WAV</strong><span>Formato principal</span></article>
          <article><strong>— BPM</strong><span>Análisis rítmico</span></article>
          <article><strong>— KEY</strong><span>Tonalidad y Camelot</span></article>
        </div>
      </section>

      <footer>Usa DISCO únicamente con contenido propio, autorizado o permitido por su licencia.</footer>
    </main>
  )
}

export default App
