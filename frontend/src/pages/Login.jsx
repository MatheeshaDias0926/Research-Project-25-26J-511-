import React from 'react'

export default function Login() {
  const loginWithGoogle = () => {
    // Redirect to backend which will start OAuth flow and then redirect back to frontend
    const redirect = window.location.origin
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'
    window.location.href = `${apiUrl}/auth/google?redirect=${encodeURIComponent(redirect)}`
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>Login</h2>
      <button onClick={loginWithGoogle}>Sign in with Google</button>
      <p>After login you'll be redirected back to the app.</p>
    </div>
  )
}
