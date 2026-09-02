import { useEffect, useMemo, useState } from 'react'
import { aeonTools } from './webmcp'
import { getMissionConstitution, subscribeMissionConstitution, type MissionConstitution } from './mission-state'
import { subscribeWebMCPTrace, type WebMCPTrace } from './webmcp-observability'
import './agent-console-polish.css'

const labels: Record<string,string> = {
  create_mission:'Mission authority established',
  search_products:'Searching the marketplace',
  compare_products:'Comparing marketplace candidates',
  negotiate_offer:'Negotiating with seller agent',
  govern_mission:'Checking the Constitution',
  constitution_check:'Checking the Constitution',
  request_purchase_approval:'Waiting for human approval',
  human_authority:'Human authority decision',
  purchase_execution:'Executing approved transaction'
}

const order = ['create_mission','search_products','compare_products','negotiate_offer','govern_mission','human_authority','purchase_execution']
const phaseTool:Record<string,string>={
  SEARCHING:'search_products',
  ANALYZING:'compare_products',
  NEGOTIATING:'negotiate_offer',
  'CONSTITUTION CHECK':'govern_mission',
  'HUMAN APPROVAL':'human_authority',
  'EXECUTION RELEASED':'purchase_execution'
}
const money = (n:number) => n ? `₦${n.toLocaleString()}` : 'No ceiling'
type State='done'|'active'|'locked'|'blocked'

type AgentConsoleProps={
  phase?:string
  proposalTotal?:number
}

const internalSchemas:Record<string,Record<string,unknown>>={
  govern_mission:{type:'object',properties:{missionId:{type:'string'},goal:{type:'string'},originalCeiling:{type:'number'},authorizedCeiling:{type:'number'},proposedTotal:{type:'number'},remainingAuthority:{type:'number'},canNegotiate:{type:'boolean'},purchaseRequiresApproval:{type:'boolean'}},required:['missionId','authorizedCeiling','proposedTotal']},
  human_authority:{type:'object',properties:{missionId:{type:'string'},decision:{type:'string',enum:['APPROVE','DECLINE']},proposedTotal:{type:'number'},authorizedCeiling:{type:'number'},remainingAuthority:{type:'number'}},required:['missionId','decision','proposedTotal','authorizedCeiling']},
  purchase_execution:{type:'object',properties:{missionId:{type:'string'},approvalStatus:{type:'string',enum:['APPROVED']},productId:{type:'string'},productName:{type:'string'},merchant:{type:'string'},quantity:{type:'number'},originalPrice:{type:'number'},negotiatedPrice:{type:'number'},saving:{type:'number'},total:{type:'number'},authorizedCeiling:{type:'number'},negotiationRounds:{type:'number'}},required:['missionId','approvalStatus','productId','total','authorizedCeiling']}
}

function unwrapInput(input:any){return input?.input??input?.payload??input}
function normalizeTool(name?:string){if(name==='constitution_check')return'govern_mission';if(name==='request_purchase_approval')return'human_authority';return name??''}
function enrichExecution(input:any, mission:MissionConstitution, proposalTotal:number){const raw=unwrapInput(input)??{};const products=Array.isArray(raw.products)?raw.products:[];const deals=Array.isArray(raw.deals)?raw.deals:[];const product=products[0];const deal=deals.find((d:any)=>d?.status==='approved')??deals[0];const negotiated=deal?.acceptedPrice??product?.price??raw.total??proposalTotal;return {missionId:raw.missionId??'active-mission',goal:mission.goal,product:product?{id:product.id,name:product.name,category:product.category,merchant:product.merchant}:undefined,quantity:raw.quantity??1,originalPrice:product?.originalPrice??product?.price,negotiatedPrice:negotiated,saving:deal?.saving??Math.max(0,(product?.originalPrice??product?.price??negotiated)-negotiated),total:raw.total??proposalTotal??negotiated,authorizedCeiling:mission.budget,remainingAuthority:Math.max(0,mission.budget-(raw.total??proposalTotal??negotiated)),approvalStatus:raw.approvalStatus??(deal?.status==='approved'?'APPROVED':undefined),negotiationRounds:deal?.rounds??0,purchaseRequiresApproval:mission.purchaseRequiresApproval}}
function enrichGovernance(input:any,mission:MissionConstitution,proposalTotal:number){const raw=unwrapInput(input)??{};const proposed=raw?.proposedTotal??raw?.total??proposalTotal??0;return {...raw,missionId:raw?.missionId??'active-mission',goal:raw?.goal??mission.goal,originalCeiling:raw?.originalCeiling??mission.budget,authorizedCeiling:raw?.authorizedCeiling??mission.budget,proposedTotal:proposed,remainingAuthority:Math.max(0,mission.budget-proposed),canNegotiate:mission.canNegotiate,purchaseRequiresApproval:mission.purchaseRequiresApproval}}

export default function AgentConsole({phase,proposalTotal=0}:AgentConsoleProps){
  const [mission,setMission]=useState<MissionConstitution>(()=>getMissionConstitution())
  const [traces,setTraces]=useState<WebMCPTrace[]>([])
  const [approved,setApproved]=useState(false)
  const [showDetails,setShowDetails]=useState(false)
  const [inspectedTool,setInspectedTool]=useState<string|null>(null)

  useEffect(()=>subscribeMissionConstitution(setMission),[])
  useEffect(()=>subscribeWebMCPTrace(t=>setTraces(xs=>[...xs,t].slice(-24)),()=>{setTraces([]);setApproved(false);setInspectedTool(null);setShowDetails(false)}),[])
  useEffect(()=>{const decision=(event:Event)=>{const custom=event as CustomEvent;const isApproved=custom.type==='aeon:approve-mission';setApproved(isApproved);setTraces(xs=>[...xs,{id:`decision_${Date.now()}`,tool:'human_authority',phase:'DECISION',input:custom.detail,output:{decision:isApproved?'APPROVED':'DECLINED'},timestamp:Date.now()}].slice(-24));if(isApproved)window.setTimeout(()=>setTraces(xs=>[...xs,{id:`execution_${Date.now()}`,tool:'purchase_execution',phase:'RESULT',input:custom.detail,output:{status:'released_after_human_approval'},timestamp:Date.now()}].slice(-24)),250)};window.addEventListener('aeon:approve-mission',decision);window.addEventListener('aeon:decline-mission',decision);return()=>{window.removeEventListener('aeon:approve-mission',decision);window.removeEventListener('aeon:decline-mission',decision)}},[])

  const latestTrace=traces[traces.length-1]
  const fallbackTool=approved?'purchase_execution':latestTrace?normalizeTool(latestTrace.tool):'create_mission'
  const liveTool=phaseTool[phase??'']??fallbackTool
  const currentIndex=Math.max(0,order.indexOf(liveTool))

  useEffect(()=>{setInspectedTool(null);setShowDetails(false)},[liveTool])

  const stateFor=(name:string):State=>{const idx=order.indexOf(name);if(idx<0)return'locked';if(idx<currentIndex)return'done';if(idx===currentIndex)return'active';return'locked'}
  const viewedTool=inspectedTool??liveTool
  const viewedState=stateFor(viewedTool)
  const viewedTraces=traces.filter(t=>normalizeTool(t.tool)===viewedTool)
  const viewedTrace=viewedTraces[viewedTraces.length-1]
  const viewedResult=[...viewedTraces].reverse().find(t=>t.phase==='RESULT'||t.phase==='DECISION')
  const schemaToolName=viewedTool==='human_authority'?'request_purchase_approval':viewedTool
  const tool=aeonTools.find(t=>t.name===schemaToolName)??null

  const status=useMemo(()=>{if(viewedTrace?.phase==='ERROR')return'ERROR';if(viewedTool!==liveTool)return viewedState==='done'?'COMPLETED':'LOCKED';if(viewedTool==='purchase_execution')return'RELEASED';if(viewedTool==='human_authority')return'WAITING FOR YOU';return'ACTIVE'},[viewedTrace,viewedTool,liveTool,viewedState])
  const stateText=(name:string,state:State)=>state==='done'?(name==='human_authority'?'Approved':'Completed'):state==='active'?(name==='human_authority'?'Waiting for your approval':name==='purchase_execution'?'Execution authority released':labels[name]):state==='blocked'?'Blocked':'Locked until required step'

  const detail=useMemo(()=>{const raw=unwrapInput(viewedTrace?.input);if(viewedTool==='purchase_execution')return enrichExecution(raw,mission,proposalTotal);if(viewedTool==='govern_mission')return enrichGovernance(raw,mission,proposalTotal);if(viewedTool==='human_authority')return {...(raw??{}),missionId:raw?.missionId??'active-mission',goal:mission.goal,proposedTotal:raw?.proposedTotal??raw?.total??proposalTotal,authorizedCeiling:raw?.authorizedCeiling??mission.budget,remainingAuthority:Math.max(0,mission.budget-(raw?.proposedTotal??raw?.total??proposalTotal)),purchaseRequiresApproval:mission.purchaseRequiresApproval};return raw??{goal:mission.goal,budget:mission.budget,canNegotiate:mission.canNegotiate,purchaseRequiresApproval:mission.purchaseRequiresApproval}},[viewedTrace,viewedTool,mission,proposalTotal])
  const result=useMemo(()=>viewedResult?.output??{status:viewedState==='done'?'completed':viewedState==='active'?'in_progress':'not_started',capability:viewedTool},[viewedResult,viewedState,viewedTool])
  const schema=tool?.inputSchema??internalSchemas[viewedTool]??{type:'object',properties:{},required:[]}

  const capabilityMessage=viewedState==='done'?'Completed for this mission.':viewedState==='locked'?'Waiting for the required earlier step.':viewedTool==='human_authority'?'AEON finished its autonomous work — your decision is required.':viewedTool==='purchase_execution'?'Human approval received — execution authority is released.':labels[viewedTool]??tool?.description??'AEON capability active'
  const authorityMessage=liveTool==='purchase_execution'?'Human approval recorded. AEON may now execute only the approved transaction within the active Constitution.':liveTool==='human_authority'?'AEON has reached the human boundary. The proposed purchase is locked until you approve or decline it.':mission.purchaseRequiresApproval?'AEON may search, evaluate and negotiate within these boundaries, but the final purchase remains locked behind your approval.':'This mission does not require a human purchase checkpoint.'
  const detailTitle=viewedTool==='govern_mission'?'CONSTITUTION INPUT':viewedTool==='human_authority'?'HUMAN DECISION INPUT':viewedTool==='purchase_execution'?'EXECUTION INPUT':'CAPABILITY INPUT'
  const badge=status==='ACTIVE'?'LIVE STAGE':status==='RELEASED'?'EXECUTION RELEASED':status==='WAITING FOR YOU'?'HUMAN CHECKPOINT':status==='COMPLETED'?'COMPLETED':status==='ERROR'?'ERROR':'LOCKED'

  return <section className="agent-console">
    <div className="console-head"><div><div className="kicker">WEBMCP / AGENT CONSOLE</div><h2>AEON is operating this mission.</h2><p className="console-mission">“{mission.goal}”</p></div><span className="console-status">● {liveTool==='human_authority'?'HUMAN CHECKPOINT':liveTool==='purchase_execution'?'AUTHORITY RELEASED':'MISSION ACTIVE'} · MISSION AWARE</span></div>
    <div className="mission-authority-strip"><span><b>CEILING</b>{money(mission.budget)}</span><span><b>NEGOTIATION</b>{mission.canNegotiate?'ENABLED':'DISABLED'}</span><span><b>PURCHASE</b>{mission.purchaseRequiresApproval?'HUMAN APPROVAL':'AUTONOMOUS'}</span></div>
    <div className="console-grid">
      <nav className="tool-list"><div className="tool-list-label">MISSION CAPABILITIES</div>{order.map(name=>{const state=stateFor(name);const selected=name===viewedTool;return <button className={`capability-${state} ${selected?'selected':''}`} onClick={()=>{setInspectedTool(name===liveTool?null:name);setShowDetails(false)}} key={name}><span className="capability-dot">{state==='done'?'✓':state==='active'?'●':state==='blocked'?'!':'○'}</span><span className="capability-name">{name}</span><small>{stateText(name,state)}</small></button>})}</nav>
      <div className="tool-detail">
        <div className="tool-title"><span className="tool-badge">{badge}</span><h3>{viewedTool}</h3></div>
        <p>{labels[viewedTool]??tool?.description??'Internal AEON capability'}</p>
        <div className="capability-summary"><span className="capability-icon">✦</span><div><strong>{capabilityMessage}</strong><small>{viewedTrace?`${viewedTrace.phase} · ${new Date(viewedTrace.timestamp).toLocaleTimeString()}`:viewedTool===liveTool?'This is the current mission stage.':'No raw trace was emitted for this capability.'}</small></div><span className="capability-status">{status}</span></div>
        <div className="live-trace"><div className="live-trace-head"><span>MISSION TRACE</span><small>{traces.length} events</small></div>{traces.length===0?<div className="trace-empty">Start a mission to watch capability calls appear here.</div>:traces.map(t=><div className={`trace-row ${t.phase.toLowerCase()}`} key={t.id}><span>{t.phase==='CALL'?'↗':t.phase==='RESULT'?'✓':t.phase==='DECISION'?'◉':'!'}</span><div><b>{t.tool}</b><small>{labels[t.tool]??'Capability activity'}</small></div><em>{t.phase}</em></div>)}</div>
        <div className="authority-note"><span>HUMAN AUTHORITY</span><p>{authorityMessage}</p></div>
        <button className="technical-toggle" onClick={()=>setShowDetails(v=>!v)} aria-expanded={showDetails}>{showDetails?'Hide technical trace':'View technical trace'} <span>{showDetails?'↑':'↓'}</span></button>
        {showDetails&&<div className="io technical-details"><div className="technical-details-head"><div><span>ADVANCED TRACE</span><strong>{viewedTool}</strong></div><small>Raw mission payloads are optional debugging evidence. The live mission state above remains the primary view.</small></div><div><label>{detailTitle}</label><pre>{JSON.stringify(detail,null,2)}</pre></div><div><label>LATEST RESULT</label><pre>{JSON.stringify(result,null,2)}</pre></div><div className="technical-schema"><label>CAPABILITY SCHEMA</label><pre>{JSON.stringify(schema,null,2)}</pre></div></div>}
      </div>
    </div>
  </section>
}
