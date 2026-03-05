import { useState } from 'react'
import { Send, Sparkles } from 'lucide-react'

const quickActions = [
  { label: 'Ocak 2026 PM Aktif Raporu', query: 'Ocak 2026 PM Aktif raporunu göster' },
  { label: 'Otomatik İptal Analizi', query: 'Otomatik iptal edilen siparişleri analiz et' },
  { label: 'Bayi Performansı', query: 'En iyi ve en kötü bayileri karşılaştır' },
  { label: 'Kategori Dağılımı', query: 'Kategori bazlı ciro dağılımını göster' },
]

export default function ChatInput({ onSend, loading, showQuickActions }) {
  const [input, setInput] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (input.trim() && !loading) {
      onSend(input.trim())
      setInput('')
    }
  }

  const handleQuickAction = (query) => {
    if (!loading) {
      onSend(query)
    }
  }

  return (
    <div>
      {/* Quick Actions */}
      {showQuickActions && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          marginBottom: '16px',
          justifyContent: 'center',
        }}>
          {quickActions.map((action, i) => (
            <button
              key={i}
              onClick={() => handleQuickAction(action.query)}
              disabled={loading}
              style={{
                padding: '8px 16px',
                background: '#171923',
                border: '1px solid #252840',
                borderRadius: '20px',
                color: '#8b8fa3',
                fontSize: '0.82rem',
                fontFamily: 'Outfit, sans-serif',
                cursor: loading ? 'wait' : 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
              onMouseOver={(e) => {
                e.target.style.borderColor = '#6366f1'
                e.target.style.color = '#e8e9ed'
              }}
              onMouseOut={(e) => {
                e.target.style.borderColor = '#252840'
                e.target.style.color = '#8b8fa3'
              }}
            >
              <Sparkles size={13} />
              {action.label}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} style={{
        display: 'flex',
        gap: '10px',
        background: '#171923',
        borderRadius: '14px',
        padding: '6px',
        border: '1px solid #252840',
      }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="PM Aktif verilerini sorgula..."
          disabled={loading}
          style={{
            flex: 1,
            padding: '12px 16px',
            background: 'transparent',
            border: 'none',
            color: '#e8e9ed',
            fontSize: '0.95rem',
            fontFamily: 'Outfit, sans-serif',
            outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          style={{
            padding: '12px 20px',
            background: input.trim() ? 'linear-gradient(135deg, #6366f1, #7c3aed)' : '#252840',
            border: 'none',
            borderRadius: '10px',
            color: input.trim() ? '#fff' : '#5c6078',
            cursor: loading ? 'wait' : (input.trim() ? 'pointer' : 'default'),
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.88rem',
            fontWeight: '500',
            fontFamily: 'Outfit, sans-serif',
            transition: 'all 0.2s',
          }}
        >
          {loading ? (
            <div style={{
              width: '18px', height: '18px',
              border: '2px solid #ffffff40',
              borderTop: '2px solid #fff',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }} />
          ) : (
            <Send size={16} />
          )}
        </button>
      </form>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
