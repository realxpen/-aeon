import {useEffect,useState} from 'react'
import {saveMissionConstitution} from './mission-state'

const DEMO={goal:'Build me the best creator setup under ₦1,000,000. Prioritize performance and audio quality. You can negotiate, but ask me before purchasing.',budget:1000000,canNegotiate:true,purchaseRequiresApproval:true,priorities:['performance','audio quality']}

export default function DemoMode(){
 const [open,setOpen]=useState(false)
 const enabled=new URLSearchParams(window.location.search).has('demo')
 useEffect(()=>{if(!enabled)return;const onKey=(e:KeyboardEvent)=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='d'){e.preventDefault();setOpen(v=>!v)}};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey)},[enabled])
 if(!enabled)return null
 const reset=()=>{saveMissionConstitution(DEMO);window.location.href='/mission/new?demo=1'}
 return <div className="demo-controls" aria-label="Demo mode controls">
   <button className="demo-trigger" onClick={()=>setOpen(v=>!v)} aria-expanded={open}>DEMO MODE</button>
   {open&&<div className="demo-popover">
     <strong>Reliable judge path</strong>
     <span>Reset the mission to the known-good starting state before a run.</span>
     <button onClick={reset}>RESET DEMO MISSION</button>
     <button onClick={()=>window.location.href='/mission/new?demo=1'}>START FRESH RUN</button>
     <small>Ctrl/⌘ + D to toggle</small>
   </div>}
 </div>
}
