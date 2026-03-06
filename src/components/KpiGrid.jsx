import { ShoppingCart, TrendingUp, TrendingDown, Users, CheckCircle, Truck, XCircle, AlertTriangle } from 'lucide-react'

const iconMap = {
  orders: ShoppingCart, revenue: TrendingUp, decline: TrendingDown,
  dealers: Users, success: CheckCircle, delivery: Truck, cancel: XCircle, warning: AlertTriangle,
}

export default function KpiGrid({ data, isMobile }) {
  if (!data?.length) return null

  const getStatusColor = (kpi) => {
    if (kpi.status === 'good') return '#059669'
    if (kpi.status === 'warning') return '#d97706'
    if (kpi.status === 'bad') return '#dc2626'
    return kpi.color || '#0d9264'
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : `repeat(${Math.min(data.length, 4)}, 1fr)`,
      gap: 8, marginBottom: 14,
    }}>
      {data.map((kpi, i) => {
        const Icon = iconMap[kpi.icon] || ShoppingCart
        const statusColor = getStatusColor(kpi)
        return (
          <div key={i} style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: isMobile ? '12px 10px' : '14px 14px',
            position: 'relative',
            overflow: 'hidden',
            transition: 'all 0.2s ease',
          }}>
            {/* Top accent line */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 2,
              background: statusColor, opacity: 0.6,
            }} />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: statusColor + '10',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon size={13} color={statusColor} />
              </div>
              {kpi.change && (
                <span style={{
                  fontSize: 10, fontWeight: 600,
                  color: kpi.change > 0 ? '#059669' : '#dc2626',
                  background: kpi.change > 0 ? '#f0fdf4' : '#fef2f2',
                  padding: '2px 6px', borderRadius: 4,
                }}>
                  {kpi.change > 0 ? '↑' : '↓'} {Math.abs(kpi.change)}%
                </span>
              )}
            </div>

            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500, marginBottom: 4 }}>
              {kpi.label}
            </div>
            <div style={{
              fontSize: isMobile ? 18 : 22, fontWeight: 700,
              color: 'var(--text-primary)', letterSpacing: '-0.02em',
              lineHeight: 1.1,
            }}>
              {kpi.value}
            </div>
            {kpi.sub && (
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{kpi.sub}</div>
            )}
          </div>
        )
      })}
    </div>
  )
}
