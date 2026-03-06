import { useState } from 'react'
import { Send, Sparkles, BarChart3, AlertTriangle, Users, PieChart } from 'lucide-react'

const quickActions = [
  { label: 'Aylık Rapor', query: 'Ocak 2026 PM Aktif genel raporunu göster', icon: BarChart3, color: '#3b82f6' },
  { label: 'İptal Analizi', query: 'Otomatik iptal edilen siparişleri analiz et', icon: AlertTriangle, color: '#ef4444' },
  { label: 'Bayi Karşılaştırma', query: 'En iyi ve en kötü bayileri karşılaştır', icon: Users, color: '#10b981' },
  { label: 'Kategori Dağılımı', query: 'Kategori bazlı ciro dağılımını göster', icon: PieChart, color: '#f59e0b' },
]

export default function ChatInput({ onSend, loading }) {
  const [input, setInput] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (input.trim() && !loading) {
      onSend(input.trim())
      setInput('')
    }
  }

  return (
    <div style={{ background: 'var(--bg-surface)', borderTop: '1px solid var(--border-subtle)', padding: '16px 20px' }}>
      {/* Quick Actions - always visible */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {quickActions.map((action, i) => {
          const Icon = action.icon
          return (
            <button
              key={i}
              onClick={() => !loading && onSend(action.query)}
              disabled={loading}
              style={{
                padding: '6px 14px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 8,
                color: 'var(--text-secondary)',
                fontSize: '0.78rem',
                fontFamily: 'DM Sans, sans-serif',
                cursor: loading ? 'wait' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
                transition: 'all 0.15s',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = action.color + '60'
                e.currentTarget.style.color = action.color
                e.currentTarget.style.background = action.color + '10'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-subtle)'
                e.currentTarget.style.color = 'var(--text-secondary)'
                e.currentTarget.style.background = 'var(--bg-card)'
              }}
            >
              <Icon size={13} />
              {action.label}
            </button>
          )
        })}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} style={{
        display: 'flex', gap: 8,
        background: 'var(--bg-card)',
        borderRadius: 12,
        padding: 4,
        border: '1px solid var(--border-default)',
      }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Veri hakkında bir soru sor..."
          disabled={loading}
          style={{
            flex: 1, padding: '11px 14px',
            background: 'transparent', border: 'none',
            color: 'var(--text-primary)', fontSize: '0.9rem',
            fontFamily: 'DM Sans, sans-serif', outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          style={{
            padding: '10px 18px',
            background: input.trim() ? 'var(--accent)' : 'var(--border-subtle)',
            border: 'none', borderRadius: 9,
            color: input.trim() ? '#fff' : 'var(--text-muted)',
            cursor: loading ? 'wait' : (input.trim() ? 'pointer' : 'default'),
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: '0.85rem', fontWeight: 500,
            fontFamily: 'DM Sans, sans-serif',
            transition: 'all 0.15s',
          }}
        >
          {loading ? (
            <div style={{
              width: 16, height: 16,
              border: '2px solid #ffffff40', borderTop: '2px solid #fff',
              borderRadius: '50%', animation: 'spin 0.7s linear infinite',
            }} />
          ) : (
            <Send size={15} />
          )}
        </button>
      </form>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
