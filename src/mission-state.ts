export type MissionConstitution={goal:string;budget:number;canNegotiate:boolean;purchaseRequiresApproval:boolean;priorities:string[]}
export type ParsedBudget={amount:number;scope:'total'|'item';source:string}
const KEY='aeon:active-mission'
const defaults:MissionConstitution={goal:'Build the best creator setup under ₦1,000,000.',budget:1000000,canNegotiate:true,purchaseRequiresApproval:true,priorities:['performance','audio quality']}
const priorityRules:[RegExp,string][]=[
[/\b(phone|smartphone|iphone|mobile)\b/i,'smartphone fit'],[/\b(camera|filming|photography|photograph|video)\b/i,'image/video quality'],[/\b(audio|microphone|mic|podcast|recording|sound)\b/i,'audio quality'],[/\b(laptop|computer|pc|coding|programming|developer|development)\b/i,'performance'],[/\b(battery|battery life)\b/i,'battery life'],[/\b(cheap|cheapest|affordable|lowest price|budget)\b/i,'price'],[/\b(creator|content|studio|streaming|streamer)\b/i,'creator workflow']
]
export function deriveMissionPriorities(goal:string):string[]{const q=goal.trim();const found=priorityRules.filter(([rule])=>rule.test(q)).map(([,label])=>label);if(found.length)return [...new Set(found)];return ['mission fit','value for budget']}
/** Extract an explicit price ceiling from natural language. Returns null when the user did not provide one. */
export function parseMissionBudget(goal:string):ParsedBudget|null{
 const q=goal.replace(/,/g,'');
 const money=/(?:₦|NGN|Naira\s*)?\s*(\d+(?:\.\d+)?)\s*(k|K|thousand|m|M|million)?/g;
 let match:RegExpExecArray|null; const candidates:ParsedBudget[]=[];
 while((match=money.exec(q))){const raw=match[0];const n=Number(match[1]);const unit=(match[2]||'').toLowerCase();if(!n||(!/[₦]|\bngn\b|\bnaira\b|\bunder\b|\bbelow\b|\bup to\b|\bmaximum\b|\bmax\b|\bceiling\b|\bbudget\b|\baround\b/i.test(q.slice(Math.max(0,match.index-28),Math.min(q.length,match.index+raw.length+28))) && !unit))continue;const amount=unit==='k'||unit==='thousand'?n*1000:unit==='m'||unit==='million'?n*1000000:n;if(amount<1000)continue;const before=q.slice(Math.max(0,match.index-45),match.index);const after=q.slice(match.index+raw.length,match.index+raw.length+35);const item=/\b(phone|smartphone|iphone|mobile|camera|laptop|computer|pc|microphone|mic|headphone|tablet)\b/i.test(before+after);candidates.push({amount,scope:item?'item':'total',source:raw.trim()})}
 if(!candidates.length)return null;
 const explicitCeiling=/\b(under|below|up\s+to|max(?:imum)?|ceiling|within|no\s+more\s+than|less\s+than)\b/i.test(q);
 if(!explicitCeiling&&!/\b(total|overall|entire|all|for\s+everything)\b/i.test(q)&&candidates.length===1)return null;
 return candidates.find(c=>c.scope==='total')??candidates[0]??null;
}
export function getMissionConstitution():MissionConstitution{try{const raw=localStorage.getItem(KEY);if(!raw)return defaults;const saved={...defaults,...JSON.parse(raw)};return {...saved,priorities:deriveMissionPriorities(saved.goal)}}catch{return defaults}}
export function saveMissionConstitution(value:Partial<MissionConstitution>){const next={...getMissionConstitution(),...value};next.priorities=deriveMissionPriorities(next.goal);localStorage.setItem(KEY,JSON.stringify(next));window.dispatchEvent(new CustomEvent('aeon:mission-updated',{detail:next}));return next}
export function subscribeMissionConstitution(setter:(v:MissionConstitution)=>void){const onStorage=()=>setter(getMissionConstitution());const onCustom=(e:Event)=>setter((e as CustomEvent<MissionConstitution>).detail);window.addEventListener('storage',onStorage);window.addEventListener('aeon:mission-updated',onCustom);return()=>{window.removeEventListener('storage',onStorage);window.removeEventListener('aeon:mission-updated',onCustom)}}