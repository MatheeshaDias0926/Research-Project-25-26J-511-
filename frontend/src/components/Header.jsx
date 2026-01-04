import React, { useState, useRef, useEffect } from 'react'
import api from '../api'
import { useNavigate } from 'react-router-dom'
import mannequin from '../assets/mannequin.svg'

export default function Header(){
  const [open, setOpen] = useState(false)
  const ref = useRef()
  const [me, setMe] = useState(null)
  const navigate = useNavigate()

  useEffect(()=>{
    function onDoc(e){ if(ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('click', onDoc)
    return () => document.removeEventListener('click', onDoc)
  },[])

  useEffect(() => {
    let mounted = true
    async function fetchMe(){
      try{
        const r = await api.get('/auth/me')
        if(mounted) setMe(r.data.user)
      }catch(err){/* not logged in */}
    }
    fetchMe()
    return ()=>{ mounted = false }
  },[])

  return (
    <header className="w-full bg-white shadow sticky top-0 z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <div className="hidden sm:block">
              <div className="text-lg font-semibold text-gray-800">Edge Driver Monitor</div>
            </div>
            <div className="relative w-full max-w-md">
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300" placeholder="Search drivers, buses, devices..." />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">⌘K</div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <button className="relative p-2 rounded-md hover:bg-gray-100">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-500 rounded-full">3</span>
              </button>
            </div>

            <div className="relative" ref={ref}>
              <button onClick={()=>setOpen(v=>!v)} className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-gray-50">
                <img src={me?.avatar || mannequin} alt="avatar" className="w-8 h-8 rounded-full object-cover" />
                <div className="hidden sm:block text-sm text-gray-700">{me?.name || 'User'}</div>
              </button>

              {open && (
                <div className="absolute right-0 mt-2 w-44 bg-white border rounded-lg shadow-lg overflow-hidden">
                  <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">Profile</button>
                  <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">Settings</button>
                  <div className="border-t" />
                  <button onClick={() => { localStorage.removeItem('token'); navigate('/login') }} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50">Logout</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
