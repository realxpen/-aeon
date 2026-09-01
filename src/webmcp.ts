import { searchCatalog, rankForMission, negotiate, searchMissionRequirements, Product } from './marketplace'
import { getMissionConstitution } from './mission-state'
import { emitAgentActivity } from './agent-activity'
import { executeObserved } from './webmcp-observability'
type Tool={name:string;description:string;inputSchema:Record<string,unknown>;execute:(input:any)=>Promise<unknown>}
const blocked=(reason:string,message:string,tool='unknown')=>{emitAgentActivity({stage:'VIOLATION',title:'Rule violated',detail:reason,tool,reason});emitAgentActivity({stage:'BLOCKED',title:'Action blocked',detail:message,tool,reason});return {status:'blocked',blockedBy:'AEON_CONSTITUTION',reason,message}}
const composeBasket=(goal:string,budget:number,priorities:string[])=>{const requirements=searchMissionRequirements(goal,budget);const missing=requirements.filter(r=>!r.products.length).map(r=>r.category);const ranked=requirements.map(r=>({category:r.category,candidates:rankForMission(r.products,priorities)}));const picked:Product[]=[];let remaining=budget;for(const group of ranked){const candidate=group.candidates.find(p=>p.price<=remaining);if(candidate){picked.push(candidate);remaining-=candidate.price}}return {requirements:ranked,missing,selected:picked,total:picked.reduce((s,p)=>s+p.price,0),remaining,budget,complete:missing.length===0&&picked.length===requirements.length}}
export const aeonTools:Tool[]=[
{name:'create_mission',description:'Create an AEON mission with a goal, budget and authority boundaries.',inputSchema:{type:'object',properties:{goal:{type:'string'},budget:{type:'number'},canNegotiate:{type:'boolean'},purchaseRequiresApproval:{type:'boolean'}},required:['goal','budget']},execute:async(input)=>({ok:true,missionId:'mission_demo_001',status:'created',constitution:{...input,purchaseRequiresApproval:input.purchaseRequiresApproval??true}})},
{name:'search_products',description:'Search the AEON product marketplace for every requirement in the active mission, returning multiple candidates, a budget-aware basket, and explicit missing requirements.',inputSchema:{type:'object',properties:{query:{type:'string'},maxPrice:{type:'number'}},required:['query']},execute:async(input)=>executeObserved('search_products',input,async()=>{const c=getMissionConstitution();const goal=`${c.goal} ${input.query}`;const basket=composeBasket(goal,c.budget,c.priorities);emitAgentActivity({stage:'ALLOWED',title:basket.missing.length?'Marketplace search completed with gaps':'Marketplace candidates composed',detail:basket.missing.length?`No compliant ${basket.missing.join(', ')} found`:`${basket.selected.length} products selected · ₦${basket.total.toLocaleString()} total`,tool:'search_products'});return {query:input.query,maxPrice:c.budget,...basket,results:basket.requirements.flatMap(r=>r.candidates)}})},
{name:'compare_products',description:'Rank multiple marketplace candidates across all requested mission requirements.',inputSchema:{type:'object',properties:{productIds:{type:'array',items:{type:'string'}},priorities:{type:'array',items:{type:'string'}}},required:['productIds']},execute:async(input)=>executeObserved('compare_products',input,async()=>{const c=getMissionConstitution();const candidates=searchCatalog('',c.budget).filter(p=>input.productIds.includes(p.id));const ranked=rankForMission(candidates,input.priorities??c.priorities);return {ranked,explanation:'Ranking is governed by the active mission constitution.'}})},
{name:'negotiate_offer',description:'Negotiate one or more products through the marketplace seller agent while enforcing the active constitution.',inputSchema:{type:'object',properties:{productId:{type:'string'},productIds:{type:'array',items:{type:'string'}},budget:{type:'number'}},required:[]},execute:async(input)=>executeObserved('negotiate_offer',input,async()=>{const c=getMissionConstitution();const ids:string[]=input.productIds?.length?input.productIds:[input.productId];if(!ids.length)return {status:'error',reason:'PRODUCT_REQUIRED'};if(!c.canNegotiate)return blocked('CONSTITUTION_NEGOTIATION_DISABLED','Negotiation was refused before the seller agent was contacted.','negotiate_offer');const products=ids.map(id=>searchCatalog('',c.budget).find(p=>p.id===id)).filter(Boolean) as Product[];const results=products.map(p=>{emitAgentActivity({stage:'EVALUATING',title:'Seller agent contacted',detail:`Negotiating ${p.name} · asking ₦${p.price.toLocaleString()}`,tool:'negotiate_offer'});const result=negotiate(p,c.budget,c);emitAgentActivity({stage:'ALLOWED',title:'Seller agent returned offer',detail:`${p.name} → ₦${result.acceptedPrice.toLocaleString()} · saving ₦${result.saving.toLocaleString()}`,tool:'negotiate_offer'});return result});return {status:'completed',results,total:results.reduce((s,r)=>s+r.acceptedPrice,0),saving:results.reduce((s,r)=>s+r.saving,0)}})},
{name:'request_purchase_approval',description:'Stop before purchase and request an explicit human decision for a single product or multi-product basket.',inputSchema:{type:'object',properties:{productId:{type:'string'},price:{type:'number'},items:{type:'array',items:{type:'object'}},reason:{type:'string'}},required:['price']},execute:async(input)=>executeObserved('request_purchase_approval',input,async()=>{const c=getMissionConstitution();const total=Number(input.price);if(total>c.budget)return blocked('CONSTITUTION_BUDGET_EXCEEDED','Purchase approval cannot be requested for a total above the mission budget.','request_purchase_approval');return {status:'approval_required',humanDecision:true,action:'purchase',...input,totalPrice:total}})}
]

// Chrome's current WebMCP Imperative API lives on document.modelContext.
// Keep navigator.modelContext as a compatibility fallback for earlier preview builds.
const WEBMCP_REGISTRY_KEY='__AEON_WEBMCP_REGISTERED_TOOLS__'
const WEBMCP_REGISTER_PROMISE_KEY='__AEON_WEBMCP_REGISTER_PROMISE__'
type WebMCPGlobal=typeof globalThis & {
  [WEBMCP_REGISTRY_KEY]?: Set<string>
  [WEBMCP_REGISTER_PROMISE_KEY]?: Promise<boolean>
}

function getModelContext(){
  return (document as any).modelContext ?? (navigator as any).modelContext
}

export function registerWebMCP():Promise<boolean>{
  const root=globalThis as WebMCPGlobal
  if(root[WEBMCP_REGISTER_PROMISE_KEY])return root[WEBMCP_REGISTER_PROMISE_KEY]!

  const registration=(async()=>{
    const mc=getModelContext()
    if(!mc?.registerTool)return false

    const registered=root[WEBMCP_REGISTRY_KEY]??new Set<string>()
    root[WEBMCP_REGISTRY_KEY]=registered

    for(const tool of aeonTools){
      if(registered.has(tool.name))continue
      // Mark pending before awaiting so React StrictMode/HMR cannot race a second
      // registration of the same name while Chrome is still resolving the first.
      registered.add(tool.name)
      try{
        await mc.registerTool(tool)
      }catch(error){
        const message=String((error as Error)?.message??error).toLowerCase()
        const isDuplicate=(error instanceof DOMException&&error.name==='InvalidStateError'&&message.includes('duplicate tool name'))||message.includes('duplicate tool name')
        if(isDuplicate)continue
        registered.delete(tool.name)
        throw error
      }
    }

    return true
  })()

  root[WEBMCP_REGISTER_PROMISE_KEY]=registration
  registration.catch(()=>{delete root[WEBMCP_REGISTER_PROMISE_KEY]})
  return registration
}
