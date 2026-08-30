import { useEffect, useState } from 'react'
import './agent-journey.css'
import type { Product } from './marketplace'

type Props={phase:string; running:boolean; approved:boolean; products:Product[]; proposal:{product:Product;deal:{acceptedPrice:number;saving:number;rounds:number}}|null}

const stages=[['SEARCHING','SEARCH','Finding options that match your mission'],['ANALYZING','EVALUATE','Comparing fit, quality and price'],['NEGOTIATING','NEGOTIATE','Testing whether the merchant will improve the deal'],['CONSTITUTION CHECK','GOVERN','Checking the requested action against your constitution'],['HUMAN APPROVAL','CHECKPOINT','The agent has reached your authority boundary'],['APPROVING','APPROVAL','Recording your decision'],['EXECUTION RELEASED','EXECUTE','Execution authority has been released']]

export default function AgentJourney({phase,running,approved,products,proposal}:Props){
 const [tick,setTick]=useState(0)
 useEffect(()=>{if(!running)return;const id=window.setInterval(()=>setTick(x=>x+1),900);return()=>window.clearInterval(id)},[running])
 const current=stages.findIndex(([p])=>p===phase)
 const index=approved?stages.length-1:Math.max(current,0)
 const label=approved?'EXECUTE':(stages[index]?.[1]??'READY')
 const text=approved?'Approval received. AEON can now execute the approved transaction.':(stages[index]?.[2]??'Waiting for the agent to begin.')
 return <section className={`agent-journey ${running?'is-running':''} ${approved?'is-approved':''}`} aria-live="polite">
  <div className="journey-top"><div><span className="journey-kicker">LIVE AGENT JOURNEY</span><h2>{approved?'Transaction authority released':phase==='NO COMPLIANT DEAL'?'Agent stopped safely':`Agent is ${label.toLowerCase()}`}</h2><p>{text}</p></div><div className="journey-signal"><span className="journey-orb"/>{running?'AUTONOMOUS':'OBSERVING'}</div></div>
  <div className="journey-track">{stages.map(([p,l],i)=><div key={p} className={`journey-stage ${i<index?'done':''} ${i===index?'active':''}`}><span className="journey-node">{i<index?'✓':String(i+1).padStart(2,'0')}</span><span>{l}</span></div>)}</div>
  <div className="journey-scene">
   <div className="journey-agent"><div className="agent-core"><span>AEON</span><i className={running?'spin':''}/></div><div><b>{['SEARCHING','ANALYZING','NEGOTIATING'].includes(phase)?'Working autonomously':phase==='HUMAN APPROVAL'?'Waiting for you':approved?'Ready to execute':'Evaluating authority'}</b><small>{products.length?`${products.length} candidate${products.length>1?'s':''} in working set`:'Building working set'}</small></div></div>
   <div className="journey-action"><span className="action-label">CURRENT ACTION</span><strong>{phase==='SEARCHING'?'SEARCH_PRODUCTS':phase==='ANALYZING'?'COMPARE_PRODUCTS':phase==='NEGOTIATING'?'NEGOTIATE_OFFER':phase==='CONSTITUTION CHECK'?'CONSTITUTION.EVALUATE':phase==='HUMAN APPROVAL'?'REQUEST_PURCHASE_APPROVAL':approved?'EXECUTE_TRANSACTION':'CREATE_MISSION'}</strong><div className="action-meter"><span style={{width:`${Math.min(96,38+(tick%5)*12)}%`}}/></div></div>
  </div>
  {proposal&&<div className="journey-deal"><div><span>PROPOSED DEAL</span><b>{proposal.product.name}</b></div><strong>₦{proposal.deal.acceptedPrice.toLocaleString()}</strong>{proposal.deal.saving>0&&<small>₦{proposal.deal.saving.toLocaleString()} saved</small>}</div>}
  {phase==='HUMAN APPROVAL'&&!approved&&<div className="journey-checkpoint"><span className="checkpoint-pulse"/><div><b>AEON HAS STOPPED</b><p>Your constitution requires a human decision before purchase.</p></div><span className="checkpoint-arrow">→ YOUR DECISION</span></div>}
  {phase==='NO COMPLIANT DEAL'&&<div className="journey-checkpoint blocked"><span className="checkpoint-pulse"/><div><b>MISSION BLOCKED SAFELY</b><p>No compliant product was found within the active ceiling. AEON will not override it.</p></div><span className="checkpoint-arrow">→ RECOVERY</span></div>}
 </section>
}