import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { User, Mail, Shield, Clock, ExternalLink, Save, ChevronRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { updateProfile, getHistory } from '../api/client'

function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-lg bg-white/5 ${className}`} />
}

function Badge({ label }) {
  const colors = {
    email: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    google: 'text-red-400 bg-red-500/10 border-red-500/20',
    github: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors[label] || colors.email}`}>
      {label}
    </span>
  )
}

function StatusDot({ status }) {
  const map = {
    complete: 'bg-green-400',
    error: 'bg-red-400',
    pending: 'bg-yellow-400',
    scraping: 'bg-blue-400',
    analysing: 'bg-blue-400',
  }
  return <span className={`inline-block w-2 h-2 rounded-full ${map[status] || 'bg-gray-400'}`} />
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function Profile() {
  const { user, login, token } = useAuth()
  const [name, setName] = useState(user?.name || '')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [saveError, setSaveError] = useState('')
  const [history, setHistory] = useState(null)
  const [historyError, setHistoryError] = useState('')

  useEffect(() => {
    if (user) setName(user.name)
  }, [user])

  useEffect(() => {
    getHistory()
      .then(setHistory)
      .catch(err => setHistoryError(err.response?.data?.detail || 'Could not load history.'))
  }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    if (!name.trim() || saving) return
    setSaving(true)
    setSaveMsg('')
    setSaveError('')
    try {
      const updated = await updateProfile({ name: name.trim() })
      login(token, updated)
      setSaveMsg('Profile updated!')
      setTimeout(() => setSaveMsg(''), 3000)
    } catch (err) {
      setSaveError(err.response?.data?.detail || 'Update failed.')
    } finally {
      setSaving(false)
    }
  }

  if (!user) return null

  const initials = user.name
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="min-h-screen px-4 py-10 pt-24 max-w-3xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="text-2xl sm:text-3xl font-bold text-gradient mb-1">Profile</h1>
        <p className="text-gray-500 text-sm">Manage your account and view past analyses.</p>
      </motion.div>

      {/* ── Profile card ── */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="glass-strong rounded-2xl p-6 space-y-5"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xl font-bold shrink-0">
            {initials}
          </div>
          <div>
            <p className="font-semibold text-white">{user.name}</p>
            <p className="text-sm text-gray-400">{user.email}</p>
            <Badge label={user.provider || 'email'} />
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 flex items-center gap-1.5">
              <User size={12} /> Display Name
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={60}
              className="w-full glass-input rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500"
              placeholder="Your name"
              required
            />
          </div>

          {/* Email (read-only) */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 flex items-center gap-1.5">
              <Mail size={12} /> Email
            </label>
            <input
              value={user.email}
              readOnly
              className="w-full glass-input rounded-xl px-3 py-2 text-sm text-gray-400 cursor-not-allowed opacity-70"
            />
            {user.provider !== 'email' && (
              <p className="text-xs text-gray-600 mt-1">Email managed by {user.provider} — cannot be changed here.</p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl text-sm font-medium disabled:opacity-50 hover:opacity-90 transition btn-shimmer"
            >
              <Save size={14} />
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            {saveMsg && <span className="text-xs text-green-400">{saveMsg}</span>}
            {saveError && <span className="text-xs text-red-400">{saveError}</span>}
          </div>
        </form>
      </motion.section>

      {/* ── History section ── */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Clock size={16} className="text-purple-400" />
          <h2 className="text-lg font-semibold text-white">Analysis History</h2>
        </div>

        {historyError && (
          <div className="glass rounded-2xl p-5 text-center text-red-400 text-sm">{historyError}</div>
        )}

        {!history && !historyError && (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
          </div>
        )}

        {history && history.length === 0 && (
          <div className="glass rounded-2xl p-8 text-center text-gray-500 text-sm">
            No analyses yet.{' '}
            <Link to="/dashboard" className="text-purple-400 hover:text-purple-300 transition">
              Run your first analysis →
            </Link>
          </div>
        )}

        {history && history.length > 0 && (
          <div className="space-y-2">
            {history.map(item => (
              <Link
                key={item.session_id}
                to={item.status === 'complete' ? `/results/${item.session_id}` : `/loading/${item.session_id}`}
                className="flex items-center justify-between p-4 glass rounded-xl hover:bg-white/[0.04] transition group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <StatusDot status={item.status} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {item.target_role || 'Skill snapshot'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDate(item.created_at)} · {item.platforms?.filter(p => !['fusion', 'ai_analysis', 'job_matching'].includes(p)).join(', ') || 'no platforms'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    item.status === 'complete' ? 'bg-green-500/10 text-green-400' :
                    item.status === 'error' ? 'bg-red-500/10 text-red-400' :
                    'bg-yellow-500/10 text-yellow-400'
                  }`}>{item.status}</span>
                  {item.status === 'complete' && (
                    <ExternalLink size={12} className="text-gray-500 group-hover:text-gray-300 transition" />
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </motion.section>
    </div>
  )
}
