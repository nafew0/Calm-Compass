import api from './api'

export async function getBehaviorCategories() {
  const response = await api.get('/kb/categories/')
  return response.data?.results ?? response.data
}

export async function getBehaviorCategory(slug) {
  const response = await api.get(`/kb/categories/${slug}/`)
  return response.data
}

export async function searchBehaviors(search) {
  const response = await api.get('/kb/behaviors/', {
    params: { search },
  })
  return response.data?.results ?? response.data
}

export async function getBehaviorDetail(slug) {
  const response = await api.get(`/kb/behaviors/${slug}/`)
  return response.data
}

export async function getLastViewedBehavior() {
  const response = await api.get('/kb/me/last-viewed/')
  return response.data
}

export async function recordBehaviorView(slug) {
  const response = await api.post(`/kb/behaviors/${slug}/view/`)
  return response.data
}
