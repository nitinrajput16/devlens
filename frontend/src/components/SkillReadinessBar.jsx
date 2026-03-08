import { motion } from 'framer-motion'
import { BarChart2 } from 'lucide-react'

// Gradient colours matching the screenshot tiers
function barGradient(score) {
  if (score >= 70) return 'linear-gradient(90deg, #00e5ff 0%, #2979ff 100%)'
  if (score >= 40) return 'linear-gradient(90deg, #ff6ec7 0%, #d500f9 100%)'
  return 'linear-gradient(90deg, #ffd200 0%, #ff6b00 100%)'
}

function scoreColor(score) {
  if (score >= 70) return 'text-cyan-300'
  if (score >= 40) return 'text-pink-300'
  return 'text-yellow-300'
}

export default function SkillReadinessBar({ skills }) {
  const top = [...skills]
    .filter(s => s.confidence > 0)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 10)

  if (!top.length) return null

  return (
    <div className="glass-md rounded-2xl p-5 h-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-purple-600/30 flex items-center justify-center shrink-0">
          <BarChart2 size={18} className="text-purple-300" />
        </div>
        <h3 className="font-semibold text-white text-sm">Skill Readiness Score</h3>
      </div>

      {/* Bars */}
      <div className="space-y-3">
        {top.map((skill, i) => (
          <div key={skill.name}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-300 truncate pr-2">{skill.name}</span>
              <span className={`text-sm font-bold shrink-0 ${scoreColor(skill.confidence)}`}>
                {skill.confidence}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-white/5 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: barGradient(skill.confidence) }}
                initial={{ width: 0 }}
                whileInView={{ width: `${skill.confidence}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.9, delay: i * 0.06, ease: 'easeOut' }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-5 pt-4 border-t border-white/5 text-[11px] text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-1.5 rounded-full bg-cyan-400 inline-block" />Strong ≥70
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-1.5 rounded-full bg-pink-400 inline-block" />Growing 40–69
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-1.5 rounded-full bg-yellow-400 inline-block" />Early &lt;40
        </span>
      </div>
    </div>
  )
}
