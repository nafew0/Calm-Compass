import api from './api'

export async function listMedications() {
  const response = await api.get('/medications/')
  return response.data
}

export async function getMedication(medicationId) {
  const response = await api.get(`/medications/${medicationId}/`)
  return response.data
}

export async function createMedication(payload) {
  const response = await api.post('/medications/', payload)
  return response.data
}

export async function updateMedication(medicationId, payload) {
  const response = await api.patch(`/medications/${medicationId}/`, payload)
  return response.data
}

export async function archiveMedication(medicationId) {
  await api.delete(`/medications/${medicationId}/`)
}

export async function getUpcomingDoses() {
  const response = await api.get('/medications/upcoming/')
  return response.data
}

export async function getMedicationAdherence(range = 'week') {
  const response = await api.get('/medications/adherence/', {
    params: { range },
  })
  return response.data
}

export async function logMedicationDose(payload) {
  const response = await api.post('/medications/logs/', payload)
  return response.data
}
