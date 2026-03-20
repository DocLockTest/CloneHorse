async function api(path) {
  const response = await fetch(path, { signal: AbortSignal.timeout(15_000) })
  if (!response.ok) throw new Error(`API error: ${response.status}`)
  return response.json()
}

export async function postApi(path, body) {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  })
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.error ?? `API error: ${response.status}`)
  }
  return response.json()
}

export const fetchSnapshot = () => api('/api/snapshot')
export const fetchMarkets = () => api('/api/markets')
export const fetchAgents = () => api('/api/agents')
export const fetchTickets = () => api('/api/tickets')
export const fetchCapital = () => api('/api/capital')
export const fetchCalibration = () => api('/api/calibration')
export const fetchTriggers = (marketId) => api(`/api/triggers${marketId ? `?marketId=${encodeURIComponent(marketId)}` : ''}`)
export const fetchWorldState = (marketId) => api(`/api/world-state${marketId ? `?marketId=${encodeURIComponent(marketId)}` : ''}`)
export const fetchSwarmRuns = (marketId) => api(`/api/swarm-runs${marketId ? `?marketId=${encodeURIComponent(marketId)}` : ''}`)
export const fetchPendingTickets = () => api('/api/tickets/pending')
export const generateTicket = (marketId, triggerId) => postApi('/api/tickets/generate', { marketId, triggerId })
export const approveTicket = (ticketId) => postApi('/api/tickets/approve', { ticketId })
export const rejectTicket = (ticketId, reason) => postApi('/api/tickets/reject', { ticketId, reason })
