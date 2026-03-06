import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getAIInsight, prepareDataContext } from '../lib/gemini'
import { Bot, User, ShoppingCart } from 'lucide-react'
import ChatInput from '../components/ChatInput'
import KpiGrid from '../components/KpiGrid'
import InsightCard from '../components/InsightCard'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#64748b']

// ============================================================
// DATA ANALYSIS (rule-based fallback when AI is unavailable)
// ============================================================
function analyzeData(orders, query) {
  const q = query.toLowerCase()
  const totalRows = orders.length
  const uniqueOrders = [...new Set(orders.map(o => o.pma_siparis_kodu))].length
  const totalBrut = orders.reduce((s, o) => s + (Number(o.son_brut_ciro) || 0), 0)
  const totalIndirim = orders.reduce((s, o) => s + (Number(o.son_indirim_tutari) || 0), 0)

  const bayiMap = {}
  orders.forEach(o => {
    if (!bayiMap[o.bayi]) bayiMap[o.bayi] = { count: 0, brut: 0, iptal: 0 }
    bayiMap[o.bayi].count++
    bayiMap[o.bayi].brut += Number(o.son_brut_ciro) || 0
    if (o.onay_durumu === 'Otomatik İptal') bayiMap[o.bayi].iptal++
  })

  const kategoriMap = {}
  orders.forEach(o => {
    if (!kategoriMap[o.kategori]) kategoriMap[o.kategori] = { count: 0, brut: 0 }
    kategoriMap[o.kategori].count++
    kategoriMap[o.kategori].brut += Number(o.son_brut_ciro) || 0
  })

  const karsilanmaMap = {}
  orders.forEach(o => {
    const k = o.karsilanma_durumu || 'Bilinmiyor'
    if (!karsilanmaMap[k]) karsilanmaMap[k] = 0
    karsilanmaMap[k]++
  })

  const onayMap = {}
  orders.forEach(o => {
    const k = o.onay_durumu || 'Bilinmiyor'
    if (!onayMap[k]) onayMap[k] = 0
    onayMap[k]++
  })

  const teslimOrders = orders.filter(o => o.teslim_suresi_gun != null)
  const avgTeslim = teslimOrders.length > 0
    ? (teslimOrders.reduce((s, o) => s + o.teslim_suresi_gun, 0) / teslimOrders.length).toFixed(1)
    : 'N/A'

  const iptalOrders = orders.filter(o => o.onay_durumu === 'Otomatik İptal')
  const iptalCount = [...new Set(iptalOrders.map(o => o.pma_siparis_kodu))].length
  const activeBayis = Object.keys(bayiMap).length

  const fmt = (val) => {
    if (val >= 1e9) return (val / 1e9).toFixed(1) + 'B ₺'
    if (val >= 1e6) return (val / 1e6).toFixed(1) + 'M ₺'
    if (val >= 1e3) return (val / 1e3).toFixed(1) + 'K ₺'
    return val.toFixed(0) + ' ₺'
  }

  const result = { kpis: [], insights: [], charts: [] }

  // GENEL RAPOR
  if (q.includes('rapor') || q.includes('özet') || q.includes('göster') || q.includes('genel')) {
    const tamKarsilanan = karsilanmaMap['Tam karşılanan sipariş'] || 0
    const tamOran = totalRows > 0 ? ((tamKarsilanan / totalRows) * 100).toFixed(1) : 0

    result.kpis = [
      { label: 'Toplam Sipariş', value: uniqueOrders.toLocaleString('tr-TR'), sub: `${totalRows.toLocaleString('tr-TR')} kalem`, icon: 'orders', color: '#3b82f6' },
      { label: 'Brüt Ciro', value: fmt(totalBrut), sub: 'Satır bazlı toplam', icon: 'revenue', color: '#10b981' },
      { label: 'Toplam İndirim', value: fmt(totalIndirim), sub: `Brüte oran: %${totalBrut > 0 ? ((totalIndirim / totalBrut) * 100).toFixed(1) : 0}`, icon: 'decline', color: '#f59e0b' },
      { label: 'Aktif Bayi', value: activeBayis.toString(), sub: `${[...new Set(orders.map(o => o.plasiyer))].length} plasiyer`, icon: 'dealers', color: '#06b6d4' },
      { label: 'Tam Karşılanma', value: `%${tamOran}`, sub: `${tamKarsilanan.toLocaleString('tr-TR')} kalem`, icon: 'success', color: '#10b981' },
      { label: 'Ort. Teslim', value: `${avgTeslim} gün`, sub: 'Teslim edilen siparişler', icon: 'delivery', color: '#3b82f6' },
      { label: 'Oto. İptal', value: iptalCount.toString(), sub: `${iptalOrders.length} kalem`, icon: 'cancel', color: '#ef4444' },
    ]

    result.charts.push({
      type: 'bar', title: 'Kategori Bazlı Brüt Ciro',
      data: Object.entries(kategoriMap).sort((a, b) => b[1].brut - a[1].brut).slice(0, 8)
        .map(([name, d]) => ({ name: name.length > 16 ? name.slice(0, 16) + '…' : name, value: d.brut })),
    })

    result.charts.push({
      type: 'pie', title: 'Onay Durumu',
      data: Object.entries(onayMap).map(([name, value]) => ({ name, value })),
    })
  }

  // İPTAL ANALİZİ
  else if (q.includes('iptal')) {
    const iptalBayiMap = {}
    iptalOrders.forEach(o => {
      if (!iptalBayiMap[o.bayi]) iptalBayiMap[o.bayi] = { count: 0, brut: 0 }
      iptalBayiMap[o.bayi].count++
      iptalBayiMap[o.bayi].brut += Number(o.son_brut_ciro) || 0
    })

    result.kpis = [
      { label: 'Toplam Oto. İptal', value: iptalCount.toString(), sub: `${iptalOrders.length} kalem`, icon: 'cancel', color: '#ef4444' },
      { label: 'Kayıp Ciro', value: fmt(iptalOrders.reduce((s, o) => s + (Number(o.son_brut_ciro) || 0), 0)), icon: 'decline', color: '#ef4444' },
      { label: 'Etkilenen Bayi', value: Object.keys(iptalBayiMap).length.toString(), icon: 'dealers', color: '#f59e0b' },
    ]

    result.charts.push({
      type: 'bar', title: 'Bayi Bazlı İptal Sayısı',
      data: Object.entries(iptalBayiMap).sort((a, b) => b[1].count - a[1].count).slice(0, 10)
        .map(([name, d]) => ({ name: name.length > 20 ? name.slice(0, 20) + '…' : name, value: d.count })),
    })
  }

  // BAYİ
  else if (q.includes('bayi') || q.includes('karşılaştır') || q.includes('performans')) {
    result.kpis = [
      { label: 'Toplam Bayi', value: activeBayis.toString(), icon: 'dealers', color: '#3b82f6' },
    ]

    result.charts.push({
      type: 'bar', title: 'Bayi Bazlı Brüt Ciro (Top 10)',
      data: Object.entries(bayiMap).sort((a, b) => b[1].brut - a[1].brut).slice(0, 10)
        .map(([name, d]) => ({ name: name.length > 20 ? name.slice(0, 20) + '…' : name, value: d.brut })),
    })
  }

  // KATEGORİ
  else if (q.includes('kategori') || q.includes('dağılım') || q.includes('ürün')) {
    result.charts.push({
      type: 'pie', title: 'Kategori Bazlı Ciro',
      data: Object.entries(kategoriMap).sort((a, b) => b[1].brut - a[1].brut).slice(0, 8)
        .map(([name, d]) => ({ name: name.length > 18 ? name.slice(0, 18) + '…' : name, value: d.brut })),
    })
  }

  return result
}

// ============================================================
// CHART RENDERER
// ============================================================
function ChartRenderer({ chart }) {
  if (chart.type === 'bar') {
    return (
      <div style={{ background: 'var(--bg-surface)', borderRadius: 10, padding: 18, border: '1px solid var(--border-subtle)' }}>
        <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 14, fontWeight: 500 }}>{chart.title}</h4>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chart.data} layout="vertical" margin={{ left: 5, right: 15 }}>
            <XAxis type="number" tick={{ fill: '#5b6478', fontSize: 10 }}
              tickFormatter={(v) => v >= 1e6 ? (v/1e6).toFixed(1)+'M' : v >= 1e3 ? (v/1e3).toFixed(0)+'K' : v} />
            <YAxis type="category" dataKey="name" width={115} tick={{ fill: '#94a3b8', fontSize: 10 }} />
            <Tooltip contentStyle={{ background: '#151821', border: '1px solid #262c3d', borderRadius: 8, fontFamily: 'DM Sans', fontSize: '0.82rem' }}
              labelStyle={{ color: '#eaecf0' }} formatter={(v) => [v.toLocaleString('tr-TR'), 'Değer']} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {chart.data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    )
  }

  if (chart.type === 'pie') {
    return (
      <div style={{ background: 'var(--bg-surface)', borderRadius: 10, padding: 18, border: '1px solid var(--border-subtle)' }}>
        <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 14, fontWeight: 500 }}>{chart.title}</h4>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={chart.data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={45} paddingAngle={2}>
              {chart.data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip contentStyle={{ background: '#151821', border: '1px solid #262c3d', borderRadius: 8, fontFamily: 'DM Sans', fontSize: '0.82rem' }}
              formatter={(v) => [v.toLocaleString('tr-TR'), 'Adet']} />
          </PieChart>
        </ResponsiveContainer>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6, justifyContent: 'center' }}>
          {chart.data.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.68rem', color: 'var(--text-muted)' }}>
              <div style={{ width: 7, height: 7, borderRadius: 2, background: COLORS[i % COLORS.length] }} />
              {item.name}
            </div>
          ))}
        </div>
      </div>
    )
  }
  return null
}

// ============================================================
// PM AKTİF MODULE
// ============================================================
export default function PmAktif() {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (query) => {
    setMessages(prev => [...prev, { role: 'user', content: query }])
    setLoading(true)

    try {
      const { data: orders, error } = await supabase
        .from('pm_aktif_orders')
        .select('*')
        .eq('ay', '2026-01')

      if (error) throw error

      if (!orders || orders.length === 0) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: { insights: [{ type: 'warning', title: 'Veri bulunamadı', description: 'Bu dönem için veri mevcut değil.' }] }
        }])
        setLoading(false)
        return
      }

      // Rule-based analysis (always runs - for KPIs and charts)
      const ruleResult = analyzeData(orders, query)

      // Try AI insight (Gemini)
      const dataContext = prepareDataContext(orders, query)
      const aiResult = await getAIInsight(dataContext, query)

      // Merge: use rule-based KPIs/charts + AI insights (or rule-based insights as fallback)
      const finalResult = {
        kpis: ruleResult.kpis,
        charts: ruleResult.charts,
        insights: aiResult?.insights || ruleResult.insights || [],
        aiSummary: aiResult?.summary || null,
        isAI: !!aiResult,
      }

      setMessages(prev => [...prev, { role: 'assistant', content: finalResult }])
    } catch (err) {
      console.error(err)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: { insights: [{ type: 'critical', title: 'Hata', description: err.message }] }
      }])
    }

    setLoading(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: '#3b82f618', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <ShoppingCart size={16} color="#3b82f6" />
        </div>
        <div>
          <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>PM Aktif Analiz</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Ocak 2026 · Sipariş ve teslimat verileri</div>
        </div>
      </div>

      {/* Messages Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
            <ShoppingCart size={40} color="var(--border-strong)" style={{ margin: '0 auto 16px' }} />
            <div style={{ fontSize: '1.1rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>
              PM Aktif Sorgu Merkezi
            </div>
            <div style={{ fontSize: '0.85rem' }}>
              Aşağıdaki hızlı komutlardan birini seçin veya kendi sorunuzu yazın
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={{ marginBottom: 18 }}>
            {msg.role === 'user' ? (
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <div style={{
                  background: 'var(--accent-muted)', border: '1px solid #3b82f630',
                  borderRadius: '11px 11px 2px 11px',
                  padding: '10px 14px', maxWidth: '65%',
                  fontSize: '0.88rem', color: '#93c5fd',
                }}>
                  {msg.content}
                </div>
                <div style={{
                  width: 28, height: 28, borderRadius: 7,
                  background: '#3b82f625', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <User size={14} color="#60a5fa" />
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 7,
                  background: 'linear-gradient(135deg, #3b82f620, #8b5cf620)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Bot size={14} color="#60a5fa" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* AI Badge */}
                  {msg.content.isAI && (
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      fontSize: '0.65rem', color: '#10b981', background: '#10b98115',
                      padding: '2px 8px', borderRadius: 4, marginBottom: 10,
                      border: '1px solid #10b98130',
                    }}>
                      ✦ AI Analiz
                    </div>
                  )}

                  {/* AI Summary */}
                  {msg.content.aiSummary && (
                    <div style={{
                      background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
                      borderRadius: 10, padding: '12px 16px', marginBottom: 14,
                      fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6,
                    }}>
                      {msg.content.aiSummary}
                    </div>
                  )}

                  {/* KPIs */}
                  {msg.content.kpis && <KpiGrid data={msg.content.kpis} />}

                  {/* Charts */}
                  {msg.content.charts && msg.content.charts.length > 0 && (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: msg.content.charts.length > 1 ? '1fr 1fr' : '1fr',
                      gap: 10, marginBottom: 14,
                    }}>
                      {msg.content.charts.map((chart, ci) => <ChartRenderer key={ci} chart={chart} />)}
                    </div>
                  )}

                  {/* Insights */}
                  {msg.content.insights && msg.content.insights.map((insight, ii) => (
                    <InsightCard key={ii} {...insight} />
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 18 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 7,
              background: 'linear-gradient(135deg, #3b82f620, #8b5cf620)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Bot size={14} color="#60a5fa" />
            </div>
            <div style={{
              background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
              borderRadius: 10, padding: '12px 16px',
              display: 'flex', gap: 5, alignItems: 'center',
            }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)',
                  animation: `pulse 1.2s infinite ease-in-out ${i * 0.15}s`,
                }} />
              ))}
              <span style={{ marginLeft: 8, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Analiz ediliyor...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <ChatInput onSend={handleSend} loading={loading} />

      <style>{`
        @keyframes pulse {
          0%, 80%, 100% { transform: scale(0.5); opacity: 0.3; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
