import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Center, Loader } from '@mantine/core'

// Pages
import Login from '../pages/Login'
import DashboardLayout from '../layouts/DashboardLayout'
import Dashboard from '../pages/Dashboard'
import Usuarios from '../pages/Usuarios'
import Estudiantes from '../pages/Estudiantes'
import Eventos from '../pages/Eventos'
import EventoDetalle from '../pages/EventoDetalle'
import Asistencias from '../pages/Asistencias'
import Areas from '../pages/Areas'
import EscanearQR from '../pages/EscanearQR'

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <Center h="100vh">
        <Loader size="xl" color="green" />
      </Center>
    )
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />
}

const AppRoutes = () => {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <Center h="100vh">
        <Loader size="xl" color="green" />
      </Center>
    )
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <Login />}
      />
      
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="usuarios" element={<Usuarios />} />
        <Route path="estudiantes" element={<Estudiantes />} />
        <Route path="eventos" element={<Eventos />} />
        <Route path="eventos/:id" element={<EventoDetalle />} />
        <Route path="asistencias" element={<Asistencias />} />
        <Route path="areas" element={<Areas />} />
        <Route path="escanear-qr" element={<EscanearQR />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default AppRoutes
