import { TrendingUp, TrendingDown, Package, Truck, AlertTriangle, CheckCircle, CreditCard, Users } from 'lucide-react'

const iconMap = {
  orders: Package,
  revenue: TrendingUp,
  delivery: Truck,
  cancel: AlertTriangle,
  success: CheckCircle,
  payment: CreditCard,
  dealers: Users,
  decline: TrendingDown,
}

export default function KpiGrid({ data }) {
  if (!data || data.length === 0) return null

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '12px',
      marginBottom: '20px',
    }}>
      {data.map((kpi, i) => {
        const Icon = iconMap[kpi.icon] || Package
        const accentColor = kpi.color || '#6366f1'

        return (
          <div key={i} style={{
            background: '#171923',
            borderRadius: '12px',
            padding: '18px',
            border: '1px solid #252840',
            borderLeft: `3px solid ${accentColor}`,
            transition: 'border-color 0.2s, background 0.2s',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '10px',
            }}>
              <span style={{
                fontSize: '0.72rem',
                color: '#5c6078',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                fontWeight: '600',
              }}>
                {kpi.label}
              </span>
              <Icon size={16} color={accentColor} />
            </div>
            <div style={{
              fontSize: '1.6rem',
              fontWeight: '700',
              color: '#e8e9ed',
              marginBottom: '4px',
              fontFamily: 'JetBrains Mono, monospace',
            }}>
              {kpi.value}
            </div>
            {kpi.sub && (
              <div style={{
                fontSize: '0.78rem',
                color: '#5c6078',
              }}>
                {kpi.sub}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
