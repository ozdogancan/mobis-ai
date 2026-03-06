const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY

export async function getAIInsight(dataContext, userQuery) {
  if (!GEMINI_API_KEY) {
    return null
  }

  const systemPrompt = `Sen "Mobis AI" asistanısın. Yıldız Holding'in PM Aktif (online sipariş) sistemi için yöneticilere veri analizi yapıyorsun.

VERİ SÖZLÜĞÜ:
- PM Aktif: Bayilerin plasiyerler aracılığıyla online sipariş verdiği sistem
- Kalem = sipariş satırı (bir siparişte birden fazla ürün/kalem olabilir)
- Onay durumları: "Onaylandı", "Otomatik İptal" (plasiyer 8 gün onaylamazsa sistem iptal eder), "Reddedildi"  
- Karşılanma: "Tam karşılanan sipariş", "Eksik karşılanan sipariş" (stok yetersiz), "Karşılanamayan sipariş"
- Teslim süresi: Sipariş onayından teslimata kadar geçen gün sayısı
- Brüt ciro: İndirim öncesi tutar
- Net ciro: İndirim sonrası tutar
- "Kaçan sipariş" = Otomatik iptal + Reddedilen + Eksik karşılanan siparişler (potansiyel kayıp ciro)

KURALLAR:
1. SADECE Türkçe yanıtla
2. Sayıları Türk formatında yaz (1.234,5 şeklinde)  
3. Kısa, net ve aksiyonel ol
4. Her insight sonunda somut aksiyon önerisi ver
5. Kullanıcının sorusunu ne olursa olsun anlamaya çalış ve veri özetinden yanıtla
6. Bilmediğin veya veride olmayan şeyleri uydurmak yerine "bu veri mevcut değil" de

YANIT FORMATI (kesinlikle sadece JSON döndür, başka hiçbir şey yazma):
{
  "summary": "Kullanıcının sorusuna 2-3 cümlelik direkt cevap",
  "insights": [
    {"type": "critical|warning|success|info|recommendation", "title": "kısa başlık", "description": "detay ve aksiyon önerisi"}
  ]
}`

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `${systemPrompt}\n\nKULLANICI SORUSU: "${userQuery}"\n\nVERİ ÖZETİ:\n${dataContext}\n\nYukarıdaki veri özetini kullanarak kullanıcının sorusunu yanıtla. SADECE JSON formatında yanıt ver, başka hiçbir şey yazma.`
            }]
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2048,
          }
        })
      }
    )

    if (response.status === 429) {
      console.warn('Gemini rate limit - falling back to rule-based')
      return null
    }

    if (!response.ok) {
      console.error('Gemini API status:', response.status)
      return null
    }

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text

    if (!text) return null

    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return JSON.parse(cleaned)
  } catch (err) {
    console.error('Gemini API error:', err)
    return null
  }
}

export function prepareDataContext(orders, query) {
  const totalRows = orders.length
  const uniqueOrders = [...new Set(orders.map(o => o.pma_siparis_kodu))].length
  const totalBrut = orders.reduce((s, o) => s + (Number(o.son_brut_ciro) || 0), 0)
  const totalIndirim = orders.reduce((s, o) => s + (Number(o.son_indirim_tutari) || 0), 0)

  const bayiMap = {}
  orders.forEach(o => {
    if (!bayiMap[o.bayi]) bayiMap[o.bayi] = { kalem: 0, brut: 0, iptal: 0, eksik: 0, reddedilen: 0 }
    bayiMap[o.bayi].kalem++
    bayiMap[o.bayi].brut += Number(o.son_brut_ciro) || 0
    if (o.onay_durumu === 'Otomatik İptal') bayiMap[o.bayi].iptal++
    if (o.onay_durumu === 'Reddedildi') bayiMap[o.bayi].reddedilen++
    if (o.karsilanma_durumu?.includes('Eksik')) bayiMap[o.bayi].eksik++
  })

  const kategoriMap = {}
  orders.forEach(o => {
    if (!kategoriMap[o.kategori]) kategoriMap[o.kategori] = { kalem: 0, brut: 0 }
    kategoriMap[o.kategori].kalem++
    kategoriMap[o.kategori].brut += Number(o.son_brut_ciro) || 0
  })

  const markaMap = {}
  orders.forEach(o => {
    if (!markaMap[o.marka]) markaMap[o.marka] = { kalem: 0, brut: 0 }
    markaMap[o.marka].kalem++
    markaMap[o.marka].brut += Number(o.son_brut_ciro) || 0
  })

  const onayMap = {}
  orders.forEach(o => {
    const k = o.onay_durumu || 'Bilinmiyor'
    if (!onayMap[k]) onayMap[k] = 0
    onayMap[k]++
  })

  const karsilanmaMap = {}
  orders.forEach(o => {
    const k = o.karsilanma_durumu || 'Bilinmiyor'
    if (!karsilanmaMap[k]) karsilanmaMap[k] = 0
    karsilanmaMap[k]++
  })

  const odemeMap = {}
  orders.forEach(o => {
    const k = o.odeme_tipi || 'Bilinmiyor'
    if (!odemeMap[k]) odemeMap[k] = 0
    odemeMap[k]++
  })

  const teslimOrders = orders.filter(o => o.teslim_suresi_gun != null)
  const avgTeslim = teslimOrders.length > 0
    ? (teslimOrders.reduce((s, o) => s + o.teslim_suresi_gun, 0) / teslimOrders.length).toFixed(1)
    : 'N/A'
  const gecikmeliTeslim = teslimOrders.filter(o => o.teslim_suresi_gun >= 5).length

  const iptalKalem = orders.filter(o => o.onay_durumu === 'Otomatik İptal').length
  const reddedilenKalem = orders.filter(o => o.onay_durumu === 'Reddedildi').length
  const eksikKalem = orders.filter(o => o.karsilanma_durumu?.includes('Eksik')).length
  const kacanBrut = orders
    .filter(o => o.onay_durumu === 'Otomatik İptal' || o.onay_durumu === 'Reddedildi')
    .reduce((s, o) => s + (Number(o.son_brut_ciro) || 0), 0)

  const plasiyerSayisi = [...new Set(orders.map(o => o.plasiyer))].length

  const topBayiler = Object.entries(bayiMap)
    .sort((a, b) => b[1].brut - a[1].brut)
    .slice(0, 15)
    .map(([name, d]) => `${name}: ${d.kalem} kalem, brüt ${d.brut}, iptal ${d.iptal}, eksik ${d.eksik}, red ${d.reddedilen}`)
    .join('\n')

  const topIptalBayiler = Object.entries(bayiMap)
    .filter(([_, d]) => d.iptal > 0)
    .sort((a, b) => b[1].iptal - a[1].iptal)
    .slice(0, 10)
    .map(([name, d]) => `${name}: ${d.iptal} iptal kalem, brüt ${d.brut}`)
    .join('\n')

  const topKategoriler = Object.entries(kategoriMap)
    .sort((a, b) => b[1].brut - a[1].brut)
    .slice(0, 10)
    .map(([name, d]) => `${name}: ${d.kalem} kalem, brüt ${d.brut}`)
    .join('\n')

  const topMarkalar = Object.entries(markaMap)
    .sort((a, b) => b[1].brut - a[1].brut)
    .slice(0, 10)
    .map(([name, d]) => `${name}: ${d.kalem} kalem, brüt ${d.brut}`)
    .join('\n')

  return `DÖNEM: Ocak 2026 (7-31 Ocak)

GENEL ÖZET:
- Toplam benzersiz sipariş: ${uniqueOrders}
- Toplam kalem (satır): ${totalRows}
- Brüt ciro toplamı: ${totalBrut}
- Toplam indirim: ${totalIndirim} (oran: %${totalBrut > 0 ? ((totalIndirim/totalBrut)*100).toFixed(1) : 0})
- Aktif bayi sayısı: ${Object.keys(bayiMap).length}
- Aktif plasiyer sayısı: ${plasiyerSayisi}
- Ortalama teslim süresi: ${avgTeslim} gün
- 5+ gün gecikme ile teslim: ${gecikmeliTeslim} kalem

KAÇAN SİPARİŞLER (potansiyel kayıp):
- Otomatik iptal: ${iptalKalem} kalem
- Reddedilen: ${reddedilenKalem} kalem
- Eksik karşılanan: ${eksikKalem} kalem
- İptal + red kayıp brüt ciro: ${kacanBrut}

ONAY DURUMU DAĞILIMI:
${Object.entries(onayMap).map(([k,v]) => `- ${k}: ${v} kalem`).join('\n')}

KARŞILANMA DURUMU:
${Object.entries(karsilanmaMap).map(([k,v]) => `- ${k}: ${v} kalem`).join('\n')}

ÖDEME TİPİ:
${Object.entries(odemeMap).map(([k,v]) => `- ${k}: ${v} kalem`).join('\n')}

TOP 15 BAYİ (Brüt Ciroya Göre):
${topBayiler}

EN ÇOK İPTAL OLAN BAYİLER:
${topIptalBayiler || 'İptal olan bayi yok'}

TOP 10 KATEGORİ (Brüt Ciroya Göre):
${topKategoriler}

TOP 10 MARKA (Brüt Ciroya Göre):
${topMarkalar}`
}
