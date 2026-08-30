import type { Product } from './marketplace'

type Props={
 budget:number
 candidates:Product[]
 onIncreaseBudget:(budget:number)=>void
 onChangeRules:()=>void
 onRetry:()=>void
 onEnd:()=>void
}

export default function NoDealPanel({budget,candidates,onIncreaseBudget,onChangeRules,onRetry,onEnd}:Props){
 const closest=candidates.slice(0,3)
 const suggested=closest[0]
 return <div className="no-deal panel">
  <div className="no-deal-head"><span className="firewall-icon">!</span><div><div className="kicker">CONSTITUTION ENFORCEMENT</div><h2>Mission blocked — safely.</h2></div></div>
  <p className="no-deal-lead">AEON found products, but none can be proposed without breaking your <strong>₦{budget.toLocaleString()}</strong> spending ceiling.</p>
  <div className="no-deal-rule"><span>AGENT DECISION</span><strong>DO NOT OVERRIDE HUMAN AUTHORITY</strong></div>
  {closest.length>0&&<div className="closest"><div className="closest-title">CLOSEST COMPLIANT PATHS</div>{closest.map((p)=><div className="candidate" key={p.id}><div><strong>{p.name}</strong><span>{p.merchant} · ★ {p.rating}</span></div><div className="candidate-price"><b>₦{p.price.toLocaleString()}</b><small>₦{(p.price-budget).toLocaleString()} over</small></div></div>)}</div>}
  <div className="human-decision"><div><div className="kicker">HUMAN DECISION REQUIRED</div><h3>Choose what AEON is allowed to do next.</h3><p>The agent cannot raise the budget or relax a rule by itself.</p></div><div className="no-deal-actions">
   {suggested&&<button className="primary-action" onClick={()=>onIncreaseBudget(suggested.price)}>AUTHORIZE ₦{suggested.price.toLocaleString()} CEILING →</button>}
   <button onClick={onChangeRules}>EDIT MISSION RULES</button>
   <button onClick={onRetry}>SEARCH AGAIN</button>
   <button onClick={onEnd}>END MISSION</button>
  </div></div>
 </div>
}
