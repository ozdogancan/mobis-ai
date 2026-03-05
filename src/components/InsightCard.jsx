import { AlertTriangle, AlertCircle, CheckCircle, Info, Lightbulb } from 'lucide-react'

const config = {
  critical: { icon: AlertTriangle, color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  warning: { icon: AlertCircle, color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  success: { icon: CheckCircle, color: '#059669', bg: '#f0fdf4', border: '#bbf7d0' },
  info: { icon: Info, color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  recommendation: { icon: Lightbulb, color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
}

export default function InsightCard({ type, title, description }) {
  const c = config[type] || config.info
  const Icon = c.icon
  return (
    <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 'var(--radius-sm)', padding: '10px 12px', marginBottom: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <Icon size={13} color={c.color} />
        <span style={{ fontSize: 12, fontWeight: 600, color: c.color }}>{title}</span>
      </div>
      <div style={{ fontSize: 12, color: '#3d4654', lineHeight: 1.55, paddingLeft: 19 }}>{description}</div>
    </div>
  )
}
