import { useState, useEffect } from 'react'
import { ShoppingCart, Route, Users, TrendingUp, ArrowRight } from 'lucide-react'

const SMART_MESSAGES = [
  { id: 'pm-aktif', label: 'PM Aktif Raporu', desc: 'Sipariş ve ciro analizi', icon: ShoppingCart, active: true, prompt: 'PM Aktif sipariş verilerini analiz et ve genel raporu göster', color: '#0d9264', gradient: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)' },
  { id: 'saha-takip', label: 'Saha Takip', desc: 'Yakında', icon: Users, active: false, prompt: '', color: '#6366f1', gradient: '' },
  { id: 'rut-analiz', label: 'Rut Performansı', desc: 'Yakında', icon: Route, active: false, prompt: '', color: '#0891b2', gradient: '' },
  { id: 'satis-trend', label: 'Satış Trendi', desc: 'Yakında', icon: TrendingUp, active: false, prompt: '', color: '#d97706', gradient: '' },
]

export default function Home({ onStartChat, userEmail, isMobile }) {
  const [input, setInput] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const userName = userEmail?.split('@')[0] || 'Kullanıcı'
  const displayName = userName.charAt(0).toUpperCase() + userName.slice(1)

  const handleSmartClick = (sm) => {
    if (!sm.active) return
    setInput(sm.prompt)
  }

  const handleSend = () => {
    if (!input.trim()) return
    onStartChat(input)
    setInput('')
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Günaydın' : hour < 18 ? 'İyi günler' : 'İyi akşamlar'

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center',
      justifyContent: isMobile ? 'flex-end' : 'center',
      padding: isMobile ? '20px 20px 28px' : '32px 24px',
      overflow: 'auto',
      background: 'linear-gradient(180deg, #f4f5f7 0%, #eef0f4 50%, #f4f5f7 100%)',
      position: 'relative',
    }}>

      {/* Subtle background pattern */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(0,0,0,0.015) 1px, transparent 0)',
        backgroundSize: '32px 32px',
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 480, width: '100%' }}>

        {/* AI Avatar with breathing glow */}
        <div style={{
          textAlign: 'center',
          marginBottom: isMobile ? 20 : 28,
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(12px)',
          transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: 16 }}>
            <div style={{
              position: 'absolute', inset: -6,
              borderRadius: 20,
              background: 'radial-gradient(circle, rgba(13,146,100,0.12) 0%, transparent 70%)',
              animation: 'breathe 3s ease-in-out infinite',
            }} />
            <div style={{
              width: isMobile ? 44 : 52, height: isMobile ? 44 : 52,
              borderRadius: isMobile ? 14 : 16,
              background: 'linear-gradient(145deg, #0d9264, #0a8058)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: isMobile ? 19 : 22, fontWeight: 700, color: '#fff',
              position: 'relative',
              boxShadow: '0 4px 16px rgba(13,146,100,0.2), 0 1px 3px rgba(13,146,100,0.1)',
            }}>
              M
              {/* Live indicator */}
              <div style={{
                position: 'absolute', bottom: -2, right: -2,
                width: 12, height: 12, borderRadius: '50%',
                background: '#10b981', border: '2.5px solid #f4f5f7',
                boxShadow: '0 0 0 1px rgba(16,185,129,0.2)',
              }} />
            </div>
          </div>

          <h1 style={{
            fontSize: isMobile ? 24 : 30,
            fontWeight: 300,
            margin: 0, lineHeight: 1.3,
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em',
          }}>
            {greeting}, <span style={{
              fontWeight: 700,
              background: 'linear-gradient(135deg, #0d9264, #0a7b54)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>{displayName}</span>
          </h1>
          <p style={{
            fontSize: isMobile ? 13 : 14,
            color: 'var(--text-muted)',
            marginTop: 8, lineHeight: 1.5,
            fontWeight: 400,
          }}>
            Saha verilerini sorgula, yapay zeka destekli<br />analiz ve öneriler al.
          </p>
        </div>

        {/* Smart Messages — staggered entrance */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: isMobile ? 10 : 12,
          marginBottom: isMobile ? 18 : 24,
        }}>
          {SMART_MESSAGES.map((sm, idx) => {
            const Icon = sm.icon
            const isActive = sm.active
            return (
              <div
                key={sm.id}
                onClick={() => handleSmartClick(sm)}
                style={{
                  background: isActive ? 'var(--bg-surface)' : 'var(--bg-surface)',
                  border: isActive ? '1px solid var(--border-subtle)' : '1px solid var(--border-subtle)',
                  borderRadius: 14,
                  padding: isMobile ? '16px 14px' : '18px 16px',
                  cursor: isActive ? 'pointer' : 'default',
                  opacity: mounted ? (isActive ? 1 : 0.38) : 0,
                  transform: mounted ? 'translateY(0)' : 'translateY(16px)',
                  transition: `all 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${0.15 + idx * 0.08}s`,
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)' : 'none',
                }}
                onMouseEnter={(e) => {
                  if (isActive) {
                    e.currentTarget.style.borderColor = 'var(--accent-border)'
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(13,146,100,0.08), 0 1px 3px rgba(0,0,0,0.04)'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (isActive) {
                    e.currentTarget.style.borderColor = 'var(--border-subtle)'
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }
                }}
              >
                {/* Active card subtle gradient overlay */}
                {isActive && (
                  <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                    background: 'linear-gradient(90deg, #0d9264, #10b981)',
                    borderRadius: '14px 14px 0 0',
                  }} />
                )}

                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div style={{
                    width: isMobile ? 36 : 40, height: isMobile ? 36 : 40,
                    borderRadius: 11,
                    background: isActive ? sm.gradient : `${sm.color}08`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: 12,
                    border: isActive ? `1px solid ${sm.color}20` : 'none',
                  }}>
                    <Icon size={isMobile ? 17 : 19} color={sm.color} strokeWidth={1.8} />
                  </div>
                  {isActive && (
                    <ArrowRight size={14} color="var(--text-muted)" style={{ marginTop: 4 }} />
                  )}
                </div>

                <div style={{
                  fontSize: isMobile ? 13 : 14,
                  fontWeight: 600,
                  color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                  marginBottom: 3,
                  letterSpacing: '-0.01em',
                }}>
                  {sm.label}
                </div>
                <div style={{
                  fontSize: isMobile ? 11 : 12,
                  color: 'var(--text-muted)',
                  fontWeight: 400,
                  lineHeight: 1.4,
                }}>
                  {sm.desc}
                </div>
              </div>
            )
          })}
        </div>

        {/* Input — clean, elevated */}
        <div style={{
          position: 'relative',
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(12px)',
          transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.5s',
        }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ne öğrenmek istersin?"
            style={{
              width: '100%',
              padding: isMobile ? '15px 52px 15px 16px' : '16px 56px 16px 20px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 14,
              color: 'var(--text-primary)',
              fontSize: isMobile ? 14 : 15,
              outline: 'none',
              fontFamily: 'inherit',
              fontWeight: 400,
              boxSizing: 'border-box',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04), 0 0 1px rgba(0,0,0,0.06)',
              transition: 'border-color 0.2s, box-shadow 0.25s',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--accent)'
              e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04), 0 0 0 3px rgba(13,146,100,0.08)'
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--border-subtle)'
              e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04), 0 0 1px rgba(0,0,0,0.06)'
            }}
          />
          <button onClick={handleSend} style={{
            position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
            width: 38, height: 38, borderRadius: 11,
            background: input.trim() ? 'linear-gradient(135deg, #0d9264, #0a8058)' : 'transparent',
            border: 'none',
            cursor: input.trim() ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            boxShadow: input.trim() ? '0 2px 8px rgba(13,146,100,0.2)' : 'none',
          }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={input.trim() ? '#fff' : '#bbb'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14"/><path d="M12 5l7 7-7 7"/>
            </svg>
          </button>
        </div>

        {/* Footer spacer */}
        <div style={{ height: isMobile ? 16 : 24 }} />
      </div>

      <style>{`
        @keyframes breathe {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.15); opacity: 0.8; }
        }
      `}</style>
    </div>
  )
}
