import { useEffect, useState } from 'react'
import { getMissionConstitution, subscribeMissionConstitution, MissionConstitution } from './mission-state'

export default function ConstitutionFirewall(){
 const [constitution,setConstitution]=useState<MissionConstitution>(getMissionConstitution())

 useEffect(()=>subscribeMissionConstitution(setConstitution),[])

 const ceilingLabel=Number(constitution.budget??0)>0?`₦${Number(constitution.budget).toLocaleString()}`:'NONE'

 return <div className="firewall panel">
  <div className="firewall-head">
   <div>
    <div className="kicker">AEON / CONSTITUTION FIREWALL</div>
    <h3>Mission governance</h3>
    <p className="muted">AEON's authority boundaries for the active mission.</p>
    <div className="firewall-mission">
     <small>ACTIVE MISSION</small>
     “{constitution.goal}”
    </div>
   </div>
   <span className="firewall-status">● FIREWALL ACTIVE</span>
  </div>
  <div className="firewall-rule">
   <span>AUTHORITY</span>
   <b>NEGOTIATION: {constitution.canNegotiate?'AUTHORIZED':'DENIED'}</b>
   <b>CEILING: {ceilingLabel}</b>
   <b>PURCHASE: {constitution.purchaseRequiresApproval?'HUMAN APPROVAL':'AUTONOMOUS'}</b>
  </div>
 </div>
}
