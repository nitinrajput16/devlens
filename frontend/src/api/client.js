import axios from 'axios'

// In dev, Vite proxies /api → localhost:8000 so baseURL can stay "/api".
// In production set VITE_API_URL to your deployed backend URL, e.g.
// VITE_API_URL=https://devlens-api.onrender.com
const BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/$/, '') + '/api'
  : '/api'

const api = axios.create({
  baseURL: BASE,
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token to every request if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('devlens_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export async function submitAnalysis(data) {
  const resp = await api.post('/analyse', data)
  return resp.data
}

export async function getStatus(sessionId) {
  const resp = await api.get(`/status/${sessionId}`)
  return resp.data
}

export async function getResults(sessionId) {
  const resp = await api.get(`/results/${sessionId}`)
  return resp.data
}

export async function rerunGapAnalysis(sessionId, targetRole) {
  const resp = await api.post(`/results/${sessionId}/gap`, { target_role: targetRole })
  return resp.data
}

export async function uploadResume(file) {
  const form = new FormData()
  form.append('file', file)
  const resp = await api.post('/upload-resume', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return resp.data // { resume_id, skills, projects, experience_level, summary }
}

export default api
