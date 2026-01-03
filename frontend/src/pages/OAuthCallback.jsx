import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function OAuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    if (token) {
      localStorage.setItem('token', token)
      navigate('/dashboard')
    } else {
      // No token — go to login
      navigate('/login')
    }
  }, [])

  return <div style={{ padding: 24 }}>Processing login...</div>
}
