import {useEffect,useState} from 'react'
import {subscribeWebMCPTrace,type WebMCPTrace} from './webmcp-observability'
import './webmcp-observability-panel.css'

const icon=(phase:WebMCPTrace['phase'])=>phase==='CALL'?'↗':phase==='RESULT'?'✓':'!'
export default function WebMCPObservabilityPanel(){
 const [traces,setTraces]=useState<WebMCPTrace[]>([])
 useEffect(()=>subscribeWebMCPTrace(t=>setTraces(x=>[...x,t].slice(-8))),[])
 return <aside className="webmcp-live-panel" aria-live="polite">
  <div className="webmcp-live-head"><div><span>LIVE INFRASTRUCTURE</span><h3>WebMCP activity</h3></div><b><i/> LIVE</b></div>
  {traces.length===0?<div className="webmcp-empty"><span>◌</span><p>Waiting for the agent…</p><small>Tool calls and seller-agent responses will appear here.</small></div>:<div className="webmcp-trace-list">{traces.map(t=><div className={`webmcp-trace ${t.phase.toLowerCase()}`} key={t.id}><span className="trace-icon">{icon(t.phase)}</span><div><div className="trace-top"><strong>{t.phase}</strong><code>{t.tool}</code></div>{t.phase==='CALL'?<small>Capability invoked</small>:t.phase==='RESULT'?<small>Capability returned a result</small>:<small>Capability failed</small>}</div></div>)}</div>}
 </aside>
}
