import {useEffect,useMemo,useRef,useState} from 'react'

type ThemeMode='system'|'light'|'dark'
type Accent='aeon'|'blue'|'violet'|'cyan'|'amber'|'rose'

const MODE_KEY='aeon:theme-mode'
const ACCENT_KEY='aeon:theme-accent'

const accents:{id:Accent;label:string;color:string}[]=[
  {id:'aeon',label:'AEON Green',color:'#b8f36b'},
  {id:'blue',label:'Electric Blue',color:'#6ea8ff'},
  {id:'violet',label:'Violet',color:'#a78bfa'},
  {id:'cyan',label:'Cyan',color:'#58e6d9'},
  {id:'amber',label:'Amber',color:'#f6c85f'},
  {id:'rose',label:'Rose',color:'#fb7185'}
]

const readMode=():ThemeMode=>{
  const saved=localStorage.getItem(MODE_KEY)
  return saved==='light'||saved==='dark'||saved==='system'?saved:'system'
}
const readAccent=():Accent=>{
  const saved=localStorage.getItem(ACCENT_KEY)
  return accents.some(item=>item.id===saved)?saved as Accent:'aeon'
}
const systemMode=()=>window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'

export default function ThemeControl(){
  const [open,setOpen]=useState(false)
  const [mode,setMode]=useState<ThemeMode>(readMode)
  const [accent,setAccent]=useState<Accent>(readAccent)
  const [resolved,setResolved]=useState<'light'|'dark'>(()=>mode==='system'?systemMode():mode)
  const rootRef=useRef<HTMLDivElement|null>(null)
  const activeAccent=useMemo(()=>accents.find(item=>item.id===accent)??accents[0],[accent])

  useEffect(()=>{
    const media=window.matchMedia('(prefers-color-scheme: light)')
    const apply=()=>{
      const next=mode==='system'?(media.matches?'light':'dark'):mode
      setResolved(next)
      document.documentElement.dataset.theme=next
      document.documentElement.dataset.themeMode=mode
      document.documentElement.dataset.accent=accent
      document.documentElement.style.colorScheme=next
      localStorage.setItem(MODE_KEY,mode)
      localStorage.setItem(ACCENT_KEY,accent)
    }
    apply()
    media.addEventListener?.('change',apply)
    return()=>media.removeEventListener?.('change',apply)
  },[mode,accent])

  useEffect(()=>{
    if(!open)return
    const close=(event:MouseEvent)=>{if(rootRef.current&&!rootRef.current.contains(event.target as Node))setOpen(false)}
    const key=(event:KeyboardEvent)=>{if(event.key==='Escape')setOpen(false)}
    document.addEventListener('mousedown',close)
    window.addEventListener('keydown',key)
    return()=>{document.removeEventListener('mousedown',close);window.removeEventListener('keydown',key)}
  },[open])

  return <div className="theme-control" ref={rootRef}>
    {open&&<section className="theme-popover" aria-label="Appearance settings">
      <div className="theme-popover-head">
        <div><span className="theme-kicker">APPEARANCE</span><strong>Personalize AEON</strong></div>
        <button className="theme-close" type="button" onClick={()=>setOpen(false)} aria-label="Close appearance settings">×</button>
      </div>

      <div className="theme-current">
        <span>CURRENT MODE</span>
        <strong>{resolved==='light'?'Light':'Dark'} · {activeAccent.label}</strong>
        {mode==='system'&&<small>Following your system appearance</small>}
      </div>

      <div className="theme-section">
        <span className="theme-section-label">MODE</span>
        <div className="theme-mode-grid" role="group" aria-label="Color mode">
          {(['system','light','dark'] as ThemeMode[]).map(item=><button key={item} type="button" className={mode===item?'selected':''} onClick={()=>setMode(item)} aria-pressed={mode===item}>
            <span aria-hidden="true">{item==='system'?'◐':item==='light'?'☀':'☾'}</span>{item[0].toUpperCase()+item.slice(1)}
          </button>)}
        </div>
      </div>

      <div className="theme-section">
        <span className="theme-section-label">ACCENT COLOR</span>
        <div className="theme-accent-grid">
          {accents.map(item=><button key={item.id} type="button" className={accent===item.id?'selected':''} onClick={()=>setAccent(item.id)} aria-label={`Use ${item.label}`} aria-pressed={accent===item.id}>
            <span className="theme-swatch" style={{backgroundColor:item.color}} aria-hidden="true"/><span>{item.label}</span>
          </button>)}
        </div>
      </div>
    </section>}
    <button className="theme-trigger" type="button" onClick={()=>setOpen(value=>!value)} aria-expanded={open} aria-label="Open appearance settings">
      <span className="theme-trigger-swatch" style={{backgroundColor:activeAccent.color}} aria-hidden="true"/>
      <span>{resolved==='light'?'LIGHT':'DARK'}</span>
      <b>◐</b>
    </button>
  </div>
}
