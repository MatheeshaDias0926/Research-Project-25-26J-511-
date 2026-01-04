import React, { useState } from 'react'
import api from '../api'

export default function LoginModal({ onSuccess }){
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState(null)
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

  async function submit(e){
    e.preventDefault()
    setErr(null)
    try{
      const r = await api.post('/auth/login', { email, password })
      if(r.data && r.data.token){
        localStorage.setItem('token', r.data.token)
        if(onSuccess) onSuccess()
      }
    }catch(e){
      setErr(e.response?.data?.error || 'Login failed')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-2">Sign in</h3>
        <p className="text-sm text-gray-500 mb-4">Sign in to access the dashboard</p>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Email</label>
            <input value={email} onChange={e=>setEmail(e.target.value)} className="w-full border px-3 py-2 rounded" type="email" required />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Password</label>
            <input value={password} onChange={e=>setPassword(e.target.value)} className="w-full border px-3 py-2 rounded" type="password" required />
          </div>
          {err && <div className="text-sm text-red-600">{err}</div>}
          <div className="flex gap-2">
            <button className="flex-1 bg-blue-600 text-white px-4 py-2 rounded">Sign in</button>
            <button type="button" onClick={()=> window.location.href = `${apiUrl}/auth/google?redirect=${encodeURIComponent(window.location.origin)}`} className="flex-1 bg-white border px-4 py-2 rounded">Sign in with Google</button>
          </div>
        </form>
      </div>
    </div>
  )
}
