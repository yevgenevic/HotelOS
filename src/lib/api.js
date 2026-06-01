const BASE = import.meta.env.VITE_API_URL

function getJwt() {
  try {
    return JSON.parse(localStorage.getItem('hotelos-session') || '{}').jwt || ''
  } catch {
    return ''
  }
}

async function req(method, path, body) {
  if (!BASE) return { ok: false, error: 'API sozlanmagan' }
  try {
    const headers = { 'Content-Type': 'application/json' }
    const jwt = getJwt()
    if (jwt) headers.Authorization = `Bearer ${jwt}`
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) return { ok: false, error: data?.detail || data?.error || `HTTP ${res.status}`, data }
    return { ok: true, data }
  } catch (e) {
    return { ok: false, error: e.message }
  }
}

export const checkin = (body) => req('POST', '/reception/checkin', body)
export const checkout = (roomNumber) => req('POST', `/reception/checkout/${roomNumber}`)
export const listGuests = () => req('GET', '/reception/guests')
export const getMenu = () => req('GET', '/roomservice/menu')
export const placeOrder = (body) => req('POST', '/roomservice/orders', body)
export const updateOrderStatus = (id, status) =>
  req('PATCH', `/roomservice/orders/${id}?status=${encodeURIComponent(status)}`)
export const submitIssue = (body) => req('POST', '/maintenance/issues', body)
export const listIssues = () => req('GET', '/maintenance/issues')
export const resolveIssue = (id, notes = '') => req('PATCH', `/maintenance/issues/${id}/resolve?notes=${encodeURIComponent(notes)}`)
export const assignIssue = (id) => req('PATCH', `/maintenance/issues/${id}/assign`)
export const getHousekeepingQueue = () => req('GET', '/housekeeping/queue')
export const startCleaning = (body) => req('POST', '/housekeeping/start', body)
export const cleanRoom = (roomNumber) => req('POST', `/housekeeping/rooms/${roomNumber}/clean`)
