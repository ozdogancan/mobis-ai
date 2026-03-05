import { ShoppingCart, TrendingUp, TrendingDown, Users, CheckCircle, Truck, XCircle } from 'lucide-react'

const iconMap = {
  orders: ShoppingCart, revenue: TrendingUp, decline: TrendingDown,
  dealers: Users, success: CheckCircle, delivery: Truck, cancel: XCircle,
}

export default function KpiGrid({ data, isMobile }) {
  if (!data?.length) return null
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : `repeat(${Math.min(data.length, 4)}, 1fr)`,
      gap: 8, marginBottom: 12,
    }}>
      {data.map((kpi, i) => {
        const Icon = iconMap[kpi.icon] || ShoppingCart
        return (
          <div key={i} style={{
            background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)', padding: isMobile ? '10px' : '10px 12px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
              <div style={{
                width: 22, height: 22, borderRadius: 6,
                background: (kpi.color || '#0d9264') + '12',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}><Icon size={11} color={kpi.color || '#0d9264'} /></div>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500 }}>{kpi.label}</span>
            </div>
            <div style={{ fontSize: isMobile ? 16 : 18, fontWeight: 700, color: 'var(--text-primary)' }}>{kpi.value}</div>
            {kpi.sub && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{kpi.sub}</div>}
          </div>
        )
      })}
    </div>
  )
}
