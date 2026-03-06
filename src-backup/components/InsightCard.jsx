import { AlertTriangle, CheckCircle, Info, Lightbulb } from 'lucide-react'

const typeConfig = {
  critical: { icon: AlertTriangle, color: '#ef4444', bg: '#ef444410', border: '#ef444430' },
  warning: { icon: AlertTriangle, color: '#f59e0b', bg: '#f59e0b10', border: '#f59e0b30' },
  success: { icon: CheckCircle, color: '#10b981', bg: '#10b98110', border: '#10b98130' },
  info: { icon: Info, color: '#3b82f6', bg: '#3b82f610', border: '#3b82f630' },
  recommendation: { icon: Lightbulb, color: '#f59e0b', bg: '#f59e0b08', border: '#f59e0b25' },
}

export default function InsightCard({ type = 'info', title, description }) {
  const config = typeConfig[type] || typeConfig.info
  const Icon = config.icon
  return (
    <div style={{
      background: config.bg, border: `1px solid ${config.border}`,
      borderLeft: `3px solid ${config.color}`,
      borderRadius: 9, padding: '14px 16px', marginBottom: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <Icon size={16} color={config.color} style={{ marginTop: 2, flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: config.color, marginBottom: 3 }}>{title}</div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>{description}</div>
        </div>
      </div>
    </div>
  )
}
