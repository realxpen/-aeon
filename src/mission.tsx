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

  useEffect(()=>{saveMissionConstitution(constitution)},[constitution])
  useEffect(()=>{
    const approve=()=>{setApproved(true);setPhase('EXECUTION RELEASED');setMission(m=>approveMission(m));emitAgentActivity('Human approved proposed action','human_approval')}
    window.addEventListener('aeon:approve-mission',approve)
    return()=>window.removeEventListener('aeon:approve-mission',approve)
  },[])

  const runMission=async()=>{
    if(!goal.trim())return
    setRunning(true);setApproved(false);setError('');setProposal(null);setProducts([]);setPhase('SEARCHING')
    emitAgentActivity('Mission accepted','Mission engine event')
    try{
      const parsedBudget=parseMissionBudget(goal)
      const budget=parsedBudget?.amount??constitution.budget
      const requirements=searchMissionRequirements(goal,budget)
      const candidates=requirements.flatMap(r=>r.products)
      const unique=Array.from(new Map(candidates.map(p=>[p.id,p])).values())
      const priorities=constitution.priorities.length?constitution.priorities:[]
      const found=rankForMission(unique,priorities).slice(0,8)
      if(found.length===0)throw new Error('NO_MATCHING_PRODUCTS')
      setProducts(found);emitAgentActivity(`${found.length} product candidates returned`,'WebMCP → search_products')
      setPhase('ANALYZING');await new Promise(r=>setTimeout(r,900))
      setPhase('NEGOTIATING');await new Promise(r=>setTimeout(r,900))
      const negotiated=found.map(product=>({product,deal:negotiate(product,budget,constitution)}))
      const selected=negotiated.filter(x=>x.deal.acceptedPrice<=budget).sort((a,b)=>a.deal.acceptedPrice-b.deal.acceptedPrice).slice(0,4)
      if(selected.length===0)throw new Error('NO_COMPLIANT_DEAL')
      const basketProducts=selected.map(x=>x.product)
      const deals=selected.map(x=>x.deal)
      const total=deals.reduce((s,d)=>s+d.acceptedPrice,0)
      const saving=deals.reduce((s,d)=>s+d.saving,0)
      setProposal({products:basketProducts,deals,total,saving})
      setPhase('CONSTITUTION CHECK');await new Promise(r=>setTimeout(r,900))
      setPhase('HUMAN APPROVAL');setRunning(false);emitAgentActivity('Purchase blocked: human approval required','request_purchase_approval')
    }catch(e){
      const message=e instanceof Error?e.message:'Mission failed';setError(message);setRunning(false);setPhase('NO COMPLIANT DEAL')
    }
  }

  const noDealBudget=parseMissionBudget(goal)?.amount??constitution.budget
  const missionStarted=running||approved||!!error||!!proposal

  return <main className="mission">
    <header className="mission-header"><div><span className="eyebrow">AEON · MISSION CONTROL</span><h1>Your agent is {approved?'released':running?'working':'waiting'}.</h1></div><div className="mission-id">AEON-001</div></header>
    <section className={`mission-input panel ${missionStarted?'mission-input-active':''}`}>
      <label htmlFor="goal">What do you want your agent to do?</label>
      <div className="input-row"><input id="goal" value={goal} onChange={e=>setGoal(e.target.value)} placeholder="e.g. Find me a phone under ₦500,000 and negotiate the best deal"/><button className="primary tactile-button" onClick={runMission}>Deploy agent →</button></div>
    </section>
    {missionStarted&&<>
      <AgentJourneyGamified phase={phase} running={running} approved={approved} products={products} proposal={proposal}/>
      {error&&<NoDealPanel budget={noDealBudget} candidates={products} onIncreaseBudget={b=>setConstitution(c=>({...c,budget:b}))} onChangeRules={()=>window.dispatchEvent(new CustomEvent('aeon:edit-rules'))} onRetry={runMission} onEnd={()=>{setError('');setProposal(null);setProducts([]);setPhase('SEARCHING')}}/>}
      <div className="mission-support"><AgentConsole/><ConstitutionFirewall/></div>
    </>}
  </main>
}