import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import URLInputForm from '../components/URLInputForm'
import { submitAnalysis } from '../api/client'

export default function Home() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (formData) => {
    setLoading(true)
    setError('')
    try {
      const result = await submitAnalysis(formData)
      navigate(`/loading/${result.session_id}`)
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 pt-24 pb-16">
      {/* Glow backdrop */}
      <div className="fixed top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <div className="glow-orb glow-purple w-[500px] h-[500px] opacity-15" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 max-w-2xl w-full text-center mb-10"
      >
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs text-purple-300 font-medium mb-5">
          <Sparkles size={14} /> Analysis Dashboard
        </span>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-gradient mb-4">
          DevLens
        </h1>
        <p className="text-gray-400 text-lg">
          Show us your links. We'll show you your future.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.15 }}
        className="relative z-10 w-full max-w-2xl glass-md rounded-2xl p-6 sm:p-8"
      >
        <URLInputForm onSubmit={handleSubmit} loading={loading} />

        {error && (
          <p className="mt-4 text-red-400 text-sm text-center">{error}</p>
        )}
      </motion.div>
    </div>
  )
}
