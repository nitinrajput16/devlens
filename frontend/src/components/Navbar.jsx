import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Hexagon, LogOut, User } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import AuthModal from './AuthModal'

export default function Navbar() {
  const { user, logout } = useAuth()
  const [authOpen, setAuthOpen] = useState(false)
  const navigate = useNavigate()

  return (
    <>
      <motion.nav
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="fixed top-0 left-0 right-0 z-40 glass"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-3">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <Hexagon size={28} className="text-purple-400 group-hover:text-purple-300 transition" />
            <span className="text-lg font-bold text-gradient">DevLens</span>
          </Link>

          {/* Nav links (visible on md+) */}
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
            <a href="/#features" className="hover:text-white transition">Features</a>
            <a href="/#visualize" className="hover:text-white transition">Visualize</a>
            {user && (
              <button onClick={() => navigate('/dashboard')} className="hover:text-white transition">Dashboard</button>
            )}
          </div>

          {/* Right */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2 text-sm text-gray-300">
                  <User size={16} className="text-purple-400" />
                  <span className="max-w-[120px] truncate">{user.name}</span>
                </div>
                <button
                  onClick={logout}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 hover:text-white glass rounded-lg transition"
                >
                  <LogOut size={14} /> Sign out
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAuthOpen(true)}
                className="px-5 py-2 text-sm font-semibold rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 hover:opacity-90 transition btn-shimmer"
              >
                Get Started
              </button>
            )}
          </div>
        </div>
      </motion.nav>

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  )
}
