export type AgentActivityStage='REQUESTED'|'EVALUATING'|'VIOLATION'|'BLOCKED'|'ALLOWED'|'COMPLETED'
export type AgentActivity={id:string;stage:AgentActivityStage;title:string;detail:string;tool?:string;reason?:string;timestamp:number}
const EVENT='aeon:agent-activity'
export function emitAgentActivity(event:Omit<AgentActivity,'id'|'timestamp'>){const full={...event,id:`evt_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,timestamp:Date.now()};window.dispatchEvent(new CustomEvent<AgentActivity>(EVENT,{detail:full}));return full}
export function subscribeAgentActivity(listener:(event:AgentActivity)=>void){const on=(e:Event)=>listener((e as CustomEvent<AgentActivity>).detail);window.addEventListener(EVENT,on);return()=>window.removeEventListener(EVENT,on)}
