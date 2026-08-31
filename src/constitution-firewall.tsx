import { useEffect, useState } from 'react'
import { getMissionConstitution, subscribeMissionConstitution, MissionConstitution } from './mission-state'
import { subscribeAgentActivity, AgentActivity } from './agent-activity'

export default function ConstitutionFirewall(){
 const [constitution,setConstitution]=useState<MissionConstitution>(getMissionConstitution())
 const [events,setEvents]=useState<AgentActivity[]>([])
 useEffect(()=>{
  const offMission=subscribeMissionConstitution(setConstitution)
  const offActivity=subscribeAgentActivity(e=>setEvents(x=>[e,...x].slice(0,30)))
  return()=>{offMission();offActivity()}
 },[])
 const safeStage=(stage?:string)=>String(stage??'AGENT').toLowerCase()
 const stageLabel=(stage?:string)=>String(stage??'AGENT')
 const actor=(stage?:string)=>{const s=stageLabel(stage);return s==='COMPLETED'?'AEON':s==='BLOCKED'||s==='VIOLATION'?'FIREWALL':s==='EVALUATING'?'CONSTITUTION':'AGENT'}
 const avatar=(stage?:string)=>{const s=stageLabel(stage);return s==='BLOCKED'||s==='VIOLATION'?'!':s==='COMPLETED'?'A':s==='EVALUATING'?'C':'→'}
 const ceilingLabel=Number(constitution.budget??0)>0?`₦${Number(constitution.budget).toLocaleString()}`:'NONE'
 return <div className="firewall panel">
  <style>{`
   .firewall-chat{display:flex;flex-direction:column;gap:12px;margin-top:18px;max-height:520px;overflow:auto;padding:4px 2px 4px 0;scroll-behavior:smooth}
   .firewall-chat::-webkit-scrollbar{width:5px}.firewall-chat::-webkit-scrollbar-thumb{background:#29313c;border-radius:99px}
   .chat-row{display:flex;gap:10px;align-items:flex-start;animation:aeon-slide-in .3s ease both}
   .chat-avatar{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;flex:none;border:1px solid #303946;background:#111720;color:#9aa5b3;font:9px 'DM Mono',monospace}
   .chat-row.completed .chat-avatar{border-color:#52663d;color:#b8f36b}.chat-row.blocked .chat-avatar{border-color:#6b4b32;color:#d5a86d}.chat-row.evaluating .chat-avatar{border-color:#4d5664;color:#c2cad4}
   .chat-bubble{max-width:calc(100% - 42px);min-width:0;padding:11px 14px 10px;border:1px solid #252d38;background:#10151d;border-radius:14px 14px 14px 4px;box-shadow:0 4px 16px rgba(0,0,0,.12)}
   .chat-row.current .chat-bubble{border-color:#3b4d2d;box-shadow:0 0 20px rgba(184,243,107,.05)}
   .chat-meta{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:5px}
   .chat-name{font:9px 'DM Mono',monospace;letter-spacing:.08em;color:#7e8998}.chat-time{font:9px 'DM Mono',monospace;color:#525d6b;white-space:nowrap}
   .chat-title{font-size:13px;font-weight:650;color:#edf0f3;line-height:1.35}.chat-detail{margin-top:4px;color:#8d98a6;font-size:12px;line-height:1.5;overflow-wrap:anywhere}.chat-tool{display:inline-block;margin-top:7px;padding:3px 7px;border:1px solid #28313d;border-radius:6px;color:#667281;font:8px 'DM Mono',monospace;background:#0b1016}
   .firewall-empty.chat-empty{padding:24px 14px;text-align:center;border:1px dashed #29313c;border-radius:14px;color:#697483;font-size:12px;line-height:1.7}
   .firewall-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px}.firewall-status{white-space:nowrap}
   .firewall-rule{display:flex;flex-wrap:wrap;gap:10px 18px;margin-top:18px;padding:12px 14px;border:1px solid #252d38;background:#0a0f15;border-radius:10px;font:9px 'DM Mono',monospace;color:#6f7b89}.firewall-rule b{color:#dce2e8;font-weight:500}
   @media(max-width:700px){.firewall-head{flex-direction:column}.firewall-chat{max-height:460px}.chat-bubble{max-width:calc(100% - 40px)}.firewall-rule{gap:8px 12px}}
  `}</style>
  <div className="firewall-head"><div><div className="kicker">AEON / CONSTITUTION FIREWALL</div><h3>Live governance observability</h3><p className="muted">Every WebMCP action enters the activity stream. The constitution determines whether it can execute.</p></div><span className="firewall-status">● FIREWALL ACTIVE</span></div>
  <div className="firewall-rule"><span>ACTIVE CONSTITUTION</span><b>NEGOTIATION: {constitution.canNegotiate?'AUTHORIZED':'DENIED'}</b><b>CEILING: {ceilingLabel}</b></div>
  <div className="firewall-chat">
   {events.length===0?<div className="firewall-empty chat-empty">Waiting for agent activity…<br/><strong>Run a Marketplace mission to see AEON’s conversation here.</strong></div>:events.map((e,i)=>{const kind=safeStage(e.stage);return <div className={`chat-row ${kind} ${i===0?'current':''}`} key={e.id??`${e.timestamp}-${i}`}>
      <div className="chat-avatar">{avatar(e.stage)}</div>
      <div className="chat-bubble"><div className="chat-meta"><span className="chat-name">{actor(e.stage)}</span><time className="chat-time">{e.timestamp?new Date(e.timestamp).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'}):'now'}</time></div>
       <div className="chat-title">{e.title??'Agent activity'}</div><div className="chat-detail">{e.detail??''}</div>{e.tool&&<span className="chat-tool">{e.tool}</span>}
      </div>
    </div>})}
  </div>
 </div>
}