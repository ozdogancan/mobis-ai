import { LogOut, ChevronLeft, ChevronRight, Bot, X } from 'lucide-react'

export default function Sidebar({ collapsed, onToggle, onLogout, userEmail, mobileOpen, onMobileClose }) {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

  if (isMobile) {
    if (!mobileOpen) return null
    return (
      <>
        <div onClick={onMobileClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 40 }} />
        <div style={{
          position: 'fixed', left: 0, top: 0, bottom: 0, width: 260,
          background: 'var(--bg-surface)', borderRight: '1px solid var(--border-subtle)',
          zIndex: 50, display: 'flex', flexDirection: 'column',
          boxShadow: 'var(--shadow-lg)', animation: 'slideIn 0.2s ease-out',
        }}>
          <Content collapsed={false} onLogout={onLogout} userEmail={userEmail} showClose onClose={onMobileClose} />
        </div>
        <style>{`@keyframes slideIn { from{transform:translateX(-100%)} to{transform:translateX(0)} }`}</style>
      </>
    )
  }

  return (
    <div style={{
      width: collapsed ? 64 : 240, minWidth: collapsed ? 64 : 240,
      height: '100vh', background: 'var(--bg-surface)',
      borderRight: '1px solid var(--border-subtle)',
      display: 'flex', flexDirection: 'column',
      transition: 'width 0.25s ease, min-width 0.25s ease',
      position: 'relative', flexShrink: 0,
    }}>
      <Content collapsed={collapsed} onToggle={onToggle} onLogout={onLogout} userEmail={userEmail} />
    </div>
  )
}

function Content({ collapsed, onToggle, onLogout, userEmail, showClose, onClose }) {
  return (
    <>
      {/* Logo */}
      <div style={{
        padding: collapsed ? '18px 12px' : '16px 18px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: 'linear-gradient(135deg, #0d9264, #0d9488)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 15, fontWeight: 700, color: '#fff', flexShrink: 0,
          }}>M</div>
          {!collapsed && (
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>MOBİS NG</div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 1.2, textTransform: 'uppercase' }}>AI Platform</div>
            </div>
          )}
        </div>
        {showClose && (
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, display: 'flex' }}>
            <X size={20} />
          </button>
        )}
      </div>

      {/* Toggle desktop */}
      {onToggle && (
        <button onClick={onToggle} style={{
          position: 'absolute', right: -12, top: 28, width: 24, height: 24, borderRadius: '50%',
          background: 'var(--bg-card)', border: '1px solid var(--border-default)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: 'var(--text-muted)', zIndex: 10, boxShadow: 'var(--shadow-sm)',
        }}>
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      )}

      {/* Nav */}
      <div style={{ padding: '10px 8px' }}>
        <div style={{
          padding: collapsed ? '10px' : '9px 12px', borderRadius: 9,
          background: 'var(--accent-light)', border: '1px solid var(--accent-border)',
          display: 'flex', alignItems: 'center', gap: 10,
          justifyContent: collapsed ? 'center' : 'flex-start', position: 'relative',
        }}>
          <div style={{
            position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
            width: 3, height: 16, background: 'var(--accent)', borderRadius: '0 3px 3px 0',
          }} />
          <Bot size={18} color="var(--accent)" />
          {!collapsed && <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>Saha AI Asistan</span>}
        </div>
      </div>

      <div style={{ flex: 1 }} />

      {/* User */}
      <div style={{ padding: collapsed ? '12px' : '12px 14px', borderTop: '1px solid var(--border-subtle)' }}>
        {!collapsed && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userEmail}</div>
        )}
        <button onClick={onLogout} style={{
          width: '100%', padding: 8, background: 'transparent',
          border: '1px solid var(--border-subtle)', borderRadius: 7,
          color: 'var(--text-muted)', cursor: 'pointer', display: 'flex',
          alignItems: 'center', gap: 8, fontSize: 13, fontFamily: 'inherit',
          justifyContent: collapsed ? 'center' : 'flex-start',
        }}>
          <LogOut size={14} />
          {!collapsed && 'Çıkış'}
        </button>
      </div>
    </>
  )
}
