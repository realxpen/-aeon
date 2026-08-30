import React,{useEffect,useState} from 'react'

type RuntimeError={title:string;detail:string}

export default function RuntimeErrorState({children}:{children:React.ReactNode}){
 const [error,setError]=useState<RuntimeError|null>(null)
 useEffect(()=>{
  const onError=(event:ErrorEvent)=>setError({title:'AEON hit an unexpected error',detail:event.error?.message||event.message||'The agent could not complete the current action.'})
  const onRejection=(event:PromiseRejectionEvent)=>{
   const reason=event.reason
   setError({title:'AEON could not complete that action',detail:typeof reason==='string'?reason:reason?.message||'An asynchronous action failed before completion.'})
  }
  window.addEventListener('error',onError)
  window.addEventListener('unhandledrejection',onRejection)
  return()=>{window.removeEventListener('error',onError);window.removeEventListener('unhandledrejection',onRejection)}
 },[])
 if(!error)return <>{children}</>
 const retry=()=>{setError(null);window.location.reload()}
 return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:24,background:'#07090d',color:'#f4f6f8',fontFamily:'Space Grotesk,system-ui,sans-serif'}}>
  <section style={{width:'min(620px,100%)',border:'1px solid #3b3030',background:'#0d1118',padding:28,boxShadow:'0 24px 70px rgba(0,0,0,.3)',animation:'aeon-fade-up .35s ease both'}}>
   <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}><span style={{width:10,height:10,borderRadius:'50%',background:'#e6a36b',boxShadow:'0 0 16px rgba(230,163,107,.45)',animation:'aeon-pulse 1.5s ease-in-out infinite'}}/><span style={{font:'10px DM Mono,monospace',letterSpacing:'.14em',color:'#8d98a6'}}>AGENT RECOVERY</span></div>
   <h1 style={{fontSize:'clamp(30px,5vw,48px)',lineHeight:1,letterSpacing:'-.04em',margin:'0 0 14px'}}>{error.title}</h1>
   <p style={{color:'#8b96a4',lineHeight:1.65,margin:'0 0 22px'}}>{error.detail}</p>
   <div style={{border:'1px solid #252d38',background:'#0a0e14',padding:15,marginBottom:22}}><strong style={{display:'block',fontSize:12,marginBottom:5}}>Nothing was purchased.</strong><span style={{fontSize:11,color:'#697483',lineHeight:1.5}}>AEON stopped the workflow instead of silently continuing after an unexpected failure.</span></div>
   <div style={{display:'flex',gap:10,flexWrap:'wrap'}}><button onClick={retry} style={{border:0,background:'#f4f6f8',color:'#07090d',padding:'13px 18px',fontWeight:700,cursor:'pointer'}}>RETRY ACTION ↻</button><button onClick={()=>window.location.href='/mission/new'} style={{border:'1px solid #343c48',background:'#141a22',color:'#dce1e7',padding:'13px 18px',fontWeight:700,cursor:'pointer'}}>START NEW MISSION →</button></div>
  </section>
 </main>
}
