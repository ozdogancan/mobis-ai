import { TrendingUp, TrendingDown, Package, Truck, AlertTriangle, CheckCircle, CreditCard, Users } from 'lucide-react'

const iconMap = {
  orders: Package, revenue: TrendingUp, delivery: Truck, cancel: AlertTriangle,
  success: CheckCircle, payment: CreditCard, dealers: Users, decline: TrendingDown,
}

export default function KpiGrid({ data }) {
  if (!data || data.length === 0) return null
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 16 }}>
      {data.map((kpi, i) => {
        const Icon = iconMap[kpi.icon] || Package
        const c = kpi.color || 'var(--accent)'
        return (
          <div key={i} style={{
            background: 'var(--bg-card)', borderRadius: 10, padding: 16,
            border: '1px solid var(--border-subtle)', borderLeft: `3px solid ${c}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>
                {kpi.label}
              </span>
              <Icon size={14} color={c} />
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'IBM Plex Mono, monospace', marginBottom: 2 }}>
              {kpi.value}
            </div>
            {kpi.sub && <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>{kpi.sub}</div>}
          </div>
        )
      })}
    </div>
  )
}
