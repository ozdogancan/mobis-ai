import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { LogOut, Bot, User, BarChart3 } from 'lucide-react'
import ChatInput from '../components/ChatInput'
import KpiGrid from '../components/KpiGrid'
import InsightCard from '../components/InsightCard'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#64748b']

// ============================================================
// DATA ANALYSIS ENGINE (runs on Supabase data, no AI API needed)
// ============================================================
function analyzeData(orders, query) {
  const q = query.toLowerCase()

  const totalOrders = [...new Set(orders.map(o => o.pma_siparis_kodu))].length
  const totalRows = orders.length
  const totalBrut = orders.reduce((s, o) => s + (Number(o.son_brut_ciro) || 0), 0)
  const totalIndirim = orders.reduce((s, o) => s + (Number(o.son_indirim_tutari) || 0), 0)
  const totalNet = orders.reduce((s, o) => s + (Number(o.son_net_ciro) || 0), 0)

  // Bayi analysis
  const bayiMap = {}
  orders.forEach(o => {
    if (!bayiMap[o.bayi]) bayiMap[o.bayi] = { count: 0, brut: 0, iptal: 0 }
    bayiMap[o.bayi].count++
    bayiMap[o.bayi].brut += Number(o.son_brut_ciro) || 0
    if (o.onay_durumu === 'Otomatik İptal') bayiMap[o.bayi].iptal++
  })

  // Kategori analysis
  const kategoriMap = {}
  orders.forEach(o => {
    if (!kategoriMap[o.kategori]) kategoriMap[o.kategori] = { count: 0, brut: 0 }
    kategoriMap[o.kategori].count++
    kategoriMap[o.kategori].brut += Number(o.son_brut_ciro) || 0
  })

  // Karsilanma analysis
  const karsilanmaMap = {}
  orders.forEach(o => {
    const k = o.karsilanma_durumu || 'Bilinmiyor'
    if (!karsilanmaMap[k]) karsilanmaMap[k] = 0
    karsilanmaMap[k]++
  })

  // Onay durumu
  const onayMap = {}
  orders.forEach(o => {
    const k = o.onay_durumu || 'Bilinmiyor'
    if (!onayMap[k]) onayMap[k] = 0
    onayMap[k]++
  })

  // Teslim süresi
  const teslimOrders = orders.filter(o => o.teslim_suresi_gun != null)
  const avgTeslim = teslimOrders.length > 0
    ? (teslimOrders.reduce((s, o) => s + o.teslim_suresi_gun, 0) / teslimOrders.length).toFixed(1)
    : 'N/A'

  // Otomatik iptal
  const iptalOrders = orders.filter(o => o.onay_durumu === 'Otomatik İptal')
  const iptalCount = [...new Set(iptalOrders.map(o => o.pma_siparis_kodu))].length

  // Active bayis
  const activeBayis = Object.keys(bayiMap).length

  const formatCurrency = (val) => {
    if (val >= 1e9) return (val / 1e9).toFixed(1) + 'B ₺'
    if (val >= 1e6) return (val / 1e6).toFixed(1) + 'M ₺'
    if (val >= 1e3) return (val / 1e3).toFixed(1) + 'K ₺'
    return val.toFixed(0) + ' ₺'
  }

  // Build response based on query
  const result = { kpis: [], insights: [], charts: [] }

  // === DEFAULT / GENEL RAPOR ===
  if (q.includes('rapor') || q.includes('özet') || q.includes('göster') || q.includes('genel')) {
    const tamKarsilanan = karsilanmaMap['Tam karşılanan sipariş'] || 0
    const tamOran = totalRows > 0 ? ((tamKarsilanan / totalRows) * 100).toFixed(1) : 0

    result.kpis = [
      { label: 'Toplam Sipariş', value: totalOrders.toLocaleString('tr-TR'), sub: `${totalRows.toLocaleString('tr-TR')} kalem`, icon: 'orders', color: '#6366f1' },
      { label: 'Brüt Ciro', value: formatCurrency(totalBrut), sub: 'Satır bazlı toplam', icon: 'revenue', color: '#22c55e' },
      { label: 'Toplam İndirim', value: formatCurrency(totalIndirim), sub: `Brüte oran: %${totalBrut > 0 ? ((totalIndirim / totalBrut) * 100).toFixed(1) : 0}`, icon: 'decline', color: '#f59e0b' },
      { label: 'Aktif Bayi', value: activeBayis.toString(), sub: `${[...new Set(orders.map(o => o.plasiyer))].length} plasiyer`, icon: 'dealers', color: '#06b6d4' },
      { label: 'Tam Karşılanma', value: `%${tamOran}`, sub: `${tamKarsilanan.toLocaleString('tr-TR')} kalem`, icon: 'success', color: '#22c55e' },
      { label: 'Ort. Teslim Süresi', value: `${avgTeslim} gün`, sub: 'Teslim edilen siparişler', icon: 'delivery', color: '#6366f1' },
      { label: 'Otomatik İptal', value: iptalCount.toString(), sub: `${iptalOrders.length} kalem`, icon: 'cancel', color: '#ef4444' },
    ]

    // Kategori chart
    const kategoriData = Object.entries(kategoriMap)
      .sort((a, b) => b[1].brut - a[1].brut)
      .slice(0, 8)
      .map(([name, data]) => ({ name: name.length > 15 ? name.slice(0, 15) + '…' : name, value: data.brut }))

    result.charts.push({
      type: 'bar',
      title: 'Kategori Bazlı Brüt Ciro',
      data: kategoriData,
    })

    // Onay durumu pie
    const onayData = Object.entries(onayMap).map(([name, value]) => ({ name, value }))
    result.charts.push({
      type: 'pie',
      title: 'Onay Durumu Dağılımı',
      data: onayData,
    })

    // Insights
    result.insights.push({
      type: tamOran >= 75 ? 'success' : 'warning',
      title: `Tam karşılanma oranı %${tamOran}`,
      description: tamOran >= 75
        ? 'Karşılanma oranı güçlü seviyede. Stok yönetimi genel olarak başarılı.'
        : `Her ${Math.round(100 / (100 - tamOran))} siparişten 1'i tam karşılanamıyor. Stok optimizasyonu gerekebilir.`,
    })

    if (iptalCount > 0) {
      const topIptalBayi = Object.entries(bayiMap)
        .filter(([_, d]) => d.iptal > 0)
        .sort((a, b) => b[1].iptal - a[1].iptal)
        .slice(0, 3)
        .map(([name, d]) => `${name} (${d.iptal})`)
        .join(', ')

      result.insights.push({
        type: 'critical',
        title: `Otomatik İptal: ${iptalCount} sipariş`,
        description: `Plasiyerlerin 8 gün içinde onaylamaması nedeniyle iptal edilen siparişler. En çok iptal: ${topIptalBayi}`,
      })
    }

    // Top bayi insight
    const topBayi = Object.entries(bayiMap).sort((a, b) => b[1].brut - a[1].brut).slice(0, 3)
    result.insights.push({
      type: 'info',
      title: 'En Yüksek Cirolu Bayiler',
      description: topBayi.map(([name, d]) => `${name}: ${formatCurrency(d.brut)}`).join(' | '),
    })
  }

  // === OTOMATİK İPTAL ANALİZİ ===
  else if (q.includes('iptal')) {
    const iptalBayiMap = {}
    iptalOrders.forEach(o => {
      if (!iptalBayiMap[o.bayi]) iptalBayiMap[o.bayi] = { count: 0, brut: 0 }
      iptalBayiMap[o.bayi].count++
      iptalBayiMap[o.bayi].brut += Number(o.son_brut_ciro) || 0
    })

    const iptalBayiData = Object.entries(iptalBayiMap)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([name, data]) => ({ name: name.length > 20 ? name.slice(0, 20) + '…' : name, value: data.count }))

    result.kpis = [
      { label: 'Toplam Otomatik İptal', value: iptalCount.toString(), sub: `${iptalOrders.length} kalem`, icon: 'cancel', color: '#ef4444' },
      { label: 'Kayıp Ciro', value: formatCurrency(iptalOrders.reduce((s, o) => s + (Number(o.son_brut_ciro) || 0), 0)), sub: 'İptal edilen siparişlerin brüt tutarı', icon: 'decline', color: '#ef4444' },
      { label: 'Etkilenen Bayi', value: Object.keys(iptalBayiMap).length.toString(), sub: 'İptali olan bayi sayısı', icon: 'dealers', color: '#f59e0b' },
    ]

    result.charts.push({
      type: 'bar',
      title: 'Bayi Bazlı Otomatik İptal Sayısı',
      data: iptalBayiData,
    })

    Object.entries(iptalBayiMap)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 3)
      .forEach(([name, data]) => {
        result.insights.push({
          type: 'critical',
          title: `${name}`,
          description: `${data.count} kalem iptal — ${formatCurrency(data.brut)} kayıp ciro. Plasiyer uyarı mekanizması önerilir.`,
        })
      })

    result.insights.push({
      type: 'recommendation',
      title: 'Öneri: Otomatik Onay Süresi',
      description: 'Kronik iptal olan bayilerde otomatik onay süresinin 8 günden 12 güne çıkarılması veya plasiyer bazında push notification sistemi kurulması değerlendirilmeli.',
    })
  }

  // === BAYİ PERFORMANSI ===
  else if (q.includes('bayi') || q.includes('karşılaştır') || q.includes('performans')) {
    const bayiData = Object.entries(bayiMap)
      .sort((a, b) => b[1].brut - a[1].brut)
      .slice(0, 10)
      .map(([name, data]) => ({ name: name.length > 20 ? name.slice(0, 20) + '…' : name, value: data.brut }))

    result.kpis = [
      { label: 'Toplam Bayi', value: activeBayis.toString(), icon: 'dealers', color: '#6366f1' },
      { label: 'En Yüksek Ciro', value: formatCurrency(bayiData[0]?.value || 0), sub: bayiData[0]?.name || '', icon: 'revenue', color: '#22c55e' },
    ]

    result.charts.push({
      type: 'bar',
      title: 'Bayi Bazlı Brüt Ciro (Top 10)',
      data: bayiData,
    })

    result.insights.push({
      type: 'info',
      title: 'Bayi Performans Özeti',
      description: `${activeBayis} aktif bayi arasında ciro dağılımı incelendi. En yüksek cirolu bayi: ${bayiData[0]?.name || 'N/A'}`,
    })
  }

  // === KATEGORİ ANALİZİ ===
  else if (q.includes('kategori') || q.includes('dağılım') || q.includes('ürün')) {
    const kategoriData = Object.entries(kategoriMap)
      .sort((a, b) => b[1].brut - a[1].brut)
      .map(([name, data]) => ({ name: name.length > 18 ? name.slice(0, 18) + '…' : name, value: data.brut }))

    const topKategoriler = kategoriData.slice(0, 5)
    const topTotal = topKategoriler.reduce((s, k) => s + k.value, 0)
    const topOran = totalBrut > 0 ? ((topTotal / totalBrut) * 100).toFixed(1) : 0

    result.kpis = [
      { label: 'Kategori Sayısı', value: kategoriData.length.toString(), icon: 'orders', color: '#6366f1' },
      { label: 'Top 5 Kategori Payı', value: `%${topOran}`, sub: 'Toplam ciro içindeki pay', icon: 'revenue', color: '#22c55e' },
    ]

    result.charts.push({
      type: 'pie',
      title: 'Kategori Bazlı Ciro Dağılımı',
      data: kategoriData.slice(0, 8),
    })

    result.insights.push({
      type: topOran > 85 ? 'warning' : 'info',
      title: `Top 5 kategori toplam cironun %${topOran}'ini oluşturuyor`,
      description: topOran > 85
        ? 'Yüksek konsantrasyon riski. Portföy çeşitlendirmesi düşünülebilir.'
        : 'Dengeli bir kategori dağılımı mevcut.',
    })
  }

  // === FALLBACK ===
  else {
    result.insights.push({
      type: 'info',
      title: 'Sorgunuz işlendi',
      description: 'Şu komutları deneyebilirsiniz: "PM Aktif raporu göster", "Otomatik iptal analizi", "Bayi performansı", "Kategori dağılımı"',
    })
  }

  return result
}

// ============================================================
// CHART RENDERERS
// ============================================================
function ChartRenderer({ chart }) {
  if (chart.type === 'bar') {
    return (
      <div style={{
        background: '#12141c',
        borderRadius: '12px',
        padding: '20px',
        border: '1px solid #252840',
      }}>
        <h4 style={{ fontSize: '0.85rem', color: '#8b8fa3', marginBottom: '16px', fontWeight: '500' }}>
          {chart.title}
        </h4>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chart.data} layout="vertical" margin={{ left: 10, right: 20 }}>
            <XAxis type="number" tick={{ fill: '#5c6078', fontSize: 11 }}
              tickFormatter={(v) => v >= 1e6 ? (v/1e6).toFixed(1)+'M' : v >= 1e3 ? (v/1e3).toFixed(0)+'K' : v} />
            <YAxis type="category" dataKey="name" width={120}
              tick={{ fill: '#8b8fa3', fontSize: 11 }} />
            <Tooltip
              contentStyle={{ background: '#171923', border: '1px solid #252840', borderRadius: '8px', fontFamily: 'Outfit' }}
              labelStyle={{ color: '#e8e9ed' }}
              formatter={(v) => [v.toLocaleString('tr-TR'), 'Değer']}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {chart.data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    )
  }

  if (chart.type === 'pie') {
    return (
      <div style={{
        background: '#12141c',
        borderRadius: '12px',
        padding: '20px',
        border: '1px solid #252840',
      }}>
        <h4 style={{ fontSize: '0.85rem', color: '#8b8fa3', marginBottom: '16px', fontWeight: '500' }}>
          {chart.title}
        </h4>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie data={chart.data} dataKey="value" nameKey="name" cx="50%" cy="50%"
              outerRadius={90} innerRadius={50} paddingAngle={2}>
              {chart.data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ background: '#171923', border: '1px solid #252840', borderRadius: '8px', fontFamily: 'Outfit' }}
              formatter={(v) => [v.toLocaleString('tr-TR'), 'Adet']}
            />
          </PieChart>
        </ResponsiveContainer>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px', justifyContent: 'center' }}>
          {chart.data.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', color: '#8b8fa3' }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: COLORS[i % COLORS.length] }} />
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
// MAIN DASHBOARD
// ============================================================
export default function Dashboard({ session }) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (query) => {
    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: query }])
    setLoading(true)

    try {
      // Fetch data from Supabase
      const { data: orders, error } = await supabase
        .from('pm_aktif_orders')
        .select('*')
        .eq('ay', '2026-01')

      if (error) throw error

      if (!orders || orders.length === 0) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: { insights: [{ type: 'warning', title: 'Veri bulunamadı', description: 'Seçilen dönem için veri mevcut değil. Test verisinin yüklendiğinden emin olun.' }] }
        }])
        setLoading(false)
        return
      }

      // Analyze
      const result = analyzeData(orders, query)

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: result,
      }])
    } catch (err) {
      console.error(err)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: { insights: [{ type: 'critical', title: 'Hata', description: `Veri çekilirken hata oluştu: ${err.message}` }] }
      }])
    }

    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0b0f',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 24px',
        borderBottom: '1px solid #252840',
        background: '#12141c',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #6366f1, #7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '16px', fontWeight: '700', color: '#fff',
          }}>M</div>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: '600', color: '#e8e9ed' }}>Mobis AI</div>
            <div style={{ fontSize: '0.72rem', color: '#5c6078' }}>PM Aktif Analiz</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '0.82rem', color: '#5c6078' }}>
            {session.user.email}
          </span>
          <button
            onClick={handleLogout}
            style={{
              padding: '8px 14px', background: '#171923', border: '1px solid #252840',
              borderRadius: '8px', color: '#8b8fa3', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem',
              fontFamily: 'Outfit, sans-serif',
            }}
          >
            <LogOut size={14} />
            Çıkış
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main style={{
        flex: 1,
        maxWidth: '900px',
        width: '100%',
        margin: '0 auto',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Empty State */}
        {messages.length === 0 && (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            gap: '16px',
            padding: '40px 0',
          }}>
            <div style={{
              width: '72px', height: '72px', borderRadius: '20px',
              background: 'linear-gradient(135deg, #6366f120, #7c3aed20)',
              border: '1px solid #6366f130',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <BarChart3 size={32} color="#6366f1" />
            </div>
            <h2 style={{
              fontSize: '1.5rem', fontWeight: '600', color: '#e8e9ed',
              letterSpacing: '-0.02em',
            }}>
              PM Aktif Analiz Merkezi
            </h2>
            <p style={{
              fontSize: '0.92rem', color: '#5c6078', maxWidth: '440px', lineHeight: '1.6',
            }}>
              Sipariş verilerini sorgulayın, AI destekli insight'lar alın.
              Aşağıdaki hızlı komutlardan birini seçin veya kendi sorunuzu yazın.
            </p>
          </div>
        )}

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', marginBottom: '20px' }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ marginBottom: '20px' }}>
              {msg.role === 'user' ? (
                <div style={{
                  display: 'flex', gap: '10px', alignItems: 'flex-start',
                  justifyContent: 'flex-end',
                }}>
                  <div style={{
                    background: '#6366f120', border: '1px solid #6366f140',
                    borderRadius: '12px 12px 2px 12px',
                    padding: '12px 16px', maxWidth: '70%',
                    fontSize: '0.92rem', color: '#c7d2fe',
                  }}>
                    {msg.content}
                  </div>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: '#6366f130', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <User size={16} color="#818cf8" />
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: 'linear-gradient(135deg, #6366f130, #7c3aed30)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Bot size={16} color="#818cf8" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* KPIs */}
                    {msg.content.kpis && <KpiGrid data={msg.content.kpis} />}

                    {/* Charts */}
                    {msg.content.charts && msg.content.charts.length > 0 && (
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: msg.content.charts.length > 1 ? '1fr 1fr' : '1fr',
                        gap: '12px',
                        marginBottom: '16px',
                      }}>
                        {msg.content.charts.map((chart, ci) => (
                          <ChartRenderer key={ci} chart={chart} />
                        ))}
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

          {/* Loading */}
          {loading && (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'linear-gradient(135deg, #6366f130, #7c3aed30)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Bot size={16} color="#818cf8" />
              </div>
              <div style={{
                background: '#171923', border: '1px solid #252840',
                borderRadius: '12px', padding: '16px 20px',
                display: 'flex', gap: '6px', alignItems: 'center',
              }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366f1', animation: 'pulse 1.4s infinite ease-in-out' }} />
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366f1', animation: 'pulse 1.4s infinite ease-in-out 0.2s' }} />
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366f1', animation: 'pulse 1.4s infinite ease-in-out 0.4s' }} />
                <span style={{ marginLeft: '8px', fontSize: '0.85rem', color: '#5c6078' }}>Analiz ediliyor...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div style={{ position: 'sticky', bottom: '20px' }}>
          <ChatInput onSend={handleSend} loading={loading} showQuickActions={messages.length === 0} />
        </div>
      </main>

      <style>{`
        @keyframes pulse {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
