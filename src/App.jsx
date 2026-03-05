import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => { setSession(session) }
    )
    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: '#f4f5f7',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: 'linear-gradient(135deg, #0d9264, #0d9488)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', fontSize: 22, fontWeight: 700, color: '#fff',
            animation: 'pulse-logo 2s ease-in-out infinite',
          }}>M</div>
          <div style={{ color: '#8b939f', fontSize: 14 }}>Yükleniyor...</div>
        </div>
        <style>{`@keyframes pulse-logo { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.05);opacity:.8} }`}</style>
      </div>
    )
  }

  return session ? <Dashboard session={session} /> : <Login />
}
