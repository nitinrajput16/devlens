import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { getStatus } from '../api/client'

function StatusIcon({ state }) {
  if (state === 'done')     return <CheckCircle2 size={16} className="text-green-400" />
  if (state === 'error')    return <XCircle size={16} className="text-red-400" />
  if (state === 'scraping' || state === 'running')
    return <Loader2 size={16} className="text-purple-400 animate-spin" />
  return <Clock size={16} className="text-gray-500" />
}

export default function Loading() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState('pending')
  const [progress, setProgress] = useState({})

  useEffect(() => {
    let cancelled = false

    const interval = setInterval(async () => {
      if (cancelled) return
      try {
        const data = await getStatus(sessionId)
        if (cancelled) return
        setStatus(data.status)
        setProgress(data.progress || {})

        if (data.status === 'complete') {
          clearInterval(interval)
          navigate(`/results/${sessionId}`)
        }
        if (data.status === 'error') {
          clearInterval(interval)
        }
      } catch {
        clearInterval(interval)
      }
    }, 2000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [sessionId, navigate])

  const platformKeys = Object.keys(progress).filter(k => k !== 'fusion' && k !== 'ai_analysis' && k !== 'job_matching')

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 pt-20">
      {/* Ambient glow */}
      <div className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <div className="glow-orb glow-purple w-[400px] h-[400px] opacity-12" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 text-center mb-8"
      >
        <Loader2 size={36} className="mx-auto text-purple-400 animate-spin mb-4" />
        <h2 className="text-2xl sm:text-3xl font-bold text-gradient mb-2">Analysing your profiles…</h2>
        <p className="text-gray-500 text-sm capitalize">Status: {status}</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="relative z-10 w-full max-w-md glass-md rounded-2xl p-5 space-y-2.5"
      >
        {platformKeys.map((p) => (
          <div key={p} className="flex items-center justify-between glass rounded-xl px-4 py-2.5">
            <span className="capitalize text-sm">{p}</span>
            <StatusIcon state={progress[p]} />
          </div>
        ))}

        {(status === 'analysing' || status === 'complete') && (
          <>
            <div className="border-t border-white/5 my-1" />
            <div className="flex items-center justify-between glass rounded-xl px-4 py-2.5">
              <span className="text-sm">Profile Fusion</span>
              <StatusIcon state={progress.fusion} />
            </div>
            <div className="flex items-center justify-between glass rounded-xl px-4 py-2.5">
              <span className="text-sm">AI Analysis</span>
              <StatusIcon state={progress.ai_analysis || progress.job_matching} />
            </div>
          </>
        )}
      </motion.div>

      {status === 'error' && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-6 text-red-400 text-sm glass rounded-xl px-5 py-3"
        >
          An error occurred during analysis. Check your URLs and try again.
        </motion.p>
      )}
    </div>
  )
}
