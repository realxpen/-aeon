export type MissionConstitution={goal:string;budget:number;canNegotiate:boolean;purchaseRequiresApproval:boolean;priorities:string[]}
const KEY='aeon:active-mission'
const defaults:MissionConstitution={goal:'Build the best creator setup under ₦1,000,000.',budget:1000000,canNegotiate:true,purchaseRequiresApproval:true,priorities:['performance','audio quality']}
const priorityRules:[RegExp,string][]=[
[/\b(phone|smartphone|iphone|mobile)\b/i,'smartphone fit'],
[/\b(camera|filming|photography|photograph|video)\b/i,'image/video quality'],
[/\b(audio|microphone|mic|podcast|recording|sound)\b/i,'audio quality'],
[/\b(laptop|computer|pc|coding|programming|developer|development)\b/i,'performance'],
[/\b(battery|battery life)\b/i,'battery life'],
[/\b(cheap|cheapest|affordable|lowest price|budget)\b/i,'price'],
[/\b(creator|content|studio|streaming|streamer)\b/i,'creator workflow']
]
export function deriveMissionPriorities(goal:string):string[]{const q=goal.trim();const found=priorityRules.filter(([rule])=>rule.test(q)).map(([,label])=>label);if(found.length)return [...new Set(found)];return ['mission fit','value for budget']}
export function getMissionConstitution():MissionConstitution{try{const raw=localStorage.getItem(KEY);if(!raw)return defaults;const saved={...defaults,...JSON.parse(raw)};return {...saved,priorities:deriveMissionPriorities(saved.goal)}}catch{return defaults}}
export function saveMissionConstitution(value:Partial<MissionConstitution>){const next={...getMissionConstitution(),...value};next.priorities=deriveMissionPriorities(next.goal);localStorage.setItem(KEY,JSON.stringify(next));window.dispatchEvent(new CustomEvent('aeon:mission-updated',{detail:next}));return next}
export function subscribeMissionConstitution(setter:(v:MissionConstitution)=>void){const onStorage=()=>setter(getMissionConstitution());const onCustom=(e:Event)=>setter((e as CustomEvent<MissionConstitution>).detail);window.addEventListener('storage',onStorage);window.addEventListener('aeon:mission-updated',onCustom);return()=>{window.removeEventListener('storage',onStorage);window.removeEventListener('aeon:mission-updated',onCustom)}}
