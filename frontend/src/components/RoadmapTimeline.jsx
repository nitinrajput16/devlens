import { useState } from 'react'

export default function RoadmapTimeline({ weeks }) {
  const [expanded, setExpanded] = useState({})

  const toggle = (week) => {
    setExpanded(prev => ({ ...prev, [week]: !prev[week] }))
  }

  return (
    <div className="space-y-4">
      {weeks.map((w) => (
        <div key={w.week} className="glass-md rounded-2xl border border-white/5">
          <button
            onClick={() => toggle(w.week)}
            className="w-full flex items-center justify-between p-5 text-left cursor-pointer"
          >
            <div>
              <span className="text-blue-400 font-bold mr-3">Week {w.week}</span>
              <span className="text-white font-semibold">{w.focus}</span>
            </div>
            <span className="text-gray-400">{expanded[w.week] ? '▲' : '▼'}</span>
          </button>

          {expanded[w.week] && (
            <div className="px-5 pb-5 space-y-3 border-t border-white/5 pt-4">
              <div>
                <h4 className="text-sm text-gray-400 mb-1">Daily commitment</h4>
                <p className="text-white">{w.daily_hours} hours/day</p>
              </div>
              <div>
                <h4 className="text-sm text-gray-400 mb-1">Tasks</h4>
                <ul className="list-disc list-inside text-gray-300 text-sm space-y-1">
                  {w.tasks.map((t, i) => <li key={i}>{t}</li>)}
                </ul>
              </div>
              <div>
                <h4 className="text-sm text-gray-400 mb-1">Resources</h4>
                <ul className="list-disc list-inside text-gray-300 text-sm space-y-1">
                  {w.resources.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
              {w.project_idea && (
                <div>
                  <h4 className="text-sm text-gray-400 mb-1">Project Idea</h4>
                  <p className="text-gray-300 text-sm">{w.project_idea}</p>
                </div>
              )}
              {w.milestone && (
                <div>
                  <h4 className="text-sm text-gray-400 mb-1">Milestone</h4>
                  <p className="text-green-400 text-sm font-medium">{w.milestone}</p>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
