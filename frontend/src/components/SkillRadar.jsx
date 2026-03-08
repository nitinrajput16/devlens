import { useState } from 'react'
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts'
import { motion, AnimatePresence } from 'framer-motion'

// ── Category taxonomy ───────────────────────────────────────────────────────
const CATEGORIES = {
  'Languages': ['JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'Rust', 'C++', 'C#', 'Ruby', 'PHP', 'Kotlin', 'Swift', 'Dart', 'Scala'],
  'Frontend': ['React', 'Vue.js', 'Angular', 'Svelte', 'Next.js', 'Tailwind CSS', 'HTML', 'CSS', 'Bootstrap'],
  'Backend': ['Node.js', 'Express.js', 'FastAPI', 'Django', 'Flask', 'Spring Boot', 'ASP.NET', 'Ruby on Rails', 'Laravel'],
  'Database': ['MongoDB', 'PostgreSQL', 'MySQL', 'Redis', 'SQLite', 'DynamoDB', 'Elasticsearch', 'Firebase', 'Supabase'],
  'DevOps': ['Docker', 'Kubernetes', 'AWS', 'Azure', 'Google Cloud', 'Terraform', 'CI/CD', 'GitHub Actions', 'Linux', 'Nginx'],
  'AI/ML': ['Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'scikit-learn', 'NLP', 'Computer Vision', 'Data Science', 'pandas', 'NumPy'],
  'DSA': ['Algorithms', 'Data Structures', 'Competitive Programming', 'DSA', 'Dynamic Programming'],
  'Tools': ['Git', 'GitHub', 'REST APIs', 'GraphQL', 'WebSockets', 'gRPC', 'Microservices', 'System Design'],
}

// ── Platform badge config ───────────────────────────────────────────────────
const PLATFORM_BADGE = {
  github:        { label: 'GH',   bg: 'bg-gray-600' },
  leetcode:      { label: 'LC',   bg: 'bg-yellow-600' },
  codeforces:    { label: 'CF',   bg: 'bg-blue-600' },
  stackoverflow: { label: 'SO',   bg: 'bg-orange-600' },
  kaggle:        { label: 'KG',   bg: 'bg-cyan-700' },
  devto:         { label: 'DEV',  bg: 'bg-purple-700' },
  npm:           { label: 'NPM',  bg: 'bg-red-700' },
  pypi:          { label: 'PyPI', bg: 'bg-green-700' },
  custom:        { label: 'URL',  bg: 'bg-slate-600' },
}

function platformBadge(src) {
  const key = src.toLowerCase()
  const cfg = PLATFORM_BADGE[key] || { label: src.slice(0, 3).toUpperCase(), bg: 'bg-gray-600' }
  return (
    <span
      key={src}
      className={`inline-block px-1 rounded text-[9px] font-bold text-white leading-tight ${cfg.bg}`}
    >
      {cfg.label}
    </span>
  )
}

// ── Custom radar tooltip ────────────────────────────────────────────────────
function RadarTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const { category, score, staleCount, totalCount } = payload[0].payload
  return (
    <div className="glass-strong rounded-lg px-3 py-2 text-sm shadow-lg">
      <p className="font-semibold text-white mb-1">{category}</p>
      <p className="text-purple-400">Score: {score}</p>
      <p className="text-gray-400">{totalCount} skill{totalCount !== 1 ? 's' : ''} matched</p>
      {staleCount > 0 && (
        <p className="text-yellow-400">⚠ {staleCount} stale skill{staleCount > 1 ? 's' : ''}</p>
      )}
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────────────
export default function SkillRadar({ skills }) {
  const [filter, setFilter] = useState('all') // 'all' | 'stale' | 'active'
  const [view, setView]     = useState('radar') // 'radar' | 'bars'

  // Build radar data with stale metadata per category
  const data = Object.entries(CATEGORIES).map(([category, categorySkills]) => {
    const matched = skills.filter(s => categorySkills.includes(s.name))
    const staleCount = matched.filter(s => s.is_stale).length
    const avgConfidence = matched.length > 0
      ? matched.reduce((sum, s) => sum + s.confidence, 0) / matched.length
      : 0
    return { category, score: Math.round(avgConfidence), staleCount, totalCount: matched.length }
  })

  const hasStale = data.some(d => d.staleCount > 0)
  // For bar view: category bars sorted by score
  const sortedData = [...data].filter(d => d.score > 0).sort((a, b) => b.score - a.score)

  // Custom axis tick — amber + ⚠ for categories containing stale skills
  const renderAxisTick = (props) => {
    const { payload, x, y, textAnchor } = props
    const d = data.find(item => item.category === payload.value)
    const isStale = d?.staleCount > 0
    return (
      <text x={x} y={y} textAnchor={textAnchor} fill={isStale ? '#FBBF24' : '#A78BFA'} fontSize={11} fontWeight={500}>
        {isStale ? `⚠ ${payload.value}` : payload.value}
      </text>
    )
  }

  // Skill list filtered by current toggle
  const filteredSkills = skills.filter(s => {
    if (filter === 'stale') return s.is_stale
    if (filter === 'active') return !s.is_stale
    return true
  })

  function barGradient(score) {
    if (score >= 70) return 'linear-gradient(90deg,#00e5ff,#2979ff)'
    if (score >= 40) return 'linear-gradient(90deg,#ff6ec7,#d500f9)'
    return 'linear-gradient(90deg,#ffd200,#ff6b00)'
  }
  function scoreCol(score) {
    if (score >= 70) return 'text-cyan-300'
    if (score >= 40) return 'text-pink-300'
    return 'text-yellow-300'
  }

  return (
    <div className="glass-md rounded-2xl p-6 space-y-5">

      {/* Top bar: legend + view toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full bg-purple-500 opacity-80" />
            Active skills
          </span>
          {hasStale && (
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-full bg-yellow-400" />
              Stale in category
            </span>
          )}
        </div>
        {/* Radar / Bars toggle */}
        <div className="flex gap-1 text-xs">
          {['radar', 'bars'].map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1 rounded-full capitalize transition-colors ${
                view === v ? 'bg-purple-600 text-white' : 'glass text-gray-400 hover:bg-white/[0.06]'
              }`}
            >
              {v === 'radar' ? '◎ Radar' : '▦ Bars'}
            </button>
          ))}
        </div>
      </div>

      {/* View panel */}
      <AnimatePresence mode="wait">
        {view === 'radar' ? (
          <motion.div key="radar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            {/* SVG defs for gradient fill */}
            <svg width={0} height={0} style={{ position: 'absolute' }}>
              <defs>
                <radialGradient id="radarFill" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.15" />
                </radialGradient>
              </defs>
            </svg>
            <ResponsiveContainer width="100%" height={400}>
              <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                <PolarGrid stroke="#4C1D95" strokeOpacity={0.4} />
                <PolarAngleAxis dataKey="category" tick={renderAxisTick} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#6B7280', fontSize: 9 }} axisLine={false} />
                <Radar
                  name="Skills"
                  dataKey="score"
                  stroke="#8B5CF6"
                  strokeWidth={2}
                  fill="url(#radarFill)"
                  fillOpacity={1}
                />
                <Tooltip content={<RadarTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          </motion.div>
        ) : (
          <motion.div key="bars" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="space-y-3 py-2">
            {sortedData.map((d, i) => (
              <div key={d.category}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-300">{d.category}</span>
                  <span className={`text-sm font-bold ${scoreCol(d.score)}`}>{d.score}%</span>
                </div>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: barGradient(d.score) }}
                    initial={{ width: 0 }}
                    animate={{ width: `${d.score}%` }}
                    transition={{ duration: 0.8, delay: i * 0.07, ease: 'easeOut' }}
                  />
                </div>
              </div>
            ))}
            {sortedData.length === 0 && (
              <p className="text-center text-gray-500 text-sm py-6">No category scores to display.</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Skill pills with source badges ─────────────────────────────────── */}
      <div className="pt-2 border-t border-white/5">
        {/* Filter toggle */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-300">
            All Skills <span className="text-gray-500 font-normal">({skills.length})</span>
          </h3>
          <div className="flex gap-1 text-xs">
            {['all', 'active', 'stale'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2.5 py-1 rounded-full capitalize transition-colors ${
                  filter === f
                    ? 'bg-purple-600 text-white'
                    : 'glass text-gray-400 hover:bg-white/[0.06]'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Category grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Object.entries(CATEGORIES).map(([category, categorySkills]) => {
            const matched = filteredSkills.filter(s => categorySkills.includes(s.name))
            if (matched.length === 0) return null
            return (
              <div key={category} className="glass rounded-xl p-3">
                <h4 className="text-[11px] font-semibold text-purple-300/70 uppercase tracking-wider mb-2">
                  {category}
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {matched.map(skill => (
                    <span
                      key={skill.name}
                      title={skill.is_stale ? `${skill.name} — stale (not used in 12+ months)` : `${skill.name} — confidence ${skill.confidence}`}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
                        skill.is_stale
                          ? 'bg-yellow-900/50 text-yellow-300 border-yellow-700/50'
                          : 'bg-purple-900/50 text-purple-200 border-purple-700/40'
                      }`}
                    >
                      {skill.is_stale && <span className="text-yellow-400 text-[10px]">⚠</span>}
                      {skill.name}
                      {(skill.sources || []).map(src => platformBadge(src))}
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {filteredSkills.length === 0 && (
          <p className="text-center text-gray-500 text-sm py-4">No skills match this filter.</p>
        )}
      </div>
    </div>
  )
}
