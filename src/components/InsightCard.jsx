import { AlertTriangle, CheckCircle, Info, Lightbulb } from 'lucide-react'

const typeConfig = {
  critical: { icon: AlertTriangle, color: '#ef4444', bg: '#ef444415', border: '#ef444440' },
  warning: { icon: AlertTriangle, color: '#f59e0b', bg: '#f59e0b15', border: '#f59e0b40' },
  success: { icon: CheckCircle, color: '#22c55e', bg: '#22c55e15', border: '#22c55e40' },
  info: { icon: Info, color: '#6366f1', bg: '#6366f115', border: '#6366f140' },
  recommendation: { icon: Lightbulb, color: '#f59e0b', bg: '#f59e0b10', border: '#f59e0b30' },
}

export default function InsightCard({ type = 'info', title, description }) {
  const config = typeConfig[type] || typeConfig.info
  const Icon = config.icon

  return (
    <div style={{
      background: config.bg,
      border: `1px solid ${config.border}`,
      borderLeft: `3px solid ${config.color}`,
      borderRadius: '10px',
      padding: '16px 18px',
      marginBottom: '10px',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
      }}>
        <Icon size={18} color={config.color} style={{ marginTop: '2px', flexShrink: 0 }} />
        <div>
          <div style={{
            fontSize: '0.9rem',
            fontWeight: '600',
            color: config.color,
            marginBottom: '4px',
          }}>
            {title}
          </div>
          <div style={{
            fontSize: '0.85rem',
            color: '#8b8fa3',
            lineHeight: '1.5',
          }}>
            {description}
          </div>
        </div>
      </div>
    </div>
  )
}
