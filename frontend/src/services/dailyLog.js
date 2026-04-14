import api from './api'

export async function getLogEntries(page = 1) {
  const response = await api.get('/log/entries/', {
    params: { page },
  })
  return response.data
}

export async function getLogEntry(entryId) {
  const response = await api.get(`/log/entries/${entryId}/`)
  return response.data
}

export async function createLogEntry(payload) {
  const response = await api.post('/log/entries/', payload)
  return response.data
}

export async function updateLogEntry(entryId, payload) {
  const response = await api.patch(`/log/entries/${entryId}/`, payload)
  return response.data
}

export async function deleteLogEntry(entryId) {
  await api.delete(`/log/entries/${entryId}/`)
}

export async function getLogSummary(range = 'week') {
  const response = await api.get('/log/summary/', {
    params: { range },
  })
  return response.data
}
