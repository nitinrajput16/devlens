import { useState, useRef } from 'react'
import { ArrowRight, Loader2, ChevronDown, ChevronUp, FileText, CheckCircle2, XCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { uploadResume } from '../api/client'

const FIELDS = [
  { key: 'github_url',        label: 'GitHub',         placeholder: 'https://github.com/username',                    dot: 'bg-gray-300' },
  { key: 'leetcode_url',      label: 'LeetCode',        placeholder: 'https://leetcode.com/username',                  dot: 'bg-yellow-400' },
  { key: 'codeforces_url',    label: 'Codeforces',      placeholder: 'https://codeforces.com/profile/handle',         dot: 'bg-blue-400' },
  { key: 'stackoverflow_url', label: 'Stack Overflow',  placeholder: 'https://stackoverflow.com/users/123/name',      dot: 'bg-orange-400' },
  { key: 'kaggle_url',        label: 'Kaggle',          placeholder: 'https://www.kaggle.com/username',               dot: 'bg-cyan-400' },
  { key: 'devto_url',         label: 'Dev.to',          placeholder: 'https://dev.to/username',                       dot: 'bg-purple-400' },
  { key: 'npm_url',           label: 'npm',             placeholder: 'https://www.npmjs.com/~username',               dot: 'bg-red-400' },
  { key: 'pypi_url',          label: 'PyPI',            placeholder: 'https://pypi.org/project/package-name/',       dot: 'bg-green-400' },
]

export default function URLInputForm({ onSubmit, loading }) {
  const [form, setForm] = useState({})
  const [targetRole, setTargetRole] = useState('')
  const [showCustom, setShowCustom] = useState(false)
  // Start with only 1 field visible; expand as user fills fields
  const [visibleCount, setVisibleCount] = useState(1)

  // Resume upload state
  const [resumeFile, setResumeFile] = useState(null)       // File object
  const [resumeId, setResumeId] = useState(null)           // returned by backend
  const [resumeSkills, setResumeSkills] = useState([])     // preview chips
  const [resumeSummary, setResumeSummary] = useState('')
  const [resumeUploading, setResumeUploading] = useState(false)
  const [resumeError, setResumeError] = useState('')
  const fileInputRef = useRef(null)

  const handleChange = (key, value, index) => {
    setForm(prev => ({ ...prev, [key]: value }))
    // Reveal the next field as soon as this one has content
    if (value.trim() && index + 2 > visibleCount) {
      setVisibleCount(Math.min(index + 2, FIELDS.length))
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const data = { ...form }
    if (targetRole.trim()) data.target_role = targetRole.trim()
    if (resumeId) data.resume_id = resumeId
    onSubmit(data)
  }

  const handleResumeChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setResumeError('Only PDF files are supported')
      return
    }
    setResumeFile(file)
    setResumeError('')
    setResumeId(null)
    setResumeSkills([])
    setResumeSummary('')
    setResumeUploading(true)
    try {
      const result = await uploadResume(file)
      setResumeId(result.resume_id)
      setResumeSkills(result.skills || [])
      setResumeSummary(result.summary || '')
    } catch (err) {
      setResumeError('Upload failed — check file and try again')
    } finally {
      setResumeUploading(false)
    }
  }

  const clearResume = () => {
    setResumeFile(null)
    setResumeId(null)
    setResumeSkills([])
    setResumeSummary('')
    setResumeError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const filledCount = FIELDS.filter(f => form[f.key]?.trim()).length

  // include custom_url in filled count when present
  const customFilled = form.custom_url && form.custom_url.trim() ? 1 : 0

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-3">
      <AnimatePresence initial={false}>
        {FIELDS.slice(0, visibleCount).map(({ key, label, placeholder, dot }, index) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <label className="flex items-center gap-2 text-sm text-gray-400 mb-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
              {label}
            </label>
            <input
              type="url"
              placeholder={placeholder}
              value={form[key] || ''}
              onChange={e => handleChange(key, e.target.value, index)}
              className="w-full glass-input rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500"
            />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Show more / collapse toggles */}
      {(() => {
        // minimum visible = max(1, number of already-filled fields)
        const filledVisible = FIELDS.slice(0, visibleCount).filter(f => form[f.key]?.trim()).length
        const minVisible = Math.max(1, filledVisible)
        const canExpand = visibleCount < FIELDS.length
        const canCollapse = visibleCount > minVisible
        return (
          <div className="flex items-center gap-3">
            {canExpand && (
              <button
                type="button"
                onClick={() => setVisibleCount(FIELDS.length)}
                className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition py-1"
              >
                <ChevronDown size={14} />
                Show {FIELDS.length - visibleCount} more platform{FIELDS.length - visibleCount !== 1 ? 's' : ''}
              </button>
            )}
            {canCollapse && (
              <button
                type="button"
                onClick={() => setVisibleCount(minVisible)}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition py-1"
              >
                <ChevronUp size={14} />
                Collapse empty fields
              </button>
            )}
          </div>
        )
      })()}

      {/* Custom URL add button + input */}
      <div>
        {!showCustom ? (
          <button
            type="button"
            onClick={() => setShowCustom(true)}
            className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition py-1"
          >
            + Add Custom URL
          </button>
        ) : (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden mt-2"
            >
              <label className="flex items-center gap-2 text-sm text-gray-400 mb-1.5">
                <span className={`w-1.5 h-1.5 rounded-full bg-white/40`} />
                Custom URL
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://example.com/profile-or-project"
                  value={form.custom_url || ''}
                  onChange={e => handleChange('custom_url', e.target.value, visibleCount)}
                  className="flex-1 glass-input rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500"
                />
                <button
                  type="button"
                  onClick={() => { setForm(prev => { const p = { ...prev }; delete p.custom_url; return p }); setShowCustom(false) }}
                  className="text-sm text-gray-400 hover:text-gray-300 px-3"
                >Remove</button>
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Resume upload */}
      <div className="pt-1">
        <input
          ref={fileInputRef}
          id="resume-upload"
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={handleResumeChange}
        />

        {!resumeFile ? (
          <label
            htmlFor="resume-upload"
            className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition py-1 cursor-pointer"
          >
            <FileText size={13} />
            Upload Resume (PDF)
          </label>
        ) : (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden mt-1"
            >
              {/* File row */}
              <div className="flex items-center gap-2 mb-2">
                {resumeUploading ? (
                  <Loader2 size={14} className="animate-spin text-purple-400" />
                ) : resumeId ? (
                  <CheckCircle2 size={14} className="text-green-400" />
                ) : (
                  <XCircle size={14} className="text-red-400" />
                )}
                <span className="text-xs text-gray-300 truncate max-w-[200px]">{resumeFile.name}</span>
                {resumeUploading && (
                  <span className="text-xs text-gray-500">Extracting skills…</span>
                )}
                <button
                  type="button"
                  onClick={clearResume}
                  className="ml-auto text-xs text-gray-500 hover:text-gray-300"
                >
                  Remove
                </button>
              </div>

              {/* Error */}
              {resumeError && (
                <p className="text-xs text-red-400 mb-2">{resumeError}</p>
              )}

              {/* Summary */}
              {resumeSummary && (
                <p className="text-xs text-gray-400 italic mb-2">{resumeSummary}</p>
              )}

              {/* Skill chips preview */}
              {resumeSkills.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {resumeSkills.slice(0, 12).map(s => (
                    <span
                      key={s}
                      className="text-xs bg-white/5 border border-white/10 text-gray-300 rounded-full px-2 py-0.5"
                    >
                      {s}
                    </span>
                  ))}
                  {resumeSkills.length > 12 && (
                    <span className="text-xs text-gray-500">+{resumeSkills.length - 12} more</span>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Target role — visible once at least one URL/resume is provided */}
      <AnimatePresence>
        {(filledCount + customFilled > 0 || !!resumeId) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden pt-3 border-t border-white/5"
          >
            <label className="block text-sm text-gray-400 mb-1.5">
              Target Role <span className="text-gray-600">(optional — enables gap analysis)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Senior Backend Engineer at a product startup"
              value={targetRole}
              onChange={e => setTargetRole(e.target.value)}
              className="w-full glass-input rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="submit"
        disabled={loading || resumeUploading || (filledCount + customFilled === 0 && !resumeId)}
        className="w-full mt-2 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold py-3 rounded-xl hover:opacity-90 transition disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed btn-shimmer"
      >
        {loading ? (
          <><Loader2 size={18} className="animate-spin" /> Analysing...</>
        ) : (
          <>Analyse My Profiles <ArrowRight size={18} /></>
        )}
      </button>
    </form>
  )
}
