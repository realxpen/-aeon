import { emitAgentActivity } from './agent-activity'

export type WebMCPTrace = {
  id: string
  tool: string
  phase: 'CALL' | 'RESULT' | 'ERROR'
  input?: unknown
  output?: unknown
  timestamp: number
}

const TRACE_EVENT = 'aeon:webmcp-trace'

export function emitWebMCPTrace(trace: Omit<WebMCPTrace, 'id' | 'timestamp'>) {
  const full = { ...trace, id: `trace_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, timestamp: Date.now() }
  window.dispatchEvent(new CustomEvent<WebMCPTrace>(TRACE_EVENT, { detail: full }))
  return full
}

export function subscribeWebMCPTrace(listener: (trace: WebMCPTrace) => void) {
  const on = (e: Event) => listener((e as CustomEvent<WebMCPTrace>).detail)
  window.addEventListener(TRACE_EVENT, on)
  return () => window.removeEventListener(TRACE_EVENT, on)
}

export async function executeObserved<T>(tool: string, input: unknown, execute: () => Promise<T>): Promise<T> {
  emitWebMCPTrace({ tool, phase: 'CALL', input })
  emitAgentActivity({ stage: 'REQUESTED', title: `WebMCP → ${tool}`, detail: 'Agent capability invoked', tool })
  try {
    const output = await execute()
    emitWebMCPTrace({ tool, phase: 'RESULT', input, output })
    emitAgentActivity({ stage: 'COMPLETED', title: `WebMCP ← ${tool}`, detail: 'Capability returned a result', tool })
    return output
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown tool error'
    emitWebMCPTrace({ tool, phase: 'ERROR', input, output: { error: detail } })
    emitAgentActivity({ stage: 'BLOCKED', title: `WebMCP ✕ ${tool}`, detail, tool, reason: detail })
    throw error
  }
}
