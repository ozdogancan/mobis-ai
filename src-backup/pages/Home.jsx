import { ShoppingCart, Users, Route, BarChart3, ArrowRight, Sparkles } from 'lucide-react'

const modules = [
  {
    id: 'pmaktif', icon: ShoppingCart, label: 'PM Aktif Analiz',
    desc: 'Sipariş, karşılanma, iptal ve teslimat analizleri',
    color: '#3b82f6', enabled: true,
    stats: '165K+ kalem · 82 bayi',
  },
  {
    id: 'saha', icon: Users, label: 'Saha Takip',
    desc: 'Temsilci performansı, coaching ve canlı konum',
    color: '#10b981', enabled: false,
  },
  {
    id: 'rut', icon: Route, label: 'Rut Analiz',
    desc: 'Rut optimizasyonu ve ziyaret planlaması',
    color: '#f59e0b', enabled: false,
  },
  {
    id: 'bayi', icon: BarChart3, label: 'Bayi Performans',
    desc: 'Bayi karşılaştırma ve benchmarking',
    color: '#8b5cf6', enabled: false,
  },
]

export default function Home({ onModuleChange }) {
  return (
    <div style={{ padding: 32, maxWidth: 800, margin: '0 auto' }}>
      {/* Welcome */}
      <div style={{ marginBottom: 40, textAlign: 'center' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'var(--accent-muted)', border: '1px solid var(--accent)',
          borderRadius: 20, padding: '6px 16px', marginBottom: 20,
          fontSize: '0.78rem', color: 'var(--accent)',
        }}>
          <Sparkles size={13} />
          AI Destekli Saha Yönetimi
        </div>
        <h1 style={{
          fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)',
          letterSpacing: '-0.03em', marginBottom: 10,
        }}>
          Hoş Geldiniz
        </h1>
        <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: 500, margin: '0 auto' }}>
          Saha verilerinizi sorgulayın, AI destekli insight'lar alın ve aksiyonları takip edin.
        </p>
      </div>

      {/* Module Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
        {modules.map(mod => {
          const Icon = mod.icon
          return (
            <button
              key={mod.id}
              onClick={() => mod.enabled && onModuleChange(mod.id)}
              disabled={!mod.enabled}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 14,
                padding: 24,
                textAlign: 'left',
                cursor: mod.enabled ? 'pointer' : 'default',
                opacity: mod.enabled ? 1 : 0.45,
                transition: 'all 0.2s',
                fontFamily: 'DM Sans, sans-serif',
                position: 'relative',
                overflow: 'hidden',
              }}
              onMouseOver={(e) => {
                if (mod.enabled) {
                  e.currentTarget.style.borderColor = mod.color + '50'
                  e.currentTarget.style.background = mod.color + '08'
                }
              }}
              onMouseOut={(e) => {
                if (mod.enabled) {
                  e.currentTarget.style.borderColor = 'var(--border-subtle)'
                  e.currentTarget.style.background = 'var(--bg-card)'
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: mod.color + '18',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={20} color={mod.color} />
                </div>
                {mod.enabled && <ArrowRight size={16} color="var(--text-muted)" />}
                {!mod.enabled && (
                  <span style={{
                    fontSize: '0.65rem', background: 'var(--border-subtle)',
                    padding: '3px 8px', borderRadius: 5, color: 'var(--text-muted)',
                  }}>Yakında</span>
                )}
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                {mod.label}
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                {mod.desc}
              </div>
              {mod.stats && (
                <div style={{
                  marginTop: 12, fontSize: '0.72rem', color: mod.color,
                  fontFamily: 'IBM Plex Mono, monospace',
                }}>
                  {mod.stats}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
