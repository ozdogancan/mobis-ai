import { BarChart3, ShoppingCart, LogOut, ChevronLeft, ChevronRight, LayoutDashboard, Route, Users, Settings } from 'lucide-react'

const modules = [
  { id: 'home', label: 'Ana Sayfa', icon: LayoutDashboard, enabled: true },
  { id: 'pmaktif', label: 'PM Aktif', icon: ShoppingCart, enabled: true },
  { id: 'saha', label: 'Saha Takip', icon: Users, enabled: false },
  { id: 'rut', label: 'Rut Analiz', icon: Route, enabled: false },
  { id: 'bayi', label: 'Bayi Performans', icon: BarChart3, enabled: false },
]

export default function Sidebar({ activeModule, onModuleChange, collapsed, onToggle, onLogout, userEmail }) {
  return (
    <div style={{
      width: collapsed ? 64 : 220,
      minHeight: '100vh',
      background: 'var(--bg-surface)',
      borderRight: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.2s ease',
      position: 'relative',
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{
        padding: collapsed ? '20px 12px' : '20px 18px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <div style={{
          width: 34, height: 34, borderRadius: 10,
          background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 15, fontWeight: 700, color: '#fff', flexShrink: 0,
        }}>M</div>
        {!collapsed && (
          <div>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
              Mobis AI
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 1 }}>
              Yönetici Kokpiti
            </div>
          </div>
        )}
      </div>

      {/* Toggle */}
      <button
        onClick={onToggle}
        style={{
          position: 'absolute', right: -12, top: 28,
          width: 24, height: 24, borderRadius: '50%',
          background: 'var(--bg-card)', border: '1px solid var(--border-default)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: 'var(--text-muted)', zIndex: 10,
        }}
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>

      {/* Modules */}
      <nav style={{ flex: 1, padding: '12px 8px' }}>
        {modules.map(mod => {
          const Icon = mod.icon
          const isActive = activeModule === mod.id
          return (
            <button
              key={mod.id}
              onClick={() => mod.enabled && onModuleChange(mod.id)}
              disabled={!mod.enabled}
              style={{
                width: '100%',
                padding: collapsed ? '10px' : '9px 12px',
                marginBottom: 2,
                borderRadius: 8,
                border: 'none',
                background: isActive ? 'var(--accent-muted)' : 'transparent',
                color: !mod.enabled ? 'var(--text-muted)' : isActive ? 'var(--accent)' : 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                cursor: mod.enabled ? 'pointer' : 'default',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '0.85rem',
                fontWeight: isActive ? 500 : 400,
                transition: 'all 0.15s ease',
                justifyContent: collapsed ? 'center' : 'flex-start',
                opacity: mod.enabled ? 1 : 0.4,
              }}
            >
              <Icon size={18} />
              {!collapsed && (
                <>
                  <span>{mod.label}</span>
                  {!mod.enabled && (
                    <span style={{
                      marginLeft: 'auto', fontSize: '0.6rem',
                      background: 'var(--border-subtle)', padding: '2px 6px',
                      borderRadius: 4, color: 'var(--text-muted)',
                    }}>Yakında</span>
                  )}
                </>
              )}
            </button>
          )
        })}
      </nav>

      {/* User / Logout */}
      <div style={{
        padding: collapsed ? '12px' : '12px 14px',
        borderTop: '1px solid var(--border-subtle)',
      }}>
        {!collapsed && (
          <div style={{
            fontSize: '0.72rem', color: 'var(--text-muted)',
            marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {userEmail}
          </div>
        )}
        <button
          onClick={onLogout}
          style={{
            width: '100%', padding: '8px',
            background: 'transparent', border: '1px solid var(--border-subtle)',
            borderRadius: 7, color: 'var(--text-muted)',
            cursor: 'pointer', display: 'flex', alignItems: 'center',
            gap: 8, fontSize: '0.8rem', fontFamily: 'DM Sans, sans-serif',
            justifyContent: collapsed ? 'center' : 'flex-start',
          }}
        >
          <LogOut size={14} />
          {!collapsed && 'Çıkış'}
        </button>
      </div>
    </div>
  )
}
