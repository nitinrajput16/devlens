import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import html2pdf from 'html2pdf.js'
import { getResults, rerunGapAnalysis } from '../api/client'
import SkillRadar from '../components/SkillRadar'
import SkillReadinessBar from '../components/SkillReadinessBar'
import GapHeatmap from '../components/GapHeatmap'
import JobCards from '../components/JobCards'
import ReadinessGauge from '../components/ReadinessGauge'
import RoadmapTimeline from '../components/RoadmapTimeline'

// ── Skeleton helpers ─────────────────────────────────────────────────────────
function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-lg bg-white/5 ${className}`} />
}

function ResultsSkeleton() {
  return (
    <div className="min-h-screen px-4 py-10 pt-24 max-w-6xl mx-auto space-y-12">
      <div className="text-center space-y-3">
        <Skeleton className="h-10 w-72 mx-auto rounded-xl" />
        <Skeleton className="h-4 w-52 mx-auto" />
      </div>
      <Skeleton className="h-14 w-full rounded-2xl" />
      <Skeleton className="h-[420px] w-full rounded-2xl" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  )
}

// ── Inline SVG icons ─────────────────────────────────────────────────────────
function DownloadIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
    </svg>
  )
}
function ShareIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-4 10h6a2 2 0 002-2v-8a2 2 0 00-2-2h-6a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  )
}
function CheckIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}
function Spinner() {
  return <span className="inline-block w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin shrink-0" />
}

// ── Main component ───────────────────────────────────────────────────────────
export default function Results() {
  const { sessionId } = useParams()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [roleInput, setRoleInput] = useState('')
  const [rerunning, setRerunning] = useState(false)
  const [rerunError, setRerunError] = useState('')
  const printRef = useRef()

  const fetchResults = async () => {
    try {
      setError('')
      const result = await getResults(sessionId)
      setData(result)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load results. The session may still be processing.')
    }
  }

  useEffect(() => { fetchResults() }, [sessionId])

  // ── PDF export ────────────────────────────────────────────────────────────
  const handleExport = async () => {
    if (!printRef.current || exporting) return
    setExporting(true)
    try {
      await html2pdf()
        .set({
          margin: 0.5,
          filename: `devlens-${sessionId.slice(0, 8)}.pdf`,
          image: { type: 'jpeg', quality: 0.95 },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: '#111827' },
          jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' },
        })
        .from(printRef.current)
        .save()
    } finally {
      setExporting(false)
    }
  }

  // ── Share / copy link ─────────────────────────────────────────────────────
  const handleShare = async () => {
    const url = `${window.location.origin}/results/${sessionId}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Fallback for browsers without Clipboard API
      window.prompt('Copy this shareable link:', url)
    }
  }

  // ── Inline Mode 2 re-run ──────────────────────────────────────────────────
  const handleRerun = async (e) => {
    e.preventDefault()
    if (!roleInput.trim() || rerunning) return
    setRerunning(true)
    setRerunError('')
    try {
      const updated = await rerunGapAnalysis(sessionId, roleInput.trim())
      setData(prev => ({ ...prev, gap_report: updated.gap_report, roadmap: updated.roadmap }))
      setRoleInput('')
    } catch (err) {
      setRerunError(err.response?.data?.detail || 'Gap analysis failed — please try again.')
    } finally {
      setRerunning(false)
    }
  }

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (!data && !error) return <ResultsSkeleton />

  // ── Error state ───────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 gap-4 text-center pt-20">
        <div className="glass-strong rounded-2xl px-6 py-5 max-w-md w-full border-red-500/20">
          <p className="text-red-300 font-semibold mb-1">Could not load results</p>
          <p className="text-red-400 text-sm">{error}</p>
        </div>
        <button
          onClick={fetchResults}
          className="px-5 py-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl text-sm font-medium hover:opacity-90 transition btn-shimmer"
        >
          Retry
        </button>
      </div>
    )
  }

  const profile = data.unified_profile
  const gapReport = data.gap_report
  const jobMatches = data.job_matches || []
  const roadmap = data.roadmap

  return (
    <div className="min-h-screen px-4 py-10 pt-24 max-w-6xl mx-auto">

      {/* Header */}
      <h1 className="text-3xl sm:text-4xl font-bold text-center mb-2 text-gradient">
        DevLens Results
      </h1>
      <p className="text-center text-gray-500 text-sm mb-6">Session: {sessionId}</p>

      {/* Action bar: Export PDF + Copy Link */}
      <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 px-4 py-2 glass rounded-xl text-sm font-medium hover:bg-white/[0.06] transition disabled:opacity-50"
        >
          {exporting ? <><Spinner />Exporting…</> : <><DownloadIcon />Export PDF</>}
        </button>
        <button
          onClick={handleShare}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
            copied ? 'bg-green-600/30 border border-green-500/30 text-green-300' : 'glass hover:bg-white/[0.06] text-white'
          }`}
        >
          {copied ? <><CheckIcon />Copied!</> : <><ShareIcon />Copy Link</>}
        </button>
      </div>

      {/* ── Inline Mode 2: target role input ─────────────────────────────── */}
      <section className="mb-10">
        <div className="glass-md rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-gray-200 mb-1">
            {gapReport ? 'Re-run gap analysis for a different role' : 'Run gap analysis against a target role'}
          </h3>
          <p className="text-xs text-gray-500 mb-3">
            Uses your already-scraped profile — no need to re-submit URLs.
          </p>
          <form onSubmit={handleRerun} className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={roleInput}
              onChange={e => setRoleInput(e.target.value)}
              placeholder='e.g. "Senior Frontend Engineer" or "ML Engineer"'
              disabled={rerunning}
              className="flex-1 glass-input rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={rerunning || !roleInput.trim()}
              className="flex items-center justify-center gap-2 px-5 py-2 bg-gradient-to-r from-blue-500 to-purple-600 disabled:opacity-50 rounded-xl text-sm font-medium hover:opacity-90 transition whitespace-nowrap btn-shimmer"
            >
              {rerunning ? <><Spinner />Analysing…</> : 'Analyse'}
            </button>
          </form>
          {rerunError && <p className="text-red-400 text-xs mt-2">{rerunError}</p>}
        </div>
      </section>

      {/* ── Printable results area ────────────────────────────────────────── */}
      <div ref={printRef} className="space-y-12">

        {/* Skill Profile — radar + readiness bars side by side */}
        <section>
          <h2 className="text-xl sm:text-2xl font-semibold mb-4">Skill Profile</h2>
          {profile?.skills?.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <SkillRadar skills={profile.skills} />
              </div>
              <div>
                <SkillReadinessBar skills={profile.skills} />
              </div>
            </div>
          ) : (
            <div className="glass rounded-2xl p-10 text-center text-gray-500 text-sm">
              No skills detected. Make sure at least one platform was scraped successfully.
            </div>
          )}
        </section>

        {/* Readiness Gauge (Mode 2) */}
        {gapReport && (
          <section>
            <h2 className="text-xl sm:text-2xl font-semibold mb-4">Role Readiness</h2>
            <ReadinessGauge score={gapReport.readiness_score} assessment={gapReport.honest_assessment} />
          </section>
        )}

        {/* Gap Heatmap (Mode 2) */}
        {gapReport && (
          <section>
            <h2 className="text-xl sm:text-2xl font-semibold mb-4">Skill Gap Analysis</h2>
            <GapHeatmap gapReport={gapReport} profileSkills={profile?.skills || []} />
          </section>
        )}

        {/* Job Match Cards (Mode 1) */}
        {!gapReport && (
          <section>
            <h2 className="text-xl sm:text-2xl font-semibold mb-4">Top Job Matches</h2>
            {jobMatches.length > 0 ? (
              <JobCards jobs={jobMatches} />
            ) : (
              <div className="glass rounded-2xl p-10 text-center text-gray-500 text-sm">
                No job matches found. Check that your JSearch API key is configured, or enter a target role above.
              </div>
            )}
          </section>
        )}

        {/* Roadmap (Mode 2) */}
        {roadmap?.weeks?.length > 0 && (
          <section>
            <h2 className="text-xl sm:text-2xl font-semibold mb-4">Learning Roadmap</h2>
            <RoadmapTimeline weeks={roadmap.weeks} />
          </section>
        )}

      </div>
    </div>
  )
}
