import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Eye, Cpu, Map, Users, BarChart3, TrendingUp, Sparkles, Hexagon, Github, Twitter, Linkedin } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import AuthModal from '../components/AuthModal'

// ── Fade-up wrapper ──────────────────────────────────────────────────────────
function FadeUp({ children, delay = 0, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.7, delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ── Mini Skill Radar (SVG polygon) ───────────────────────────────────────────
function MiniRadar() {
  const skills = [
    { label: 'React', value: 0.85 },
    { label: 'Python', value: 0.72 },
    { label: 'SQL', value: 0.60 },
    { label: 'Node', value: 0.78 },
    { label: 'Docker', value: 0.50 },
    { label: 'ML', value: 0.65 },
  ]
  const cx = 70, cy = 70, r = 52
  const n = skills.length
  const angleStep = (2 * Math.PI) / n
  const toXY = (i, frac) => {
    const a = i * angleStep - Math.PI / 2
    return [cx + frac * r * Math.cos(a), cy + frac * r * Math.sin(a)]
  }
  const outerPoints = skills.map((_, i) => toXY(i, 1).join(',')).join(' ')  // used for grid ring at frac=1
  const dataPoints = skills.map((s, i) => toXY(i, s.value).join(',')).join(' ')
  return (
    <svg viewBox="0 0 140 140" className="w-full h-full">
      {/* Grid rings */}
      {[0.33, 0.66, 1].map(frac => (
        <polygon
          key={frac}
          points={skills.map((_, i) => toXY(i, frac).join(',')).join(' ')}
          fill="none"
          stroke="rgba(139,92,246,0.15)"
          strokeWidth="1"
        />
      ))}
      {/* Spokes */}
      {skills.map((_, i) => {
        const [x, y] = toXY(i, 1)
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(139,92,246,0.2)" strokeWidth="1" />
      })}
      {/* Data polygon */}
      <motion.polygon
        points={dataPoints}
        fill="rgba(139,92,246,0.25)"
        stroke="#a78bfa"
        strokeWidth="1.5"
        initial={{ opacity: 0, scale: 0.4 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, delay: 0.3 }}
        style={{ transformOrigin: `${cx}px ${cy}px` }}
      />
      {/* Dots */}
      {skills.map((s, i) => {
        const [x, y] = toXY(i, s.value)
        return <circle key={i} cx={x} cy={y} r="2.5" fill="#c084fc" />
      })}
      {/* Labels */}
      {skills.map((s, i) => {
        const [x, y] = toXY(i, 1.22)
        return (
          <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
            fontSize="8" fill="#9ca3af">{s.label}</text>
        )
      })}
    </svg>
  )
}

// ── Mini Readiness Gauge (arc) ───────────────────────────────────────────────
function MiniGauge() {
  const score = 74
  const r = 42, cx = 70, cy = 72
  const startAngle = -200, endAngle = 20   // degrees
  const toRad = d => (d * Math.PI) / 180
  const arcPath = (from, to) => {
    const x1 = cx + r * Math.cos(toRad(from))
    const y1 = cy + r * Math.sin(toRad(from))
    const x2 = cx + r * Math.cos(toRad(to))
    const y2 = cy + r * Math.sin(toRad(to))
    const large = to - from > 180 ? 1 : 0
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`
  }
  const totalDeg = endAngle - startAngle          // 220°
  const filledDeg = (score / 100) * totalDeg
  return (
    <svg viewBox="0 0 140 100" className="w-full h-full">
      {/* Track */}
      <path d={arcPath(startAngle, endAngle)} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" strokeLinecap="round" />
      {/* Fill */}
      <motion.path
        d={arcPath(startAngle, startAngle + filledDeg)}
        fill="none"
        stroke="url(#gaugeGrad)"
        strokeWidth="8"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.2, delay: 0.2, ease: 'easeOut' }}
      />
      <defs>
        <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#a78bfa" />
        </linearGradient>
      </defs>
      {/* Score text */}
      <text x={cx} y={cy - 2} textAnchor="middle" fontSize="18" fontWeight="700" fill="#e2e8f0">{score}</text>
      <text x={cx} y={cy + 13} textAnchor="middle" fontSize="8" fill="#9ca3af">/ 100</text>
    </svg>
  )
}

// ── Mini Gap Bars ─────────────────────────────────────────────────────────────
function MiniGapBars() {
  const bars = [
    { label: 'Kubernetes', pct: 82, color: '#ef4444' },
    { label: 'TypeScript', pct: 55, color: '#f97316' },
    { label: 'FastAPI',    pct: 38, color: '#eab308' },
    { label: 'GraphQL',   pct: 20, color: '#22c55e' },
  ]
  return (
    <svg viewBox="0 0 140 100" className="w-full h-full">
      {bars.map((b, i) => {
        const y = 10 + i * 22
        const maxW = 80
        return (
          <g key={b.label}>
            <text x="0" y={y + 7} fontSize="7.5" fill="#9ca3af">{b.label}</text>
            {/* Track */}
            <rect x="55" y={y} width={maxW} height="9" rx="4" fill="rgba(255,255,255,0.05)" />
            {/* Bar */}
            <motion.rect
              x="55" y={y}
              width={0}
              height="9"
              rx="4"
              fill={b.color}
              fillOpacity="0.75"
              initial={{ width: 0 }}
              whileInView={{ width: (b.pct / 100) * maxW }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, delay: 0.15 * i, ease: 'easeOut' }}
            />
            {/* Pct label */}
            <text x="139" y={y + 7} fontSize="7" fill="#6b7280" textAnchor="end">{b.pct}%</text>
          </g>
        )
      })}
    </svg>
  )
}

// ── Floating geometric shapes (decorative) ──────────────────────────────────
function FloatingShapes() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Purple orb top-right */}
      <div className="glow-orb glow-purple -top-48 -right-48 animate-float" />
      {/* Blue orb left */}
      <div className="glow-orb glow-blue -bottom-32 -left-32" style={{ animationDelay: '2s', animation: 'float 8s ease-in-out infinite' }} />
      {/* Pink orb center-right */}
      <div className="glow-orb glow-pink top-1/3 right-1/4" style={{ animationDelay: '4s', animation: 'float 10s ease-in-out infinite' }} />

      {/* Wireframe shapes */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 50, ease: 'linear' }}
        className="absolute -top-16 right-[10%] w-72 h-72 border border-purple-500/10 rounded-full"
      />
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ repeat: Infinity, duration: 70, ease: 'linear' }}
        className="absolute top-[20%] right-[5%] w-96 h-96 border border-blue-500/8 rounded-full"
      />
    </div>
  )
}

// ── Fake radar preview for hero ──────────────────────────────────────────────
function RadarPreview() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1, delay: 0.5 }}
      className="relative"
    >
      <div className="glass-strong rounded-2xl p-6 w-[340px] h-[300px] flex flex-col items-center justify-center">
        <p className="text-xs text-gray-400 mb-3 tracking-wider uppercase">Competency Map</p>
        {/* Faux radar as nested circles + axis lines */}
        <div className="relative w-48 h-48">
          {[48, 36, 24, 12].map(r => (
            <div key={r} className="absolute border border-purple-500/15 rounded-full"
              style={{ width: `${r * 4}px`, height: `${r * 4}px`, top: `${96 - r * 2}px`, left: `${96 - r * 2}px` }}
            />
          ))}
          {/* Filled radar shape */}
          <svg viewBox="0 0 192 192" className="absolute inset-0 w-48 h-48">
            <polygon
              points="96,20 160,60 150,140 96,172 40,140 30,60"
              fill="rgba(139,92,246,.22)" stroke="rgba(139,92,246,.6)" strokeWidth="1.5"
            />
            {/* Dots */}
            {[[96,20],[160,60],[150,140],[96,172],[40,140],[30,60]].map(([cx,cy],i) => (
              <circle key={i} cx={cx} cy={cy} r="3" fill="#a78bfa" />
            ))}
          </svg>
          {/* Labels */}
          {['Frontend','Backend','DevOps','AI/ML','DSA','Tools'].map((l,i) => {
            const angle = (i * 60 - 90) * Math.PI / 180
            const x = 96 + 108 * Math.cos(angle)
            const y = 96 + 108 * Math.sin(angle)
            return <span key={l} className="absolute text-[9px] text-gray-400 whitespace-nowrap"
              style={{ left: `${x}px`, top: `${y}px`, transform: 'translate(-50%,-50%)' }}>{l}</span>
          })}
        </div>
      </div>
      {/* Floating sub-cards */}
      <motion.div animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 4 }}
        className="absolute -bottom-6 -left-8 glass rounded-xl px-4 py-2 text-xs">
        <span className="text-gray-400">Gauge</span> <span className="text-purple-400 font-bold ml-1">87</span>
      </motion.div>
      <motion.div animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 5, delay: 1 }}
        className="absolute -bottom-4 -right-10 glass rounded-xl px-4 py-2 text-xs">
        <span className="text-gray-400">Q&A %</span> <span className="text-blue-400 font-bold ml-1">94.4%</span>
      </motion.div>
    </motion.div>
  )
}

// ── Feature card ─────────────────────────────────────────────────────────────
function FeatureCard({ icon: Icon, title, description, delay }) {
  return (
    <FadeUp delay={delay}>
      <div className="glass rounded-2xl p-6 hover:bg-white/[0.06] transition group h-full">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition">
          <Icon size={22} className="text-purple-400" />
        </div>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-gray-400 leading-relaxed">{description}</p>
      </div>
    </FadeUp>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Landing Page ──────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
export default function Landing() {
  const { user } = useAuth()
  const [authOpen, setAuthOpen] = useState(false)

  return (
    <>
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center overflow-hidden pt-20">
        <FloatingShapes />

        <div className="relative z-10 max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
          {/* Left copy */}
          <div>
            <FadeUp>
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs text-purple-300 font-medium mb-6">
                <Sparkles size={14} /> AI-Powered Career Intelligence
              </span>
            </FadeUp>

            <FadeUp delay={0.1}>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
                Bridge your<br />engineering<br />gap with{' '}
                <span className="text-gradient">DevLens</span>
              </h1>
            </FadeUp>

            <FadeUp delay={0.2}>
              <p className="text-gray-400 text-lg max-w-md mb-8 leading-relaxed">
                Identify your skill gaps, align with global market trends, and
                accelerate your engineering career into exponential trajectory, all from
                your public profiles.
              </p>
            </FadeUp>

            <FadeUp delay={0.3}>
              <div className="flex flex-wrap gap-4">
                {user ? (
                  <Link
                    to="/dashboard"
                    className="flex items-center gap-2 px-7 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 font-semibold hover:opacity-90 transition btn-shimmer"
                  >
                    Start Analysis <ArrowRight size={18} />
                  </Link>
                ) : (
                  <button
                    onClick={() => setAuthOpen(true)}
                    className="flex items-center gap-2 px-7 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 font-semibold hover:opacity-90 transition btn-shimmer"
                  >
                    Start Free Analysis <ArrowRight size={18} />
                  </button>
                )}
                <a href="#features" className="flex items-center gap-2 px-7 py-3 rounded-xl glass font-medium text-gray-300 hover:text-white hover:bg-white/[0.06] transition">
                  <Eye size={18} /> View Sample Report
                </a>
              </div>
            </FadeUp>
          </div>

          {/* Right — Radar preview */}
          <div className="hidden lg:flex justify-center">
            <RadarPreview />
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────────── */}
      <section id="features" className="relative py-28 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <FadeUp>
            <h2 className="text-3xl sm:text-4xl font-bold text-center mb-3">
              Engineered for <span className="text-gradient">Exponential Growth</span>
            </h2>
          </FadeUp>
          <FadeUp delay={0.1}>
            <p className="text-gray-400 text-center max-w-xl mx-auto mb-16">
              Our platform provides data-driven insights to accurately reveal the
              gaps between where you are and where you want to be.
            </p>
          </FadeUp>

          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard icon={Map} title="Personalised Roadmap" delay={0.1}
              description="Step-by-step 4-week guided plan tailored to your gaps, with curated resources, daily tasks, and milestone targets." />
            <FeatureCard icon={Users} title="Team Skill Mapping" delay={0.2}
              description="Visualize team competencies in a comprehensive unified dashboard to identify collective strengths and blind spots." />
            <FeatureCard icon={TrendingUp} title="Market Trend Alignment" delay={0.3}
              description="Real-time data from developer job listings, aligning your profile with the skills employers actually demand." />
          </div>
        </div>
      </section>

      {/* ── Who it's for ──────────────────────────────────────────────────── */}
      <section className="relative py-28 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-14 items-center">
          {/* Left — decorative glass cards */}
          <FadeUp>
            <div className="glass-md rounded-2xl p-8 relative overflow-hidden">
              <div className="glow-orb glow-purple w-60 h-60 -top-20 -left-20 opacity-25" />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                    <BarChart3 size={18} />
                  </div>
                  <span className="text-sm font-medium text-gray-300">Skill Readiness Score</span>
                </div>
                {/* Progress bars */}
                {[
                  { label: 'React', w: '92%', color: 'from-blue-500 to-cyan-400' },
                  { label: 'System Design', w: '64%', color: 'from-purple-500 to-pink-500' },
                  { label: 'CI/CD', w: '45%', color: 'from-orange-500 to-yellow-500' },
                ].map(bar => (
                  <div key={bar.label} className="mb-3">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>{bar.label}</span><span>{bar.w}</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/5">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: bar.w }}
                        transition={{ duration: 1, delay: 0.3 }}
                        viewport={{ once: true }}
                        className={`h-full rounded-full bg-gradient-to-r ${bar.color}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </FadeUp>

          {/* Right copy */}
          <div>
            <FadeUp>
              <h2 className="text-3xl sm:text-4xl font-bold mb-6 leading-tight">
                Empowering Individual Devs{' '}
                <span className="text-gradient">and Management Alike</span>
              </h2>
            </FadeUp>

            <FadeUp delay={0.15}>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-8 h-8 shrink-0 rounded-lg bg-purple-500/15 flex items-center justify-center mt-1">
                    <Cpu size={16} className="text-purple-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">For Developers</h4>
                    <p className="text-sm text-gray-400">Find blind spots, close gaps quickly, create a balanced skill set, and maximize your value to employers.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 shrink-0 rounded-lg bg-blue-500/15 flex items-center justify-center mt-1">
                    <Users size={16} className="text-blue-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">For Managers</h4>
                    <p className="text-sm text-gray-400">Audit team capabilities, identify hiring gaps, and strategically design skill-building programs with objective evidence.</p>
                  </div>
                </div>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ── Visualize your potential ──────────────────────────────────────── */}
      <section id="visualize" className="relative py-28 overflow-hidden">
        <div className="glow-orb glow-blue w-[700px] h-[700px] top-0 left-1/2 -translate-x-1/2 opacity-10" />
        <div className="max-w-7xl mx-auto px-6 text-center relative z-10">
          <FadeUp>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Visualize Your <span className="text-gradient">Potential</span>
            </h2>
          </FadeUp>
          <FadeUp delay={0.1}>
            <p className="text-gray-400 max-w-xl mx-auto mb-14">
              Interact with our dynamic charts, explore your career data,
              and uncover paths to become the developer you aspire to be.
            </p>
          </FadeUp>

          <FadeUp delay={0.2}>
            <div className="glass-md rounded-2xl p-6 md:p-10 max-w-4xl mx-auto overflow-hidden">
              {/* Live mini-charts */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                {/* Skill Radar */}
                <div className="glass rounded-xl p-3 text-center">
                  <div className="w-full h-32">
                    <MiniRadar />
                  </div>
                  <span className="text-xs text-gray-400 mt-1 block">Skill Radar</span>
                </div>
                {/* Readiness Gauge */}
                <div className="glass rounded-xl p-3 text-center">
                  <div className="w-full h-32">
                    <MiniGauge />
                  </div>
                  <span className="text-xs text-gray-400 mt-1 block">Readiness Score</span>
                </div>
                {/* Gap Map bars */}
                <div className="glass rounded-xl p-3 text-center">
                  <div className="w-full h-32">
                    <MiniGapBars />
                  </div>
                  <span className="text-xs text-gray-400 mt-1 block">Gap Map</span>
                </div>
              </div>
              <div className="flex items-center gap-4 justify-center text-xs text-gray-500">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-500" /> Live Data</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500" /> Market Benchmarks</span>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section className="relative py-28 overflow-hidden">
        <div className="glow-orb glow-pink w-[500px] h-[500px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-15" />
        <div className="max-w-3xl mx-auto px-6 text-center relative z-10">
          <FadeUp>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Ready to lens your <span className="text-gradient">potential</span>?
            </h2>
          </FadeUp>
          <FadeUp delay={0.1}>
            <p className="text-gray-400 mb-8 max-w-md mx-auto">
              Join the next wave of elite engineers. Today, assess where you
              are. Tomorrow, be 4x further than you thought possible.
            </p>
          </FadeUp>
          <FadeUp delay={0.2}>
            <div className="glass-md rounded-2xl p-8 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email address"
                className="w-full glass-input rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 mb-4"
              />
              <button
                onClick={() => setAuthOpen(true)}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 font-semibold hover:opacity-90 transition btn-shimmer"
              >
                Join Free
              </button>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <Hexagon size={18} className="text-purple-500" />
            <span className="text-gradient font-semibold">DevLens</span>
          </div>
          <p>&copy; {new Date().getFullYear()} DevLens. All rights reserved.</p>
          <div className="flex gap-4">
            <Github size={16} className="hover:text-white cursor-pointer transition" />
            <Twitter size={16} className="hover:text-white cursor-pointer transition" />
            <Linkedin size={16} className="hover:text-white cursor-pointer transition" />
          </div>
        </div>
      </footer>

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  )
}
