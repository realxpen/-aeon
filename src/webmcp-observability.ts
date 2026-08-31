import { emitAgentActivity } from './agent-activity'

export type WebMCPTrace = {
  id: string
  missionId?: string
  tool: string
  phase: 'CALL' | 'RESULT' | 'ERROR' | 'DECISION'
  input?: unknown
  output?: unknown
  timestamp: number
}

const TRACE_EVENT = 'aeon:webmcp-trace'
const RESET_EVENT = 'aeon:webmcp-trace-reset'
const MISSION_KEY = 'aeon:active-mission'

export type ActiveMissionContext = {
  id: string
  goal: string
  budget: number
  canNegotiate: boolean
  purchaseRequiresApproval: boolean
}

export function resetWebMCPTrace() {
  window.dispatchEvent(new Event(RESET_EVENT))
}

export function setActiveMissionContext(context: ActiveMissionContext) {
  window.sessionStorage.setItem(MISSION_KEY, JSON.stringify(context))
  resetWebMCPTrace()
}

export function getActiveMissionContext(): ActiveMissionContext | null {
  try {
    const raw = window.sessionStorage.getItem(MISSION_KEY)
    return raw ? JSON.parse(raw) as ActiveMissionContext : null
  } catch {
    return null
  }
}

export function clearActiveMissionContext() {
  window.sessionStorage.removeItem(MISSION_KEY)
  resetWebMCPTrace()
}

export function emitWebMCPTrace(trace: Omit<WebMCPTrace, 'id' | 'timestamp' | 'missionId'> & { missionId?: string }) {
  const missionId = trace.missionId ?? getActiveMissionContext()?.id
  const full: WebMCPTrace = {
    ...trace,
    ...(missionId ? { missionId } : {}),
    id: `trace_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: Date.now(),
  }
  window.dispatchEvent(new CustomEvent<WebMCPTrace>(TRACE_EVENT, { detail: full }))
  return full
}

export function emitHumanDecision(decision: 'APPROVED' | 'DECLINED', detail: string) {
  emitWebMCPTrace({ tool: 'human_authority', phase: 'DECISION', output: { decision, detail } })
  emitAgentActivity({ stage: decision === 'APPROVED' ? 'ALLOWED' : 'BLOCKED', title: decision === 'APPROVED' ? 'Human approval granted' : 'Human approval declined', detail, tool: 'human_authority', reason: decision === 'DECLINED' ? 'Human chose not to authorize purchase' : undefined })
}

export function subscribeWebMCPTrace(listener: (trace: WebMCPTrace) => void, onReset?: () => void) {
  const on = (e: Event) => listener((e as CustomEvent<WebMCPTrace>).detail)
  const reset = () => onReset?.()
  window.addEventListener(TRACE_EVENT, on)
  window.addEventListener(RESET_EVENT, reset)
  return () => { window.removeEventListener(TRACE_EVENT, on); window.removeEventListener(RESET_EVENT, reset) }
}

export async function executeObserved<T>(tool: string, input: unknown, execute: () => Promise<T>): Promise<T> {
  const mission = getActiveMissionContext()
  emitWebMCPTrace({ tool, phase: 'CALL', input, missionId: mission?.id })
  emitAgentActivity({ stage: 'REQUESTED', title: `WebMCP → ${tool}`, detail: mission ? `${tool} executing for “${mission.goal}” with a ₦${mission.budget.toLocaleString()} ceiling` : 'Agent capability invoked', tool })
  try {
    const output = await execute()
    emitWebMCPTrace({ tool, phase: 'RESULT', input, output, missionId: mission?.id })
    const count = Array.isArray(output) ? output.length : undefined
    const detail = count !== undefined ? `${count} marketplace result${count === 1 ? '' : 's'} returned for this mission` : `${tool} completed for this mission`
    emitAgentActivity({ stage: 'COMPLETED', title: `WebMCP ← ${tool}`, detail, tool })
    return output
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown tool error'
    emitWebMCPTrace({ tool, phase: 'ERROR', input, output: { error: detail }, missionId: mission?.id })
    emitAgentActivity({ stage: 'BLOCKED', title: `WebMCP ✕ ${tool}`, detail, tool, reason: detail })
    throw error
  }
}
