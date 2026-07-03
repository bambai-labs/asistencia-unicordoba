import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const url = error.config?.url || ''
    const esLogin = url.endsWith('/auth/login')
    if (error.response?.status === 401 && !esLogin) {
      localStorage.removeItem('token')
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error.response?.data || error.message)
  }
)

export const authService = {
  login: (credentials) => api.post('/auth/login', credentials),
  me: () => api.get('/auth/me')
}

export const usuariosService = {
  getAll: () => api.get('/usuarios'),
  create: (data) => api.post('/usuarios', data),
  update: (id, data) => api.put(`/usuarios/${id}`, data),
  delete: (id) => api.delete(`/usuarios/${id}`)
}

export const estudiantesService = {
  getAll: (params = {}) => api.get('/estudiantes', { params }),
  getById: (id) => api.get(`/estudiantes/${id}`),
  getByCodigo: (codigo) => api.get(`/estudiantes/codigo/${codigo}`),
  getPeriodos: () => api.get('/estudiantes/periodos'),
  update: (id, data) => api.put(`/estudiantes/${id}`, data)
}

export const eventosService = {
  getAll: (params) => api.get('/eventos', { params }),
  getById: (id) => api.get(`/eventos/${id}`),
  getProfesionales: () => api.get('/eventos/filtros/profesionales'),
  create: (data) => api.post('/eventos', data),
  update: (id, data) => api.put(`/eventos/${id}`, data),
  delete: (id) => api.delete(`/eventos/${id}`),
  addFoto: (id, data) => api.post(`/eventos/${id}/fotos`, data),
  deleteFoto: (id, fotoId) => api.delete(`/eventos/${id}/fotos/${fotoId}`)
}

export const asistenciaService = {
  getByEvento: (eventoId) => api.get(`/asistencia/evento/${eventoId}`),
  getEstadisticas: (eventoId) => api.get(`/asistencia/evento/${eventoId}/estadisticas`),
  getByEstudiante: (estudianteId) => api.get(`/asistencia/estudiante/${estudianteId}`),
  getEventosActivos: () => api.get('/asistencia/eventos-activos'),
  registrarManual: (data) => api.post('/asistencia/registrar-manual', data),
  registrarQR: (data) => api.post('/asistencia/registrar-qr', data),
  delete: (id) => api.delete(`/asistencia/${id}`),
  exportarExcel: async (eventoId) => {
    const token = localStorage.getItem('token')
    const response = await fetch(`${API_URL}/asistencia/evento/${eventoId}/exportar`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (!response.ok) throw new Error('Error al exportar asistencias')
    return response.blob()
  }
}

export const uploadService = {
  uploadImage: (file) => {
    const formData = new FormData()
    formData.append('imagen', file)
    return api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  deleteImage: (filename) => api.delete(`/upload/${filename}`)
}

export const areasService = {
  getAll: (params) => api.get('/areas', { params }),
  getById: (id) => api.get(`/areas/${id}`),
  create: (data) => api.post('/areas', data),
  update: (id, data) => api.put(`/areas/${id}`, data),
  delete: (id) => api.delete(`/areas/${id}`)
}

export default api