async function api(path) {
  const response = await fetch(path)
  if (!response.ok) throw new Error(`API error: ${response.status}`)
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
