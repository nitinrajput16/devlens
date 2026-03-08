export default function JobCards({ jobs }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {jobs.map((job, i) => (
        <div key={i} className="glass-md rounded-2xl p-5 border border-white/5 hover:border-purple-500/40 transition">
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-lg font-semibold text-white">{job.title}</h3>
            <span className="text-blue-400 font-bold text-sm whitespace-nowrap ml-2">
              {job.match_score}%
            </span>
          </div>
          {job.company && <p className="text-gray-400 text-sm mb-1">{job.company}</p>}
          {job.location && <p className="text-gray-500 text-sm mb-3">{job.location}</p>}
          <p className="text-gray-400 text-xs mb-4">{job.explanation}</p>
          {job.apply_url && (
            <a
              href={job.apply_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-gradient-to-r from-blue-500 to-purple-600 hover:opacity-90 text-white text-sm px-4 py-2 rounded-xl transition btn-shimmer"
            >
              Apply →
            </a>
          )}
        </div>
      ))}
    </div>
  )
}
