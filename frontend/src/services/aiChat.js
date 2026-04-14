import api from './api'

export async function getAIStatus() {
  const response = await api.get('/ai/status/')
  return response.data
}

export async function askAI(payload) {
  const response = await api.post('/ai/ask/', payload)
  return response.data
}
