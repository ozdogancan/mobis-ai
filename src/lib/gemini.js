const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY

// Simple delay
const wait = (ms) => new Promise(r => setTimeout(r, ms))

export async function getAIInsight(dataContext, userQuery) {
  if (!GEMINI_API_KEY) return null

  const prompt = `Sen Mobis AI asistanısın. PM Aktif sipariş analizi yap. Türkçe, kısa, aksiyonel yanıtla. Sadece JSON döndür, başka bir şey yazma.

VERİ:
${dataContext}

SORU: ${userQuery}

SADECE bu JSON formatında yanıt ver:
{"summary":"2-3 cümle cevap","insights":[{"type":"warning","title":"başlık","description":"detay ve aksiyon"}]}
Type: critical, warning, success, info veya recommendation olabilir.`

  // Retry logic for rate limits
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.2, maxOutputTokens: 1024 }
          })
        }
      )

      // Rate limit - wait and retry
      if (response.status === 429) {
        console.warn(`Gemini rate limit (attempt ${attempt + 1}/3), waiting...`)
        await wait(2000 * (attempt + 1)) // 2s, 4s, 6s
        continue
      }

      if (!response.ok) {
        console.error('Gemini status:', response.status)
        return null
      }

      const data = await response.json()
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text
      if (!text) return null

      const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      return JSON.parse(cleaned)
    } catch (err) {
      console.error(`Gemini error (attempt ${attempt + 1}):`, err)
      if (attempt < 2) await wait(1500)
    }
  }

  return null
}

// SUPER COMPACT context - under 800 tokens
export function prepareDataContext(orders) {
  const n = orders.length
  const uq = [...new Set(orders.map(o => o.pma_siparis_kodu))].length
  const brut = Math.round(orders.reduce((s, o) => s + (Number(o.son_brut_ciro) || 0), 0))
  const ind = Math.round(orders.reduce((s, o) => s + (Number(o.son_indirim_tutari) || 0), 0))

  // Counts
  const onay = {}, kars = {}
  orders.forEach(o => {
    onay[o.onay_durumu || '?'] = (onay[o.onay_durumu || '?'] || 0) + 1
    kars[o.karsilanma_durumu || '?'] = (kars[o.karsilanma_durumu || '?'] || 0) + 1
  })

  // Top 5 bayi + kategori
  const bm = {}, km = {}
  orders.forEach(o => {
    const b = o.bayi||'?'; bm[b] = (bm[b]||0) + (Number(o.son_brut_ciro)||0)
    const k = o.kategori||'?'; km[k] = (km[k]||0) + (Number(o.son_brut_ciro)||0)
  })
  const top = (m) => Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([k,v])=>`${k}:${Math.round(v)}`).join(', ')

  const iptal = orders.filter(o => o.onay_durumu === 'Otomatik İptal').length
  const red = orders.filter(o => o.onay_durumu === 'Reddedildi').length
  const teslim = orders.filter(o => o.teslim_suresi_gun != null)
  const ort = teslim.length ? (teslim.reduce((s,o)=>s+o.teslim_suresi_gun,0)/teslim.length).toFixed(1) : '?'

  return `Ocak2026: ${uq}sipariş ${n}kalem brüt:${brut} indirim:${ind}(%${brut>0?((ind/brut)*100).toFixed(0):0}) ${Object.keys(bm).length}bayi ort.teslim:${ort}gün
Onay:${Object.entries(onay).map(([k,v])=>`${k}=${v}`).join(' ')}
Karşılanma:${Object.entries(kars).map(([k,v])=>`${k}=${v}`).join(' ')}
İptal:${iptal} Red:${red}
Top5Bayi(brüt):${top(bm)}
Top5Kategori(brüt):${top(km)}`
}
