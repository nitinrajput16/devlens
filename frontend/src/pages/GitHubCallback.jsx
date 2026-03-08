import { useEffect } from 'react'

export default function GitHubCallback() {
  useEffect(() => {
    // GitHub redirects back with ?code=... in the URL
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    if (code && window.opener) {
      window.opener.postMessage({ type: 'github-auth', code }, window.location.origin)
    }
    setTimeout(() => window.close(), 500)
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400 text-sm">Signing in with GitHub…</p>
    </div>
  )
}
