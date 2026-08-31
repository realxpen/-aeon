import { useEffect, useState, useRef } from 'react'
import './app.css'
import './workspace.css'
import './phase16-gamified-journey.css'
import './mission-layout.css'
import { initialMission, approveMission, MissionState } from './agent-loop'
import AgentConsole from './agent-console'
import ConstitutionFirewall from './constitution-firewall'
import NoDealPanel from './no-deal-panel'
import AgentJourneyGamified from './agent-journey-gamified'
import { getMissionConstitution, saveMissionConstitution, MissionConstitution, parseMissionBudget, deriveMissionPriorities } from './mission-state'
import { emitAgentActivity } from './agent-activity'
import { resetWebMCPTrace, executeObserved, setActiveMissionContext, clearActiveMissionContext } from './webmcp-observability'
import { searchMissionRequirements, rankForMission, negotiate, Product, NegotiationResult, classifyMissionInput } from './marketplace'

const CEILING_PRESETS = [100000, 250000, 500000, 1000000]
const multiProductPattern = /\b(setup|kit|bundle|basket|collection|complete|full|creator setup|content setup|studio setup|multiple|several|all[- ]in[- ]one)\b/i

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
  const [inputIssue,setInputIssue]=useState<'invalid'|'ambiguous'|'unavailable'|'noDeal'|''>('')
  const [selectedCeiling,setSelectedCeiling]=useState(0)
  const [customCeiling,setCustomCeiling]=useState('')
  const journeyRef=useRef<HTMLElement|null>(null)
  const parsedBudget=parseMissionBudget(goal)
  const hasExplicitCeiling=!!parsedBudget
  const manualCeiling=customCeiling?Number(customCeiling):selectedCeiling
  const activeBudget=parsedBudget?.amount??(manualCeiling||0)
  const missionStarted=running||approved||!!error||!!proposal||!!inputIssue
  useEffect(()=>{saveMissionConstitution(constitution)},[constitution])
  useEffect(()=>{
    const approve=()=>{setApproved(true);setRunning(false);setPhase('EXECUTION RELEASED');emitAgentActivity('Human approved proposed action','human_approval')}
    const decline=()=>{setApproved(false);setRunning(false);setPhase('HUMAN APPROVAL');emitAgentActivity('Human declined proposed action','human_approval')}
    window.addEventListener('aeon:approve-mission',approve);window.addEventListener('aeon:decline-mission',decline)
    return()=>{window.removeEventListener('aeon:approve-mission',approve);window.removeEventListener('aeon:decline-mission',decline)}
  },[])
  useEffect(()=>{if(!missionStarted)return;const frame=window.requestAnimationFrame(()=>journeyRef.current?.scrollIntoView({behavior:'smooth',block:'start'}));return()=>window.cancelAnimationFrame(frame)},[running,missionStarted])
  const resetMissionForNewPrompt=()=>{setMission(initialMission());setProposal(null);setProducts([]);setError('');setInputIssue('');setRunning(false);setApproved(false);setPhase('SEARCHING');setSelectedCeiling(0);setCustomCeiling('');clearActiveMissionContext()}
  const handleGoalChange=(value:string)=>{setGoal(value);if(missionStarted)resetMissionForNewPrompt();else if(inputIssue)setInputIssue('')}
  const runMission=async()=>{
    const missionGoal=goal.trim();if(!missionGoal)return
    const parsed=parseMissionBudget(missionGoal);const budget=parsed?.amount??(customCeiling?Number(customCeiling):selectedCeiling||0);const priorities=deriveMissionPriorities(missionGoal);const inputClass=classifyMissionInput(missionGoal)
    if(inputClass==='invalid'){setInputIssue('invalid');setRunning(false);setPhase('INVALID REQUEST');return}
    if(inputClass==='ambiguous'){setInputIssue('ambiguous');setRunning(false);setPhase('CLARIFICATION REQUIRED');return}
    const missionId=`AEON-${Date.now()}-${Math.random().toString(36).slice(2,7).toUpperCase()}`
    const activeConstitution:MissionConstitution={...constitution,goal:missionGoal,budget,canNegotiate:true,purchaseRequiresApproval:true,priorities}
    setActiveMissionContext({id:missionId,goal:missionGoal,budget,canNegotiate:true,purchaseRequiresApproval:true})
    setConstitution(activeConstitution)
    setMission(initialMission());setProposal(null);setProducts([]);setError('');setInputIssue('');setRunning(true);setApproved(false);setPhase('SEARCHING')
    emitAgentActivity(`Mission accepted: “${missionGoal}” · ceiling ${budget?`₦${budget.toLocaleString()}`:'none'}`,'Mission engine')
    const multiRequest=multiProductPattern.test(missionGoal)
    try{
      const requirements=await executeObserved('search_products',{query:missionGoal,maxPrice:budget||null},async()=>searchMissionRequirements(missionGoal,budget||undefined));const candidates=requirements.flatMap(r=>r.products);const unique=Array.from(new Map(candidates.map(p=>[p.id,p])).values());const found=rankForMission(unique,priorities).filter(p=>!budget||p.price<=budget).slice(0,multiRequest?8:5)
      if(found.length===0)throw Object.assign(new Error('NO_MATCHING_PRODUCTS'),{code:'UNAVAILABLE'})
      const negotiationPool=multiRequest?found:found.slice(0,1);setProducts(found);setPhase('ANALYZING');await new Promise(r=>setTimeout(r,2600));await executeObserved('compare_products',{productIds:found.map(p=>p.id),priorities,budget:budget||null},async()=>rankForMission(found,priorities));setPhase('NEGOTIATING')
      const negotiated:{product:Product;deal:NegotiationResult}[]=[]
      for(const product of negotiationPool){await new Promise(r=>setTimeout(r,1300));const deal=await executeObserved('negotiate_offer',{productId:product.id,product:product.name,listedPrice:product.price,budget:budget||null},async()=>{emitAgentActivity(`Seller agent contacted: ${product.name}`,'seller_agent');return negotiate(product,budget,activeConstitution)});negotiated.push({product,deal});await new Promise(r=>setTimeout(r,2200))}
      const compliant=negotiated.filter(x=>x.deal.status==='approved'&&(!budget||x.deal.acceptedPrice<=budget))
      let selected=compliant
      if(multiRequest&&budget>0){
        const ranked=[...compliant].sort((a,b)=>{
          const aRequired=/phone|smartphone|iphone|mobile/i.test(a.product.category+' '+a.product.name)?1:0
          const bRequired=/phone|smartphone|iphone|mobile/i.test(b.product.category+' '+b.product.name)?1:0
          return bRequired-aRequired || b.product.rating-a.product.rating
        })
        selected=[]
        let runningTotal=0
        for(const item of ranked){if(runningTotal+item.deal.acceptedPrice<=budget){selected.push(item);runningTotal+=item.deal.acceptedPrice}}
      }
      if(selected.length===0)throw Object.assign(new Error('NO_COMPLIANT_DEAL'),{code:'NODEAL'})
      const basketProducts=multiRequest?selected.map(x=>x.product):[selected[0].product];const deals=multiRequest?selected.map(x=>x.deal):[selected[0].deal];const total=deals.reduce((s,d)=>s+d.acceptedPrice,0);const saving=deals.reduce((s,d)=>s+d.saving,0);if(budget>0&&total>budget)throw Object.assign(new Error('NO_COMPLIANT_DEAL'),{code:'NODEAL'})
      setProposal({products:basketProducts,deals,total,saving});setPhase('CONSTITUTION CHECK');await new Promise(r=>setTimeout(r,2400));setPhase('HUMAN APPROVAL');setRunning(false);emitAgentActivity('Purchase blocked: human approval required','request_purchase_approval')
    }catch(e){const failure=e as Error & {code?:string};setError(failure.message||'Mission failed');setRunning(false);if(failure.code==='UNAVAILABLE'||failure.message==='NO_MATCHING_PRODUCTS'){setInputIssue('unavailable');setPhase('NO MATCHING PRODUCTS')}else{setInputIssue('noDeal');setPhase('NO COMPLIANT DEAL')}}
  }
  return <main className={`mission ${missionStarted?'mission-running':''}`}>
    <header className="mission-header"><div><span className="eyebrow">AEON · MISSION CONTROL</span><h1>Your agent is {approved?'released':running?'working':'waiting'}.</h1></div><div className="mission-id">AEON-001</div></header>
    <section className={`mission-input panel ${missionStarted?'mission-input-active':''}`}><label htmlFor="goal">What do you want your agent to do?</label><textarea id="goal" value={goal} onChange={e=>handleGoalChange(e.target.value)} placeholder="e.g. Find me a phone under ₦500,000 and negotiate the best deal" rows={3}/>{!missionStarted&&!hasExplicitCeiling&&<div className="ceiling-picker" aria-label="Choose a price ceiling"><div className="ceiling-copy"><span>PRICE CEILING</span><strong>{activeBudget?`₦${activeBudget.toLocaleString()}`:'No ceiling'}</strong><small>{activeBudget?'Applied only because you selected it.':'Optional — leave empty to let AEON search without a price limit.'}</small></div><div className="ceiling-options">{CEILING_PRESETS.map(value=><button type="button" key={value} className={selectedCeiling===value&&!customCeiling?'selected':''} onClick={()=>{setSelectedCeiling(value);setCustomCeiling('')}}>₦{value>=1000000?`${value/1000000}m`:`${value/1000}k`}</button>)}<input aria-label="Custom price ceiling" inputMode="numeric" value={customCeiling} onChange={e=>{setCustomCeiling(e.target.value.replace(/[^0-9]/g,''));setSelectedCeiling(0)}} placeholder="Custom"/></div></div>}{inputIssue==='ambiguous'&&<div className="panel no-deal"><div className="kicker">MISSION CLARIFICATION</div><h2>I can surprise you — but I need a category first.</h2><p>Choose what you want AEON to shop for. AEON will not invent a category or spending authority on your behalf.</p><div className="ceiling-options"><button type="button" onClick={()=>setGoal('electronics')}>Electronics</button><button type="button" onClick={()=>setGoal('fashion')}>Fashion</button><button type="button" onClick={()=>setGoal('home')}>Home</button><button type="button" onClick={()=>setGoal('gifts')}>Gifts</button></div></div>}{inputIssue==='invalid'&&<section className="panel no-deal"><div className="kicker">MISSION INPUT</div><h2>I couldn't understand that request.</h2><p>Try telling AEON what you want to buy, for example: “Find me a phone under ₦500,000.” Random or incomplete text will not trigger a marketplace search.</p><button className="primary-action" onClick={()=>document.getElementById('goal')?.focus()}>EDIT REQUEST →</button></section>}{inputIssue==='unavailable'&&<section className="panel no-deal"><div className="kicker">MARKETPLACE RESULT</div><h2>No matching product found.</h2><p>AEON understood the request, but the connected marketplace does not currently have a suitable match within your stated constraints.</p><button className="primary-action" onClick={()=>document.getElementById('goal')?.focus()}>TRY ANOTHER REQUEST →</button></section>}<div className="mission-input-footer"><span className="input-hint">{hasExplicitCeiling?`Ceiling detected from your request: ₦${parsedBudget!.amount.toLocaleString()}`:activeBudget?`Ceiling selected: ₦${activeBudget.toLocaleString()}`:'No price ceiling — AEON will not impose one.'}</span><button className="primary tactile-button deploy-button" onClick={runMission} disabled={!goal.trim()}>Deploy agent →</button></div></section>
    {missionStarted&&inputIssue===''&&<><section ref={journeyRef}><AgentJourneyGamified phase={phase} running={running} approved={approved} products={products} proposal={proposal} goal={goal} budget={activeBudget}/></section>{error&&<NoDealPanel budget={parsedBudget?.amount??activeBudget} candidates={products} onIncreaseBudget={b=>setConstitution(c=>({...c,budget:b}))} onChangeRules={()=>window.dispatchEvent(new CustomEvent('aeon:edit-rules'))} onRetry={runMission} onEnd={()=>{resetMissionForNewPrompt();setGoal('')}}/>}<div className="mission-support"><AgentConsole/><ConstitutionFirewall/></div></>}
  </main>
}
