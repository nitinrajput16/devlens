import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Mail, Github, Chrome, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../api/client'

const GITHUB_CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID || ''

const overlay = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
}
const modal = {
  hidden: { opacity: 0, scale: 0.92, y: 30 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', damping: 25, stiffness: 300 } },
  exit: { opacity: 0, scale: 0.92, y: 30, transition: { duration: 0.2 } },
}

export default function AuthModal({ isOpen, onClose }) {
  const { login } = useAuth()
  const [mode, setMode] = useState('login')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')

  const set = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }))

  // ── Google Sign-In ────────────────────────────────────────────────────
  const handleGoogle = () => {
    setError('')
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    if (!googleClientId) {
      setError('Google Client ID not configured')
      return
    }
    // Use Google's OAuth 2.0 popup flow
    const redirectUri = window.location.origin + '/auth/google/callback'
    const scope = 'openid email profile'
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${googleClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token+id_token&scope=${encodeURIComponent(scope)}&nonce=${Date.now()}`
    const popup = window.open(url, 'google-login', 'width=500,height=600')

    // Listen for message from popup
    const handler = async (event) => {
      if (event.origin !== window.location.origin) return
      if (event.data?.type !== 'google-auth') return
      window.removeEventListener('message', handler)
      popup?.close()

      setLoading(true)
      try {
        const resp = await api.post('/auth/google', { credential: event.data.id_token })
        login(resp.data.token, resp.data.user)
        onClose()
      } catch (err) {
        setError(err.response?.data?.detail || 'Google sign-in failed')
      } finally {
        setLoading(false)
      }
    }
    window.addEventListener('message', handler)
  }

  // ── GitHub Sign-In ────────────────────────────────────────────────────
  const handleGitHub = () => {
    setError('')
    if (!GITHUB_CLIENT_ID) {
      setError('GitHub Client ID not configured')
      return
    }
    const redirectUri = window.location.origin + '/auth/github/callback'
    const url = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=read:user+user:email`
    const popup = window.open(url, 'github-login', 'width=500,height=700')

    const handler = async (event) => {
      if (event.origin !== window.location.origin) return
      if (event.data?.type !== 'github-auth') return
      window.removeEventListener('message', handler)
      popup?.close()

      setLoading(true)
      try {
        const resp = await api.post('/auth/github', { code: event.data.code })
        login(resp.data.token, resp.data.user)
        onClose()
      } catch (err) {
        setError(err.response?.data?.detail || 'GitHub sign-in failed')
      } finally {
        setLoading(false)
      }
    }
    window.addEventListener('message', handler)
  }

  // ── Email submit ──────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.email || !form.password) return setError('Email and password required')
    if (mode === 'signup' && !form.name) return setError('Name is required')
    setLoading(true)
    try {
      const endpoint = mode === 'signup' ? '/auth/register' : '/auth/login'
      const payload = mode === 'signup'
        ? { name: form.name, email: form.email, password: form.password }
        : { email: form.email, password: form.password }
      const resp = await api.post(endpoint, payload)
      login(resp.data.token, resp.data.user)
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          variants={overlay}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            variants={modal}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative z-10 w-full max-w-md glass-strong rounded-2xl p-8 shadow-2xl"
          >
            {/* Close */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition"
            >
              <X size={20} />
            </button>

            {/* Header */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gradient mb-1">
                {mode === 'login' ? 'Welcome Back' : 'Create Account'}
              </h2>
              <p className="text-sm text-gray-400">
                {mode === 'login' ? 'Sign in to continue to DevLens' : 'Sign up to start using DevLens'}
              </p>
            </div>

            {/* Social buttons */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button
                onClick={handleGoogle}
                disabled={loading}
                className="flex items-center justify-center gap-2 py-2.5 glass rounded-xl hover:bg-white/10 transition text-sm font-medium disabled:opacity-50"
              >
                <Chrome size={18} /> Google
              </button>
              <button
                onClick={handleGitHub}
                disabled={loading}
                className="flex items-center justify-center gap-2 py-2.5 glass rounded-xl hover:bg-white/10 transition text-sm font-medium disabled:opacity-50"
              >
                <Github size={18} /> GitHub
              </button>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-xs text-gray-500 uppercase tracking-wider">or continue with email</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <input
                  type="text"
                  placeholder="Full name"
                  value={form.name}
                  onChange={set('name')}
                  className="w-full glass-input rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500"
                />
              )}
              <input
                type="email"
                placeholder="Email address"
                value={form.email}
                onChange={set('email')}
                className="w-full glass-input rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500"
              />
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="Password"
                  value={form.password}
                  onChange={set('password')}
                  className="w-full glass-input rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder-gray-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {error && <p className="text-red-400 text-xs">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 font-semibold text-sm hover:opacity-90 transition disabled:opacity-50 btn-shimmer"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : (
                  <>{mode === 'login' ? 'Sign In' : 'Create Account'} <ArrowRight size={16} /></>
                )}
              </button>
            </form>

            {/* Toggle */}
            <p className="text-center text-sm text-gray-400 mt-5">
              {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
              <button
                onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }}
                className="text-purple-400 hover:text-purple-300 font-medium transition"
              >
                {mode === 'login' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
