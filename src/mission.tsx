import { useEffect, useState } from 'react'
import './app.css'
import './workspace.css'
import './phase16-gamified-journey.css'
import './mission-layout.css'
import { initialMission, approveMission, MissionState } from './agent-loop'
import AgentConsole from './agent-console'
import ConstitutionFirewall from './constitution-firewall'
import NoDealPanel from './no-deal-panel'
import AgentJourneyGamified from './agent-journey-gamified'
import { getMissionConstitution, saveMissionConstitution, MissionConstitution, parseMissionBudget } from './mission-state'
import { emitAgentActivity } from './agent-activity'
import { searchMissionRequirements, rankForMission, negotiate, Product, NegotiationResult } from './marketplace'

const CEILING_PRESETS = [100000, 250000, 500000, 1000000]

export default function Mission(){
  const [mission,setMission]=useState<MissionState>(()=>initialMission())
  const [constitution,setConstitution]=useState<MissionConstitution>(()=>getMissionConstitution())
  const [goal,setGoal]=useState('')
  const [products,setProducts]=useState<Product[]>([])
  const [proposal,setProposal]=useState<{products:Product[];deals:NegotiationResult[];total:number;saving:number}|null>(null)
  const [phase,setPhase]=useState('SEARCHING')
  const [running,setRunning]=useState(false)
  const [approved,setApproved]=useState(false)
  const [error,setError]=useState('')
  const [selectedCeiling,setSelectedCeiling]=useState(0)
  const [customCeiling,setCustomCeiling]=useState('')

  const parsedBudget=parseMissionBudget(goal)
  const hasExplicitCeiling=!!parsedBudget
  const manualCeiling=customCeiling?Number(customCeiling):selectedCeiling
  const activeBudget=parsedBudget?.amount??(manualCeiling||0)

  useEffect(()=>{saveMissionConstitution(constitution)},[constitution])
  useEffect(()=>{
    const approve=()=>{setApproved(true);setPhase('EXECUTION RELEASED');setMission(m=>approveMission(m));emitAgentActivity('Human approved proposed action','human_approval')}
    window.addEventListener('aeon:approve-mission',approve)
    return()=>window.removeEventListener('aeon:approve-mission',approve)
  },[])

  const runMission=async()=>{
    if(!goal.trim())return
    const budget=activeBudget
    setRunning(true);setApproved(false);setError('');setProposal(null);setProducts([]);setPhase('SEARCHING')
    emitAgentActivity('Mission accepted','Mission engine event')
    try{
      const requirements=searchMissionRequirements(goal,budget||undefined)
      const candidates=requirements.flatMap(r=>r.products)
      const unique=Array.from(new Map(candidates.map(p=>[p.id,p])).values())
      const priorities=constitution.priorities.length?constitution.priorities:[]
      const found=rankForMission(unique,priorities).slice(0,8)
      if(found.length===0)throw new Error('NO_MATCHING_PRODUCTS')
      setProducts(found);emitAgentActivity(`${found.length} product candidates returned`,'WebMCP → search_products')
      setPhase('ANALYZING');await new Promise(r=>setTimeout(r,2200))
      setPhase('NEGOTIATING');await new Promise(r=>setTimeout(r,2200))
      const negotiated=found.map(product=>({product,deal:negotiate(product,budget,constitution)}))
      const selected=negotiated.filter(x=>!activeBudget||x.deal.acceptedPrice<=activeBudget).sort((a,b)=>a.deal.acceptedPrice-b.deal.acceptedPrice).slice(0,4)
      if(selected.length===0)throw new Error('NO_COMPLIANT_DEAL')
      const basketProducts=selected.map(x=>x.product)
      const deals=selected.map(x=>x.deal)
      const total=deals.reduce((s,d)=>s+d.acceptedPrice,0)
      const saving=deals.reduce((s,d)=>s+d.saving,0)
      setProposal({products:basketProducts,deals,total,saving})
      setPhase('CONSTITUTION CHECK');await new Promise(r=>setTimeout(r,2200))
      setPhase('HUMAN APPROVAL');setRunning(false);emitAgentActivity('Purchase blocked: human approval required','request_purchase_approval')
    }catch(e){
      const message=e instanceof Error?e.message:'Mission failed';setError(message);setRunning(false);setPhase('NO COMPLIANT DEAL')
    }
  }

  const missionStarted=running||approved||!!error||!!proposal

  return <main className={`mission ${missionStarted?'mission-running':''}`}>
    <header className="mission-header"><div><span className="eyebrow">AEON · MISSION CONTROL</span><h1>Your agent is {approved?'released':running?'working':'waiting'}.</h1></div><div className="mission-id">AEON-001</div></header>
    <section className={`mission-input panel ${missionStarted?'mission-input-active':''}`}>
      <label htmlFor="goal">What do you want your agent to do?</label>
      <textarea id="goal" value={goal} onChange={e=>setGoal(e.target.value)} placeholder="e.g. Find me a phone under ₦500,000 and negotiate the best deal" rows={3}/>
      {!missionStarted&&!hasExplicitCeiling&&<div className="ceiling-picker" aria-label="Choose a price ceiling">
        <div className="ceiling-copy"><span>PRICE CEILING</span><strong>{activeBudget?`₦${activeBudget.toLocaleString()}`:'No ceiling'}</strong><small>{activeBudget?'Applied only because you selected it.':'Optional — leave empty to let AEON search without a price limit.'}</small></div>
        <div className="ceiling-options">{CEILING_PRESETS.map(value=><button type="button" key={value} className={selectedCeiling===value&&!customCeiling?'selected':''} onClick={()=>{setSelectedCeiling(value);setCustomCeiling('')}}>₦{value>=1000000?`${value/1000000}m`:`${value/1000}k`}</button>)}<input aria-label="Custom price ceiling" inputMode="numeric" value={customCeiling} onChange={e=>{setCustomCeiling(e.target.value.replace(/[^0-9]/g,''));setSelectedCeiling(0)}} placeholder="Custom"/></div>
      </div>}
      <div className="mission-input-footer"><span className="input-hint">{hasExplicitCeiling?`Ceiling detected from your request: ₦${parsedBudget!.amount.toLocaleString()}`:activeBudget?`Ceiling selected: ₦${activeBudget.toLocaleString()}`:'No price ceiling — AEON will not impose one.'}</span><button className="primary tactile-button deploy-button" onClick={runMission} disabled={!goal.trim()}>Deploy agent →</button></div>
    </section>
    {missionStarted&&<>
      <AgentJourneyGamified phase={phase} running={running} approved={approved} products={products} proposal={proposal}/>
      {error&&<NoDealPanel budget={parsedBudget?.amount??activeBudget} candidates={products} onIncreaseBudget={b=>setConstitution(c=>({...c,budget:b}))} onChangeRules={()=>window.dispatchEvent(new CustomEvent('aeon:edit-rules'))} onRetry={runMission} onEnd={()=>{setError('');setProposal(null);setProducts([]);setPhase('SEARCHING')}}/>}
      <div className="mission-support"><AgentConsole/><ConstitutionFirewall/></div>
    </>}
  </main>
}