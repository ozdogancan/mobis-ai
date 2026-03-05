import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError('E-posta veya şifre hatalı')
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0a0b0f 0%, #12141c 50%, #0f1018 100%)',
      padding: '20px',
    }}>
      {/* Background glow */}
      <div style={{
        position: 'fixed',
        top: '20%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '600px',
        height: '600px',
        background: 'radial-gradient(circle, #6366f115 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        width: '100%',
        maxWidth: '420px',
        position: 'relative',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            marginBottom: '20px',
            fontSize: '28px',
            fontWeight: '700',
            color: '#fff',
            boxShadow: '0 8px 32px #6366f133',
          }}>
            M
          </div>
          <h1 style={{
            fontSize: '1.75rem',
            fontWeight: '600',
            color: '#e8e9ed',
            marginBottom: '8px',
            fontFamily: 'Outfit, sans-serif',
            letterSpacing: '-0.02em',
          }}>
            Mobis AI
          </h1>
          <p style={{
            color: '#5c6078',
            fontSize: '0.95rem',
            fontFamily: 'Outfit, sans-serif',
          }}>
            Akıllı Saha Yönetim Platformu
          </p>
        </div>

        {/* Login Card */}
        <form onSubmit={handleLogin} style={{
          background: '#171923',
          borderRadius: '16px',
          padding: '36px',
          border: '1px solid #252840',
        }}>
          {error && (
            <div style={{
              background: '#ef444420',
              border: '1px solid #ef444440',
              borderRadius: '10px',
              padding: '12px 16px',
              marginBottom: '20px',
              color: '#fca5a5',
              fontSize: '0.88rem',
              fontFamily: 'Outfit, sans-serif',
            }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              color: '#8b8fa3',
              fontSize: '0.85rem',
              marginBottom: '8px',
              fontFamily: 'Outfit, sans-serif',
              fontWeight: '500',
            }}>
              E-posta
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ornek@yildzholding.com"
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                background: '#0a0b0f',
                border: '1px solid #252840',
                borderRadius: '10px',
                color: '#e8e9ed',
                fontSize: '0.95rem',
                fontFamily: 'Outfit, sans-serif',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => e.target.style.borderColor = '#6366f1'}
              onBlur={(e) => e.target.style.borderColor = '#252840'}
            />
          </div>

          <div style={{ marginBottom: '28px' }}>
            <label style={{
              display: 'block',
              color: '#8b8fa3',
              fontSize: '0.85rem',
              marginBottom: '8px',
              fontFamily: 'Outfit, sans-serif',
              fontWeight: '500',
            }}>
              Şifre
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                background: '#0a0b0f',
                border: '1px solid #252840',
                borderRadius: '10px',
                color: '#e8e9ed',
                fontSize: '0.95rem',
                fontFamily: 'Outfit, sans-serif',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => e.target.style.borderColor = '#6366f1'}
              onBlur={(e) => e.target.style.borderColor = '#252840'}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '13px',
              background: loading ? '#4f46e5' : 'linear-gradient(135deg, #6366f1, #7c3aed)',
              border: 'none',
              borderRadius: '10px',
              color: '#fff',
              fontSize: '1rem',
              fontWeight: '600',
              fontFamily: 'Outfit, sans-serif',
              cursor: loading ? 'wait' : 'pointer',
              transition: 'opacity 0.2s, transform 0.1s',
              opacity: loading ? 0.7 : 1,
              boxShadow: '0 4px 20px #6366f133',
            }}
            onMouseOver={(e) => { if (!loading) e.target.style.opacity = '0.9' }}
            onMouseOut={(e) => { if (!loading) e.target.style.opacity = '1' }}
          >
            {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>

        <p style={{
          textAlign: 'center',
          marginTop: '24px',
          color: '#5c6078',
          fontSize: '0.8rem',
          fontFamily: 'Outfit, sans-serif',
        }}>
          Yıldız Holding — A-Team SFA Platform
        </p>
      </div>
    </div>
  )
}
