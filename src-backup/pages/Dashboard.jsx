import { useState } from 'react'
import { supabase } from '../lib/supabase'
import Sidebar from '../components/Sidebar'
import Home from './Home'
import PmAktif from './PmAktif'

export default function Dashboard({ session }) {
  const [activeModule, setActiveModule] = useState('home')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const renderModule = () => {
    switch (activeModule) {
      case 'pmaktif': return <PmAktif />
      case 'home':
      default: return <Home onModuleChange={setActiveModule} />
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-base)' }}>
      <Sidebar
        activeModule={activeModule}
        onModuleChange={setActiveModule}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        onLogout={handleLogout}
        userEmail={session.user.email}
      />

      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        overflow: 'hidden',
      }}>
        {renderModule()}
      </main>
    </div>
  )
}
