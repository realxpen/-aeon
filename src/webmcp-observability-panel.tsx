import {useEffect,useMemo,useState} from 'react'
import {subscribeWebMCPTrace,type WebMCPTrace} from './webmcp-observability'
import {getMissionConstitution,subscribeMissionConstitution,type MissionConstitution} from './mission-state'
import './webmcp-observability-panel.css'

const icon=(phase:WebMCPTrace['phase'])=>phase==='CALL'?'↗':phase==='RESULT'?'✓':phase==='DECISION'?'●':'!'
const label=(tool:string)=>tool==='human_authority'?'human authority':tool.replace(/_/g,' ')
function resultCount(t:WebMCPTrace){
 const out=t.output as any
 if(t.tool==='search_products'){if(Array.isArray(out))return out.reduce((n,r)=>n+(Array.isArray(r?.products)?r.products.length:0),0);if(Array.isArray(out?.products))return out.products.length;return 0}
 if(t.tool==='compare_products'){if(Array.isArray(out))return out.length;if(Array.isArray(out?.ranked))return out.ranked.length;return 0}
 return undefined
}
function detail(t:WebMCPTrace){
 if(t.phase==='DECISION'){const d=(t.output as any)?.decision;return d==='APPROVED'?'Human approved the proposed purchase. Execution may proceed.':'Human declined the proposed purchase. Execution remains locked.'}
 if(t.phase==='CALL'){const input=t.input as any;if(t.tool==='search_products'&&input?.query)return `Searching the marketplace for “${input.query}”${input.maxPrice?` · ceiling ₦${Number(input.maxPrice).toLocaleString()}`:''}`;if(t.tool==='compare_products')return `Comparing ${Array.isArray(input?.productIds)?input.productIds.length:0} marketplace candidates against the mission constraints`;if(t.tool==='negotiate_offer')return `Opening seller-agent negotiation for ${input?.product??'the selected product'}${input?.listedPrice?` · listed ₦${Number(input.listedPrice).toLocaleString()}`:''}`;return `${label(t.tool)} capability invoked for this mission`}
 const out=t.output as any
 if(t.phase==='ERROR')return out?.error??'Capability failed'
 if(t.tool==='search_products'){const n=resultCount(t)??0;return `${n} marketplace candidate${n===1?'':'s'} found within the active mission ceiling`}
 if(t.tool==='compare_products'){const n=resultCount(t)??0;return `${n} candidate${n===1?'':'s'} ranked for the active mission`}
 if(t.tool==='negotiate_offer'){if(out?.acceptedPrice!==undefined)return `Seller offer returned: ₦${Number(out.acceptedPrice).toLocaleString()}${out.saving>0?` · saved ₦${Number(out.saving).toLocaleString()}`:''}`;return 'Seller negotiation completed for this mission'}
 if(t.tool==='request_purchase_approval')return 'Deal prepared and waiting for human authority'
 return 'Capability returned a result'
}

export default function WebMCPObservabilityPanel(){
 const [traces,setTraces]=useState<WebMCPTrace[]>([])
 const [mission,setMission]=useState<MissionConstitution>(getMissionConstitution())
 useEffect(()=>subscribeWebMCPTrace(t=>setTraces(x=>[...x,t].slice(-12)),()=>setTraces([])),[])
 useEffect(()=>subscribeMissionConstitution(setMission),[])
 const phase=useMemo(()=>traces.at(-1),[traces])
 return <aside className="webmcp-live-panel" aria-live="off">
  <div className="webmcp-live-head"><div><span>LIVE INFRASTRUCTURE</span><h3>WebMCP mission trace</h3><small className="webmcp-mission">{mission.goal}</small></div><b><i/> {phase?.phase==='DECISION'?'DECISION':phase?'LIVE':'READY'}</b></div>
  <div className="webmcp-authority"><span>CEILING <strong>{mission.budget?`₦${mission.budget.toLocaleString()}`:'NONE'}</strong></span><span>NEGOTIATION <strong>{mission.canNegotiate?'ON':'OFF'}</strong></span><span>APPROVAL <strong>{mission.purchaseRequiresApproval?'REQUIRED':'OFF'}</strong></span></div>
  {traces.length===0?<div className="webmcp-empty"><span>◌</span><p>Waiting for this mission to start…</p><small>The active WebMCP call, result, seller negotiation and human decision will appear here.</small></div>:<div className="webmcp-trace-list">{traces.map(t=><div className={`webmcp-trace ${t.phase.toLowerCase()}`} key={t.id}><span className="trace-icon">{icon(t.phase)}</span><div><div className="trace-top"><strong>{t.phase}</strong><code>{label(t.tool)}</code></div><small>{detail(t)}</small>{t.tool==='negotiate_offer'&&<em>SELLER AGENT</em>}{t.phase==='DECISION'&&<em>HUMAN AUTHORITY</em>}</div></div>)}</div>}
 </aside>
}
