import { useEffect, useMemo, useState } from 'react'
import { aeonTools } from './webmcp'
import { getMissionConstitution, subscribeMissionConstitution, type MissionConstitution } from './mission-state'
import { subscribeWebMCPTrace, type WebMCPTrace } from './webmcp-observability'
import './agent-console-polish.css'

const labels: Record<string,string> = { create_mission:'Mission authority established', search_products:'Searching the marketplace', compare_products:'Comparing marketplace candidates', negotiate_offer:'Negotiating with seller agent', request_purchase_approval:'Waiting for human approval', human_authority:'Human authority decision', purchase_execution:'Executing approved transaction' }
const money = (n:number) => n ? `₦${n.toLocaleString()}` : 'No ceiling'

export default function AgentConsole(){
 const [mission,setMission]=useState<MissionConstitution>(()=>getMissionConstitution())
 const [traces,setTraces]=useState<WebMCPTrace[]>([])
 const [showDetails,setShowDetails]=useState(false)
 useEffect(()=>subscribeMissionConstitution(setMission),[])
 useEffect(()=>subscribeWebMCPTrace(t=>setTraces(xs=>[...xs,t].slice(-20))),[])
 useEffect(()=>{
   const reset=()=>setTraces([])
   const decision=(event:Event)=>{
     const approved=(event as CustomEvent).type==='aeon:approve-mission'
     const detail=(event as CustomEvent).detail
     const trace:WebMCPTrace={id:`decision_${Date.now()}`,tool:'human_authority',phase:'DECISION',input:detail,output:{decision:approved?'APPROVED':'DECLINED'},timestamp:Date.now()}
     setTraces(xs=>[...xs,trace].slice(-20))
     if(approved){
       window.setTimeout(()=>setTraces(xs=>[...xs,{id:`execution_${Date.now()}`,tool:'purchase_execution',phase:'RESULT',input:detail,output:{status:'released_after_human_approval'},timestamp:Date.now()}].slice(-20)),250)
     }
   }
   window.addEventListener('aeon:mission-started',reset)
   window.addEventListener('aeon:mission-reset',reset)
   window.addEventListener('aeon:approve-mission',decision)
   window.addEventListener('aeon:decline-mission',decision)
   return()=>{window.removeEventListener('aeon:mission-started',reset);window.removeEventListener('aeon:mission-reset',reset);window.removeEventListener('aeon:approve-mission',decision);window.removeEventListener('aeon:decline-mission',decision)}
 },[])
 const current=traces[traces.length-1]
 const currentTool=current?.tool??'create_mission'
 const tool=aeonTools.find(t=>t.name===currentTool)??aeonTools[0]
 const sample=useMemo(()=>currentTool==='search_products'?{query:mission.goal,maxPrice:mission.budget||null}:currentTool==='compare_products'?{productIds:['mission-selected'],priorities:mission.priorities}:currentTool==='negotiate_offer'?{productId:'mission-selected',budget:mission.budget||null}:{goal:mission.goal,budget:mission.budget,canNegotiate:mission.canNegotiate,purchaseRequiresApproval:mission.purchaseRequiresApproval},[currentTool,mission])
 const status=current?.phase==='ERROR'?'ERROR':current?'ACTIVE':'READY'
 return <section className="agent-console"><div className="console-head"><div><div className="kicker">WEBMCP / AGENT CONSOLE</div><h2>AEON is operating this mission.</h2><p className="console-mission">“{mission.goal}”</p></div><span className="console-status">● {status} · MISSION AWARE</span></div><div className="mission-authority-strip"><span><b>CEILING</b>{money(mission.budget)}</span><span><b>NEGOTIATION</b>{mission.canNegotiate?'ENABLED':'DISABLED'}</span><span><b>PURCHASE</b>{mission.purchaseRequiresApproval?'HUMAN APPROVAL':'AUTONOMOUS'}</span></div><div className="console-grid"><nav className="tool-list"><div className="tool-list-label">LIVE CAPABILITIES</div>{aeonTools.map(t=><button className={t.name===currentTool?'selected':''} onClick={()=>setShowDetails(true)} key={t.name}><span>{t.name===currentTool?'●':'○'}</span>{t.name}</button>)}</nav><div className="tool-detail"><div className="tool-title"><span className="tool-badge">{status==='ACTIVE'?'LIVE TOOL CALL':'WEBMCP READY'}</span><h3>{tool.name}</h3></div><p>{labels[tool.name]??tool.description}</p><div className="capability-summary"><span className="capability-icon">✦</span><div><strong>{status==='ACTIVE'?'Executing for this mission':'Waiting for agent activity'}</strong><small>{current?`${current.phase} · ${new Date(current.timestamp).toLocaleTimeString()}`:'The next capability call will appear here.'}</small></div><span className="capability-status">{status}</span></div><div className="live-trace"><div className="live-trace-head"><span>MISSION TRACE</span><small>{traces.length} events</small></div>{traces.length===0?<div className="trace-empty">Start a mission to watch WebMCP calls appear here.</div>:traces.map(t=><div className={`trace-row ${t.phase.toLowerCase()}`} key={t.id}><span>{t.phase==='CALL'?'↗':t.phase==='RESULT'?'✓':t.phase==='DECISION'?'◉':'!'}</span><div><b>{t.tool}</b><small>{labels[t.tool]??'Capability activity'}</small></div><em>{t.phase}</em></div>)}</div><div className="authority-note"><span>HUMAN AUTHORITY</span><p>{mission.purchaseRequiresApproval?'AEON may act within these boundaries, but the final purchase remains locked behind your approval.':'This mission does not require a human purchase checkpoint.'}</p></div><button className="technical-toggle" onClick={()=>setShowDetails(v=>!v)} aria-expanded={showDetails}>{showDetails?'Hide technical details':'View technical details'} <span>{showDetails?'↑':'↓'}</span></button>{showDetails&&<div className="io technical-details"><div><label>LIVE INPUT</label><pre>{JSON.stringify(current?.input??sample,null,2)}</pre></div><div><label>WEBMCP SCHEMA</label><pre>{JSON.stringify(tool.inputSchema,null,2)}</pre></div></div>}</div></div></section>
}