export default function ReadinessGauge({ score, assessment }) {
  const circumference = 2 * Math.PI * 70
  const offset = circumference - (score / 100) * circumference

  const color = score >= 70 ? '#22C55E' : score >= 40 ? '#EAB308' : '#EF4444'

  return (
    <div className="glass-md rounded-2xl p-6 flex flex-col items-center">
      <svg width="180" height="180" className="mb-4">
        {/* Background circle */}
        <circle cx="90" cy="90" r="70" fill="none" stroke="#374151" strokeWidth="12" />
        {/* Score arc */}
        <circle
          cx="90" cy="90" r="70"
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 90 90)"
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
        <text x="90" y="85" textAnchor="middle" fill="white" fontSize="36" fontWeight="bold">
          {score}
        </text>
        <text x="90" y="110" textAnchor="middle" fill="#9CA3AF" fontSize="14">
          / 100
        </text>
      </svg>
      {assessment && (
        <p className="text-gray-400 text-center text-sm max-w-md">{assessment}</p>
      )}
    </div>
  )
}
