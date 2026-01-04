import React, { useEffect, useState } from 'react'
import api from '../api'
import LoginModal from './LoginModal'

export default function RequireAuth({ children }){
  const [loading, setLoading] = useState(true)
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    let mounted = true
    async function check(){
      try{
        await api.get('/auth/me')
        if(mounted) setAuthed(true)
      }catch(err){
        if(mounted) setAuthed(false)
      }finally{
        if(mounted) setLoading(false)
      }
    }
    check()
    return () => { mounted = false }
  },[])

  if(loading) return <div className="p-6">Checking authentication...</div>
  if(!authed) return <LoginModal onSuccess={() => window.location.reload()} />
  return children
}
