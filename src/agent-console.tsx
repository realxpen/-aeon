import { useEffect, useMemo, useState } from 'react'
import { aeonTools } from './webmcp'
import { getMissionConstitution, subscribeMissionConstitution, type MissionConstitution } from './mission-state'
import { subscribeWebMCPTrace, type WebMCPTrace } from './webmcp-observability'
import './agent-console-polish.css'

const labels: Record<string,string> = { create_mission:'Mission authority established', search_products:'Searching the marketplace', compare_products:'Comparing marketplace candidates', negotiate_offer:'Negotiating with seller agent', govern_mission:'Checking the Constitution', constitution_check:'Checking the Constitution', request_purchase_approval:'Waiting for human approval', human_authority:'Human authority decision', purchase_execution:'Executing approved transaction' }
const order = ['create_mission','search_products','compare_products','negotiate_offer','govern_mission','human_authority','purchase_execution']
const money = (n:number) => n ? `₦${n.toLocaleString()}` : 'No ceiling'

type State = 'done'|'active'|'locked'|'blocked'
export default function AgentConsole(){
 const [mission,setMission]=useState<MissionConstitution>(()=>getMissionConstitution())
 const [traces,setTraces]=useState<WebMCPTrace[]>([])
 const [approved,setApproved]=useState(false)
 const [showDetails,setShowDetails]=useState(false)
 useEffect(()=>subscribeMissionConstitution(setMission),[])
 useEffect(()=>subscribeWebMCPTrace(t=>setTraces(xs=>[...xs,t].slice(-20))),[])
 useEffect(()=>{
   const reset=()=>{setTraces([]);setApproved(false)}
   const decision=(event:Event)=>{
     const custom=event as CustomEvent
     const isApproved=custom.type==='aeon:approve-mission'
     setApproved(isApproved)
     setTraces(xs=>[...xs,{id:`decision_${Date.now()}`,tool:'human_authority',phase:'DECISION',input:custom.detail,output:{decision:isApproved?'APPROVED':'DECLINED'},timestamp:Date.now()}].slice(-20))
     if(isApproved) window.setTimeout(()=>setTraces(xs=>[...xs,{id:`execution_${Date.now()}`,tool:'purchase_execution',phase:'RESULT',input:custom.detail,output:{status:'released_after_human_approval'},timestamp:Date.now()}].slice(-20)),250)
   }
   window.addEventListener('aeon:mission-started',reset);window.addEventListener('aeon:mission-reset',reset);window.addEventListener('aeon:approve-mission',decision);window.addEventListener('aeon:decline-mission',decision)
   return()=>{window.removeEventListener('aeon:mission-started',reset);window.removeEventListener('aeon:mission-reset',reset);window.removeEventListener('aeon:approve-mission',decision);window.removeEventListener('aeon:decline-mission',decision)}
 },[])
 const current=traces[traces.length-1]
 const latestTool=current?.tool
 const currentTool=approved?'purchase_execution':latestTool==='request_purchase_approval'||latestTool==='human_authority'?'human_authority':latestTool==='constitution_check'?'govern_mission':latestTool??'create_mission'
 const tool=aeonTools.find(t=>t.name===currentTool)??aeonTools.find(t=>t.name==='create_mission')??aeonTools[0]
 const currentIndex=Math.max(0,order.indexOf(currentTool))
 const stateFor=(name:string):State=>{
   const idx=order.indexOf(name)
   if(name==='purchase_execution') return approved?'active':'locked'
   if(name==='human_authority') return approved?'done':(currentTool==='human_authority'?'active':currentIndex>idx?'done':'locked')
   if(name==='govern_mission') return currentTool==='govern_mission'?'active':currentIndex>idx?'done':'locked'
   if(idx<currentIndex)return 'done'
   if(idx===currentIndex)return 'active'
   return 'locked'
 }
 const stateText=(name:string,state:State)=> state==='done'?(name==='human_authority'?'Approved':'Completed'):state==='active'?(name==='human_authority'?'Waiting for your approval':name==='purchase_execution'?'Executing approved transaction':labels[name]):state==='blocked'?'Blocked':'Locked until required step'
 const status=approved?'APPROVED':currentTool==='human_authority'?'WAITING FOR YOU':current?.phase==='ERROR'?'ERROR':current?'ACTIVE':'READY'
 const sample=useMemo(()=>currentTool==='search_products'?{query:mission.goal,maxPrice:mission.budget||null}:currentTool==='compare_products'?{productIds:['mission-selected'],priorities:mission.priorities}:currentTool==='negotiate_offer'?{productId:'mission-selected',budget:mission.budget||null}:{goal:mission.goal,budget:mission.budget,canNegotiate:mission.canNegotiate,purchaseRequiresApproval:mission.purchaseRequiresApproval},[currentTool,mission])
 const capabilityMessage=approved?'Purchase execution released after human approval.':currentTool==='human_authority'?'AEON finished its work — your approval is required.':current?'Executing for this mission':'Waiting for agent activity'
 const authorityMessage=approved?'Human approval recorded. AEON may now execute the approved transaction within the active Constitution.':mission.purchaseRequiresApproval?'AEON may act within these boundaries, but the final purchase remains locked behind your approval.':'This mission does not require a human purchase checkpoint.'
 return <section className="agent-console"><div className="console-head"><div><div className="kicker">WEBMCP / AGENT CONSOLE</div><h2>AEON is operating this mission.</h2><p className="console-mission">“{mission.goal}”</p></div><span className="console-status">● {status} · MISSION AWARE</span></div><div className="mission-authority-strip"><span><b>CEILING</b>{money(mission.budget)}</span><span><b>NEGOTIATION</b>{mission.canNegotiate?'ENABLED':'DISABLED'}</span><span><b>PURCHASE</b>{mission.purchaseRequiresApproval?'HUMAN APPROVAL':'AUTONOMOUS'}</span></div><div className="console-grid"><nav className="tool-list"><div className="tool-list-label">LIVE CAPABILITIES</div>{order.map(name=>{const state=stateFor(name);return <button className={`capability-${state} ${name===currentTool?'selected':''}`} onClick={()=>setShowDetails(true)} key={name}><span className="capability-dot">{state==='done'?'✓':state==='active'?'●':state==='blocked'?'!':'○'}</span><span className="capability-name">{name}</span><small>{stateText(name,state)}</small></button>})}</nav><div className="tool-detail"><div className="tool-title"><span className="tool-badge">{status==='ACTIVE'?'LIVE TOOL CALL':status==='APPROVED'?'APPROVED':status==='WAITING FOR YOU'?'HUMAN CHECKPOINT':'WEBMCP READY'}</span><h3>{tool.name}</h3></div><p>{labels[tool.name]??tool.description}</p><div className="capability-summary"><span className="capability-icon">✦</span><div><strong>{capabilityMessage}</strong><small>{current?`${current.phase} · ${new Date(current.timestamp).toLocaleTimeString()}`:'The next capability call will appear here.'}</small></div><span className="capability-status">{status}</span></div><div className="live-trace"><div className="live-trace-head"><span>MISSION TRACE</span><small>{traces.length} events</small></div>{traces.length===0?<div className="trace-empty">Start a mission to watch WebMCP calls appear here.</div>:traces.map(t=><div className={`trace-row ${t.phase.toLowerCase()}`} key={t.id}><span>{t.phase==='CALL'?'↗':t.phase==='RESULT'?'✓':t.phase==='DECISION'?'◉':'!'}</span><div><b>{t.tool}</b><small>{labels[t.tool]??'Capability activity'}</small></div><em>{t.phase}</em></div>)}</div><div className="authority-note"><span>HUMAN AUTHORITY</span><p>{authorityMessage}</p></div><button className="technical-toggle" onClick={()=>setShowDetails(v=>!v)} aria-expanded={showDetails}>{showDetails?'Hide technical details':'View technical details'} <span>{showDetails?'↑':'↓'}</span></button>{showDetails&&<div className="io technical-details"><div><label>LIVE INPUT</label><pre>{JSON.stringify(current?.input??sample,null,2)}</pre></div><div><label>WEBMCP SCHEMA</label><pre>{JSON.stringify(tool.inputSchema,null,2)}</pre></div></div>}</div></div></section>
}
