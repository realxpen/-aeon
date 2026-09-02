import React,{useEffect} from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import './responsive.css'
import './mobile-compat.css'
import './liquid-glass.css'
import './visual-hierarchy.css'
import './judge-demo.css'
import './demo-mode.css'
import './marketplace-ui.css'
import './phase16-journey.css'
import './phase16-frictionless.css'
import './global-typography.css'
import './mission-nav.css'
import Mission from './mission'
import MarketplaceView from './marketplace-view'
import {registerWebMCP} from './webmcp'
import RuntimeErrorState from './runtime-error-state'
import DemoMode from './demo-mode'
function JudgeBadge(){return new URLSearchParams(window.location.search).has('judge')?<div className="judge-demo-badge"><span className="dot"/> JUDGE DEMO</div>:null}
function MissionHomeNav(){return <button className="mission-home-nav" type="button" aria-label="Back to AEON home" onClick={()=>window.location.href='/'}><span className="mission-home-mark">A</span><span className="mission-home-copy"><strong>AEON</strong><small>BACK TO HOME</small></span><span className="mission-home-arrow">↖</span></button>}
function App(){useEffect(()=>{void registerWebMCP().catch(error=>console.error('[AEON WebMCP] registration failed',error))},[]);const path=window.location.pathname;return path.startsWith('/mission')?<><MissionHomeNav/><Mission/></>:path.startsWith('/marketplace')?<><nav className="nav"><div className="brand"><span className="mark">A</span> AEON</div><div className="nav-status"><span className="dot"/> AGENT NETWORK ONLINE</div></nav><MarketplaceView/></>:<main className="shell"><nav className="nav"><div className="brand"><span className="mark">A</span> AEON</div><div className="nav-status"><span className="dot"/> AGENT NETWORK ONLINE</div></nav><section className="hero"><div className="eyebrow">THE AGENT ECONOMY · WEBMCP</div><h1>Give your agent a goal.<br/><em>Give it boundaries.</em></h1><p className="lead">AEON lets agents operate the web on your behalf — searching, comparing, negotiating, and preparing decisions while you stay in control.</p><button className="primary" onClick={()=>window.location.href='/mission/new'}>START A MISSION <span>↗</span></button><button className="secondary" onClick={()=>window.location.href='/marketplace'}>EXPLORE MARKETPLACE</button></section><section className="signal-grid"><article><span>01</span><h2>Intent</h2><p>Describe the outcome you want in plain language.</p></article><article><span>02</span><h2>Constitution</h2><p>Set the limits your agent cannot cross.</p></article><article><span>03</span><h2>Agency</h2><p>Let the agent act through structured web tools.</p></article></section><footer><span>AEON v0.1</span><span>HUMAN × AGENT</span><span>OPEN WEB</span></footer></main>}
createRoot(document.getElementById('root')!).render(<React.StrictMode><RuntimeErrorState><App/><DemoMode/><JudgeBadge/></RuntimeErrorState></React.StrictMode>)