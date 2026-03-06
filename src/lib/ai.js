const CLAUDE_API_KEY = import.meta.env.VITE_CLAUDE_API_KEY

const TABLE_SCHEMA = `Tablo: pm_aktif_orders (PostgreSQL / Supabase)
Kolonlar:
- id (bigint, PK)
- ay (text) -- dönem, örn: '2026-01'
- pma_siparis_kodu (text) -- benzersiz sipariş kodu
- siparis_tarihi (timestamptz) -- sipariş tarihi
- bayi (text) -- bayi adı
- tabela (text) -- tabela/mağaza adı
- plasiyer (text) -- satış temsilcisi
- satis_yoneticisi (text) -- satış yöneticisi
- bolge_muduru (text) -- bölge müdürü
- ds_product_no (text) -- ürün kodu
- ds_product (text) -- ürün adı
- kategori (text) -- ana kategori (örn: ÇİKOLATA, GOFRET)
- alt_kategori (text) -- alt kategori
- detay_kategori (text) -- detay kategori
- marka (text) -- marka adı
- marka_aciklama (text) -- marka açıklaması
- birim (text) -- ölçü birimi
- orjinal_miktar (int) -- ilk sipariş miktarı
- orjinal_birim_fiyat (numeric) -- ilk birim fiyat
- son_miktar (int) -- son/onaylanan miktar
- son_birim_fiyat (numeric) -- son birim fiyat
- son_brut_ciro (numeric) -- brüt ciro (indirim öncesi)
- son_indirim_tutari (numeric) -- indirim tutarı
- son_net_ciro (numeric) -- net ciro (indirim sonrası)
- odeme_tipi (text) -- ödeme tipi
- vade_gunu (text) -- vade günü
- onay_durumu (text) -- 'Onaylandı', 'Otomatik İptal', 'Reddedildi'
- onay_tipi (text) -- onay tipi
- onay_zamani (timestamptz) -- onaylanma zamanı
- karsilanma_durumu (text) -- 'Tam karşılanan sipariş', 'Eksik karşılanan sipariş', 'Karşılanamayan sipariş'
- teslim_durumu (text) -- teslim durumu
- teslim_suresi_gun (int) -- onaydan teslimata kaç gün
- teslim_tarihi (timestamptz) -- teslim tarihi
- plasiyer_cevap_suresi_gun (int) -- plasiyerin kaç günde cevap verdiği

ÖNEMLİ NOT: Tüm veriler ay='2026-01' dönemine ait.`

export async function generateSQL(userQuery) {
  if (!CLAUDE_API_KEY) return null

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: `Sen bir SQL asistanısın. Aşağıdaki PostgreSQL tablosu için kullanıcının sorusuna uygun SQL sorgusu yaz.

${TABLE_SCHEMA}

KURALLAR:
1. SADECE SELECT sorgusu yaz (INSERT/UPDATE/DELETE YASAK)
2. Her zaman WHERE ay = '2026-01' filtresi ekle
3. Sonuçları anlamlı şekilde sırala (ORDER BY)
4. Limit kullan (max 50 satır)
5. Türkçe alias kullan (AS "Bayi Adı" gibi)
6. Aggregation yap: SUM, COUNT, AVG, GROUP BY kullan
7. Sayısal değerleri ROUND ile yuvarla

SADECE JSON döndür, başka bir şey yazma:
{"sql": "SELECT ...", "explanation": "Bu sorgu şunu yapıyor: ..."}

KULLANICI SORUSU: "${userQuery}"`
        }],
      })
    })

    if (!response.ok) {
      console.error('Claude API status:', response.status)
      return null
    }

    const data = await response.json()
    const text = data.content?.[0]?.text
    if (!text) return null

    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return JSON.parse(cleaned)
  } catch (err) {
    console.error('Claude SQL error:', err)
    return null
  }
}

export async function interpretResults(userQuery, sqlResult, sql) {
  if (!CLAUDE_API_KEY) return null

  try {
    const dataStr = JSON.stringify(sqlResult.slice(0, 30)) // max 30 rows to keep context short

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: `Sen Mobis AI asistanısın. PM Aktif sipariş verilerini analiz ediyorsun.

Kullanıcı sorusu: "${userQuery}"
Çalıştırılan SQL: ${sql}
Sonuç (${sqlResult.length} satır): ${dataStr}

SADECE JSON döndür:
{
  "summary": "2-3 cümle Türkçe özet ve yorum",
  "insights": [
    {"type": "success|warning|critical|info|recommendation|action", "title": "kısa başlık", "description": "detay ve aksiyon önerisi", "action": "opsiyonel aksiyon butonu metni"}
  ],
  "chartType": "bar|donut|area|none",
  "chartTitle": "grafik başlığı",
  "chartData": [{"name": "etiket", "value": 123}]
}

KURALLAR:
1. Türkçe yanıtla
2. Sayıları Türk formatında yaz
3. Her zaman en az 1 aksiyon önerisi ver
4. Veri yoksa bunu belirt`
        }],
      })
    })

    if (!response.ok) return null
    const data = await response.json()
    const text = data.content?.[0]?.text
    if (!text) return null
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return JSON.parse(cleaned)
  } catch (err) {
    console.error('Claude interpret error:', err)
    return null
  }
}
