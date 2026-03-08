export default function GapHeatmap({ gapReport, profileSkills = [] }) {
  const { skills_present = [], stale_skills = [] } = gapReport

  // Build a set of ALL known skill names from the full profile + skills_present
  const knownLower = new Set([
    ...skills_present.map(s => s.trim().toLowerCase()),
    ...profileSkills.map(s => (s.name || s).trim().toLowerCase()),
  ])
  // Safety net: never show a skill as missing if the developer already has it
  const skills_missing = (gapReport.skills_missing || []).filter(s => {
    const low = s.trim().toLowerCase()
    if (knownLower.has(low)) return false
    // Check suffix variants: "Express.js" ↔ "Express", "REST APIs" ↔ "REST"
    const bare = low.replace(/\.js$/i, '').replace(/ apis?$/i, '')
    if (knownLower.has(bare)) return false
    // Check if any known skill contains or is contained in this candidate
    for (const k of knownLower) {
      if (k.length >= 3 && (k.includes(low) || low.includes(k))) return false
    }
    return true
  })

  return (
    <div className="glass-md rounded-2xl p-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Present Skills */}
        <div>
          <h3 className="text-green-400 font-semibold mb-3">Skills You Have</h3>
          <div className="flex flex-wrap gap-2">
            {skills_present.map((s, i) => (
              <span key={i} className="bg-green-900/50 text-green-300 px-3 py-1 rounded-full text-sm">{s}</span>
            ))}
            {skills_present.length === 0 && <span className="text-gray-500 text-sm">None detected</span>}
          </div>
        </div>

        {/* Missing Skills */}
        <div>
          <h3 className="text-red-400 font-semibold mb-3">Skills Missing</h3>
          <div className="flex flex-wrap gap-2">
            {skills_missing.map((s, i) => (
              <span key={i} className="bg-red-900/50 text-red-300 px-3 py-1 rounded-full text-sm">{s}</span>
            ))}
            {skills_missing.length === 0 && <span className="text-gray-500 text-sm">None — great job!</span>}
          </div>
        </div>

        {/* Stale Skills */}
        <div>
          <h3 className="text-yellow-400 font-semibold mb-3">Stale Skills</h3>
          <div className="flex flex-wrap gap-2">
            {stale_skills.map((s, i) => (
              <span key={i} className="bg-yellow-900/50 text-yellow-300 px-3 py-1 rounded-full text-sm">{s}</span>
            ))}
            {stale_skills.length === 0 && <span className="text-gray-500 text-sm">None stale</span>}
          </div>
        </div>
      </div>
    </div>
  )
}
