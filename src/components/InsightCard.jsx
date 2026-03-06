import { AlertTriangle, AlertCircle, CheckCircle, Info, Lightbulb, ChevronRight } from 'lucide-react'

const config = {
  critical: { icon: AlertTriangle, color: '#dc2626', bg: '#fef2f2', border: '#fecaca', label: 'Kritik' },
  warning: { icon: AlertCircle, color: '#d97706', bg: '#fffbeb', border: '#fde68a', label: 'Uyarı' },
  success: { icon: CheckCircle, color: '#059669', bg: '#f0fdf4', border: '#bbf7d0', label: 'Başarılı' },
  info: { icon: Info, color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', label: 'Bilgi' },
  recommendation: { icon: Lightbulb, color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', label: 'Öneri' },
  action: { icon: ChevronRight, color: '#0d9264', bg: '#ecfdf5', border: '#a7f3d0', label: 'Aksiyon' },
}

export default function InsightCard({ type, title, description, action }) {
  const c = config[type] || config.info
  const Icon = c.icon

  return (
    <div style={{
      background: c.bg,
      border: `1px solid ${c.border}`,
      borderRadius: 'var(--radius-md)',
      padding: '12px 14px',
      marginBottom: 8,
      borderLeft: `3px solid ${c.color}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <div style={{
          width: 22, height: 22, borderRadius: 6,
          background: c.color + '18',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon size={12} color={c.color} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 9, fontWeight: 600, color: c.color, textTransform: 'uppercase', letterSpacing: 0.5 }}>{c.label}</span>
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: c.color, display: 'block', marginTop: 1 }}>{title}</span>
        </div>
      </div>
      <div style={{
        fontSize: 12, color: '#4b5563', lineHeight: 1.6, paddingLeft: 30,
      }}>
        {description}
      </div>
      {action && (
        <div style={{
          marginTop: 8, paddingLeft: 30,
        }}>
          <span style={{
            fontSize: 11, fontWeight: 600, color: c.color,
            cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 3,
          }}>
            {action} <ChevronRight size={12} />
          </span>
        </div>
      )}
    </div>
  )
}
