import { useEffect } from 'react'

export default function GoogleCallback() {
  useEffect(() => {
    // Google implicit flow puts the id_token in the URL hash fragment
    const params = new URLSearchParams(window.location.hash.substring(1))
    const idToken = params.get('id_token')
    if (idToken && window.opener) {
      window.opener.postMessage({ type: 'google-auth', id_token: idToken }, window.location.origin)
    }
    // Close if postMessage didn't trigger close from the opener
    setTimeout(() => window.close(), 500)
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400 text-sm">Signing in with Google…</p>
    </div>
  )
}
