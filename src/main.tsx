import React from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

function App() {
  return (
    <main className="shell">
      <nav className="nav">
        <div className="brand"><span className="mark">A</span> AEON</div>
        <div className="nav-status"><span className="dot" /> AGENT NETWORK ONLINE</div>
      </nav>

      <section className="hero">
        <div className="eyebrow">THE AGENT ECONOMY · WEBMCP</div>
        <h1>Give your agent a goal.<br /><em>Give it boundaries.</em></h1>
        <p className="lead">AEON lets agents operate the web on your behalf — searching, comparing, negotiating, and preparing decisions while you stay in control.</p>
        <button className="primary" onClick={() => window.location.href = '/mission/new'}>START A MISSION <span>↗</span></button>
      </section>

      <section className="signal-grid">
        <article><span>01</span><h2>Intent</h2><p>Describe the outcome you want in plain language.</p></article>
        <article><span>02</span><h2>Constitution</h2><p>Set the limits your agent cannot cross.</p></article>
        <article><span>03</span><h2>Agency</h2><p>Let the agent act through structured web tools.</p></article>
      </section>

      <footer><span>AEON v0.1</span><span>HUMAN × AGENT</span><span>OPEN WEB</span></footer>
    </main>
  )
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>)
