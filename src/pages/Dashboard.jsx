import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Sidebar from '../components/Sidebar'
import Home from './Home'
import PmAktif from './PmAktif'
import { Menu } from 'lucide-react'

export default function Dashboard({ session }) {
  const [activeModule, setActiveModule] = useState('home')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [initialQuery, setInitialQuery] = useState('')
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const handleLogout = async () => { await supabase.auth.signOut() }

  const handleStartChat = (query) => {
    setInitialQuery(query)
    setActiveModule('pmaktif')
  }

  const handleBack = () => {
    setActiveModule('home')
    setInitialQuery('')
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-base)', overflow: 'hidden' }}>
      {!isMobile && (
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} onLogout={handleLogout} userEmail={session.user.email} />
      )}
      {isMobile && (
        <Sidebar mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} onLogout={handleLogout} userEmail={session.user.email} />
      )}

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        {isMobile && activeModule === 'home' && (
          <div style={{
            padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)',
            display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg-surface)',
          }}>
            <button onClick={() => setMobileMenuOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', padding: 4 }}>
              <Menu size={22} />
            </button>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'linear-gradient(135deg, #0d9264, #0d9488)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, color: '#fff',
            }}>M</div>
            <span style={{ fontSize: 14, fontWeight: 600 }}>MOBİS NG</span>
          </div>
        )}

        {activeModule === 'home' && <Home onStartChat={handleStartChat} userEmail={session.user.email} isMobile={isMobile} />}
        {activeModule === 'pmaktif' && (
          <PmAktif initialQuery={initialQuery} onBack={handleBack} isMobile={isMobile} onMenuOpen={() => setMobileMenuOpen(true)} />
        )}
      </main>
    </div>
  )
}
