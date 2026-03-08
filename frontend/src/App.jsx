import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import Landing from './pages/Landing'
import Home from './pages/Home'
import Loading from './pages/Loading'
import Results from './pages/Results'
import GoogleCallback from './pages/GoogleCallback'
import GitHubCallback from './pages/GitHubCallback'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/" replace />
  return children
}

function AppRoutes() {
  return (
    <Router>
      {/* Starfield + orbs behind everything */}
      <div className="stars-bg" />

      <div className="relative z-10 min-h-screen text-white">
        <Navbar />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route path="/loading/:sessionId" element={<Loading />} />
          <Route path="/results/:sessionId" element={<Results />} />
          <Route path="/auth/google/callback" element={<GoogleCallback />} />
          <Route path="/auth/github/callback" element={<GitHubCallback />} />
        </Routes>
      </div>
    </Router>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
