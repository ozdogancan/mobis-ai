import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Bot, ArrowLeft, ShoppingCart, Send, Menu, Calendar, TrendingUp, TrendingDown } from 'lucide-react'
import KpiGrid from '../components/KpiGrid'
import InsightCard from '../components/InsightCard'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend, AreaChart, Area } from 'recharts'

const COLORS = ['#0d9264', '#0891b2', '#7c3aed', '#d97706', '#dc2626', '#2563eb', '#ec4899', '#64748b']
const tooltipStyle = { background: '#fff', border: '1px solid #e2e4e9', borderRadius: 8, fontFamily: 'DM Sans', fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }

const SMART_CHIPS = [
  { id: 'rapor', label: '📊 Genel Rapor', prompt: 'PM Aktif genel rapor ve özet göster' },
  { id: 'iptal', label: '❌ İptaller', prompt: 'Otomatik iptal edilen siparişleri analiz et' },
  { id: 'bayi', label: '🏪 Bayiler', prompt: 'Bayi bazlı performans karşılaştırması yap' },
  { id: 'kategori', label: '📦 Kategoriler', prompt: 'Kategori bazlı ciro dağılımını göster' },
  { id: 'trend', label: '📈 Günlük Trend', prompt: 'Günlük sipariş ve ciro trendini göster' },
]

// ============================================================
// DATE PARSER
// ============================================================
function parseDateFilter(query) {
  const q = query.toLowerCase()
  const months = {'ocak':'01','şubat':'02','mart':'03','nisan':'04','mayıs':'05','haziran':'06','temmuz':'07','ağustos':'08','eylül':'09','ekim':'10','kasım':'11','aralık':'12'}
  const singleDay = q.match(/(?:sadece\s+)?(\d{1,2})\s+(ocak|şubat|mart|nisan|mayıs|haziran|temmuz|ağustos|eylül|ekim|kasım|aralık)/i)
  if (singleDay) {
    const day = singleDay[1].padStart(2,'0'), mon = months[singleDay[2].toLowerCase()]
    if (mon) return { type:'single', date:`2026-${mon}-${day}`, label:`${singleDay[1]} ${singleDay[2].charAt(0).toUpperCase()+singleDay[2].slice(1)} 2026` }
  }
  const range = q.match(/(\d{1,2})\s*[-–]\s*(\d{1,2})\s+(ocak|şubat|mart|nisan|mayıs|haziran|temmuz|ağustos|eylül|ekim|kasım|aralık)/i)
  if (range) {
    const d1=range[1].padStart(2,'0'), d2=range[2].padStart(2,'0'), mon=months[range[3].toLowerCase()]
    if (mon) return { type:'range', from:`2026-${mon}-${d1}`, to:`2026-${mon}-${d2}`, label:`${range[1]}-${range[2]} ${range[3].charAt(0).toUpperCase()+range[3].slice(1)} 2026` }
  }
  if (q.includes('ilk hafta')) return { type:'range', from:'2026-01-07', to:'2026-01-13', label:'İlk Hafta (7-13 Ocak)' }
  if (q.includes('son hafta')) return { type:'range', from:'2026-01-20', to:'2026-01-31', label:'Son Hafta (20-31 Ocak)' }
  return null
}

function filterOrdersByDate(orders, df) {
  if (!df) return orders
  return orders.filter(o => {
    const d = (o.siparis_tarihi||o.created_at||'').substring(0,10)
    if (df.type==='single') return d===df.date
    if (df.type==='range') return d>=df.from && d<=df.to
    return true
  })
}

// ============================================================
// SMART ANALYSIS ENGINE
// ============================================================
function analyzeData(orders, query) {
  const q = query.toLowerCase()
  const n = orders.length
  const uq = [...new Set(orders.map(o=>o.pma_siparis_kodu))].length
  const brut = orders.reduce((s,o)=>s+(Number(o.son_brut_ciro)||0),0)
  const ind = orders.reduce((s,o)=>s+(Number(o.son_indirim_tutari)||0),0)
  const indOran = brut>0?((ind/brut)*100).toFixed(1):0

  const bayiMap={}, katMap={}, onayMap={}, karsMap={}, markaMap={}, gunMap={}
  orders.forEach(o => {
    const b=o.bayi||'?'
    if(!bayiMap[b]) bayiMap[b]={k:0,brut:0,iptal:0,red:0,eksik:0}
    bayiMap[b].k++; bayiMap[b].brut+=Number(o.son_brut_ciro)||0
    if(o.onay_durumu==='Otomatik İptal') bayiMap[b].iptal++
    if(o.onay_durumu==='Reddedildi') bayiMap[b].red++
    if(o.karsilanma_durumu?.includes('Eksik')) bayiMap[b].eksik++

    const k=o.kategori||'?'
    if(!katMap[k]) katMap[k]={k:0,brut:0}
    katMap[k].k++; katMap[k].brut+=Number(o.son_brut_ciro)||0

    const m=o.marka||'?'
    if(!markaMap[m]) markaMap[m]={k:0,brut:0}
    markaMap[m].k++; markaMap[m].brut+=Number(o.son_brut_ciro)||0

    onayMap[o.onay_durumu||'?']=(onayMap[o.onay_durumu||'?']||0)+1
    karsMap[o.karsilanma_durumu||'?']=(karsMap[o.karsilanma_durumu||'?']||0)+1

    const gun=(o.siparis_tarihi||o.created_at||'').substring(0,10)
    if(gun){if(!gunMap[gun])gunMap[gun]={siparis:0,brut:0};gunMap[gun].siparis++;gunMap[gun].brut+=Number(o.son_brut_ciro)||0}
  })

  const teslim=orders.filter(o=>o.teslim_suresi_gun!=null)
  const avgTeslim=teslim.length?(teslim.reduce((s,o)=>s+o.teslim_suresi_gun,0)/teslim.length).toFixed(1):'N/A'
  const gecikme=teslim.filter(o=>o.teslim_suresi_gun>=5).length
  const iptalAll=orders.filter(o=>o.onay_durumu==='Otomatik İptal')
  const iptalUq=[...new Set(iptalAll.map(o=>o.pma_siparis_kodu))].length
  const redAll=orders.filter(o=>o.onay_durumu==='Reddedildi')
  const eksikAll=orders.filter(o=>o.karsilanma_durumu?.includes('Eksik'))
  const tam=karsMap['Tam karşılanan sipariş']||0
  const tamOran=n>0?((tam/n)*100).toFixed(1):0
  const bayiCount=Object.keys(bayiMap).length
  const plasCount=[...new Set(orders.map(o=>o.plasiyer))].length
  const kacanBrut=[...iptalAll,...redAll].reduce((s,o)=>s+(Number(o.son_brut_ciro)||0),0)

  const fmt=v=>v>=1e9?(v/1e9).toFixed(1)+'B ₺':v>=1e6?(v/1e6).toFixed(1)+'M ₺':v>=1e3?(v/1e3).toFixed(1)+'K ₺':Math.round(v).toLocaleString('tr-TR')+' ₺'
  const fN=v=>v.toLocaleString('tr-TR')

  const dates=orders.map(o=>o.siparis_tarihi||o.created_at).filter(Boolean).sort()
  const dateRange=dates.length>0?new Date(dates[0]).toLocaleDateString('tr-TR',{day:'numeric',month:'long'})+' – '+new Date(dates[dates.length-1]).toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:'numeric'}):'Ocak 2026'

  const result={kpis:[],insights:[],charts:[],dateRange}

  // ===== GÜNLÜK TREND =====
  if(q.includes('trend')||q.includes('günlük')||q.includes('günlere')) {
    const trendData=Object.entries(gunMap).sort((a,b)=>a[0].localeCompare(b[0])).map(([g,d])=>({
      gun:new Date(g).toLocaleDateString('tr-TR',{day:'numeric',month:'short'}),
      siparis:d.siparis, ciro:Math.round(d.brut)
    }))

    result.kpis=[
      {label:'Toplam Gün',value:trendData.length.toString(),sub:'Aktif sipariş günü',icon:'orders',color:'#0d9264'},
      {label:'Günlük Ort. Sipariş',value:Math.round(n/Math.max(trendData.length,1)).toString(),sub:'kalem/gün',icon:'revenue',color:'#0891b2'},
      {label:'Günlük Ort. Ciro',value:fmt(brut/Math.max(trendData.length,1)),sub:'gün başına',icon:'revenue',color:'#7c3aed'},
    ]

    result.charts.push({type:'area',title:'Günlük Sipariş Trendi',data:trendData,dataKey:'siparis',color:'#0d9264'})
    result.charts.push({type:'area',title:'Günlük Ciro Trendi (₺)',data:trendData,dataKey:'ciro',color:'#0891b2'})

    result.insights.push({type:'info',title:'Dönem: '+dateRange,description:trendData.length+' aktif gün boyunca '+fN(n)+' kalem sipariş gerçekleşmiş.'})

    if(trendData.length>=3){
      const last3=trendData.slice(-3), first3=trendData.slice(0,3)
      const avgLast=last3.reduce((s,d)=>s+d.siparis,0)/3
      const avgFirst=first3.reduce((s,d)=>s+d.siparis,0)/3
      if(avgLast>avgFirst*1.2) result.insights.push({type:'success',title:'Yükselen Trend',description:'Son günlerdeki sipariş ortalaması ('+Math.round(avgLast)+') dönem başına göre ('+Math.round(avgFirst)+') artış gösteriyor.',action:'Detaylı bayi bazlı trend analizi'})
      else if(avgLast<avgFirst*0.8) result.insights.push({type:'warning',title:'Düşen Trend',description:'Son günlerdeki sipariş ortalaması ('+Math.round(avgLast)+') dönem başına göre ('+Math.round(avgFirst)+') azalma gösteriyor.',action:'Saha ekibi ile görüşme planla'})
    }

    const maxGun=trendData.reduce((a,b)=>b.siparis>a.siparis?b:a,trendData[0])
    const minGun=trendData.reduce((a,b)=>b.siparis<a.siparis?b:a,trendData[0])
    result.insights.push({type:'recommendation',title:'Pik ve Dip Günler',description:'En yoğun gün: '+maxGun.gun+' ('+maxGun.siparis+' kalem). En düşük gün: '+minGun.gun+' ('+minGun.siparis+' kalem). Dip günlerde kampanya veya hatırlatma planlanabilir.'})
  }

  // ===== GENEL RAPOR =====
  else if(q.includes('rapor')||q.includes('özet')||q.includes('göster')||q.includes('genel')||q.includes('analiz et')) {
    result.kpis=[
      {label:'Sipariş',value:fN(uq),sub:fN(n)+' kalem',icon:'orders',color:'#0d9264',status:'good'},
      {label:'Brüt Ciro',value:fmt(brut),sub:'Toplam',icon:'revenue',color:'#0891b2'},
      {label:'İndirim',value:fmt(ind),sub:'%'+indOran+' oran',icon:'decline',color:'#d97706',status:Number(indOran)>15?'warning':'good'},
      {label:'Aktif Bayi',value:bayiCount.toString(),sub:plasCount+' plasiyer',icon:'dealers',color:'#2563eb'},
      {label:'Karşılanma',value:'%'+tamOran,sub:fN(tam)+' tam',icon:'success',color:'#059669',status:Number(tamOran)>=90?'good':Number(tamOran)>=80?'warning':'bad'},
      {label:'Ort. Teslim',value:avgTeslim+' gün',sub:gecikme>0?gecikme+' gecikmeli':'Sağlıklı',icon:'delivery',color:'#0891b2',status:gecikme>n*0.2?'warning':'good'},
    ]

    result.charts.push({type:'bar',title:'Kategori Bazlı Brüt Ciro',data:Object.entries(katMap).sort((a,b)=>b[1].brut-a[1].brut).slice(0,8).map(([nm,d])=>({name:nm.length>14?nm.slice(0,14)+'…':nm,value:d.brut}))})
    result.charts.push({type:'donut',title:'Onay Durumu Dağılımı',data:Object.entries(onayMap).map(([nm,v])=>({name:nm,value:v}))})

    // Günlük trend mini chart
    const trendData=Object.entries(gunMap).sort((a,b)=>a[0].localeCompare(b[0])).map(([g,d])=>({gun:new Date(g).toLocaleDateString('tr-TR',{day:'numeric',month:'short'}),siparis:d.siparis}))
    if(trendData.length>2) result.charts.push({type:'area',title:'Günlük Sipariş Trendi',data:trendData,dataKey:'siparis',color:'#0d9264'})

    result.insights.push({type:'info',title:'Dönem Özeti: '+dateRange,description:fN(uq)+' benzersiz sipariş, '+fN(n)+' kalem. '+bayiCount+' bayi, '+plasCount+' plasiyer ile çalışılmış. Günlük ortalama '+Math.round(n/Math.max(Object.keys(gunMap).length,1))+' kalem.'})

    if(Number(tamOran)>=90) result.insights.push({type:'success',title:'Karşılanma Güçlü: %'+tamOran,description:'Siparişlerin büyük çoğunluğu tam karşılanmış. Stok yönetimi verimli çalışıyor.'})
    else if(Number(tamOran)>=80) result.insights.push({type:'warning',title:'Karşılanma: %'+tamOran,description:fN(eksikAll.length)+' kalem eksik karşılanmış. Stok planlama iyileştirmesi ile %90+ hedeflenebilir.',action:'Eksik karşılanan kategorileri incele'})
    else result.insights.push({type:'critical',title:'Karşılanma Düşük: %'+tamOran,description:fN(eksikAll.length)+' kalem eksik. Stok yetersizliği ciddi — acil kategori bazlı stok analizi yapılmalı.',action:'Acil stok toplantısı planla'})

    if(iptalAll.length>0){
      const io=((iptalAll.length/n)*100).toFixed(1)
      result.insights.push({type:io>10?'critical':'warning',title:'Otomatik İptal: '+fN(iptalAll.length)+' kalem (%'+io+')',description:'Plasiyerler 8 gün içinde onaylamadığı için '+fN(iptalUq)+' sipariş iptal olmuş. Kayıp brüt ciro: '+fmt(kacanBrut)+'.',action:'İptal detayını incele'})
    }

    if(Number(indOran)>15) result.insights.push({type:'warning',title:'Yüksek İndirim: %'+indOran,description:'İndirim oranı %15 üzerinde. Kampanya etkinliği ve marj etkisi değerlendirilmeli.',action:'Kampanya bazlı analiz'})

    const topKat=Object.entries(katMap).sort((a,b)=>b[1].brut-a[1].brut).slice(0,3)
    if(topKat.length>0) result.insights.push({type:'recommendation',title:'Kategori Konsantrasyonu',description:'Top 3: '+topKat.map(([nm,d])=>nm+' ('+fmt(d.brut)+')').join(', ')+'. Bu kategorilerde stok derinliği ve kampanya önceliklendirilmeli.'})
  }

  // ===== İPTAL =====
  else if(q.includes('iptal')) {
    const ib={}; iptalAll.forEach(o=>{if(!ib[o.bayi])ib[o.bayi]={k:0,brut:0};ib[o.bayi].k++;ib[o.bayi].brut+=Number(o.son_brut_ciro)||0})
    const iptalBrut=iptalAll.reduce((s,o)=>s+(Number(o.son_brut_ciro)||0),0)
    const iptalOran=n>0?((iptalAll.length/n)*100).toFixed(1):0

    result.kpis=[
      {label:'Oto. İptal',value:iptalUq.toString(),sub:fN(iptalAll.length)+' kalem',icon:'cancel',color:'#dc2626',status:'bad'},
      {label:'Kayıp Ciro',value:fmt(iptalBrut),sub:'Brüt kayıp',icon:'decline',color:'#dc2626',status:'bad'},
      {label:'İptal Oranı',value:'%'+iptalOran,sub:'toplam kalemin',icon:'warning',color:'#d97706',status:Number(iptalOran)>10?'bad':'warning'},
      {label:'Etkilenen Bayi',value:Object.keys(ib).length.toString(),sub:bayiCount+' bayiden',icon:'dealers',color:'#d97706'},
    ]

    result.charts.push({type:'bar',title:'Bayi Bazlı İptal (Kalem)',data:Object.entries(ib).sort((a,b)=>b[1].k-a[1].k).slice(0,10).map(([nm,d])=>({name:nm.length>18?nm.slice(0,18)+'…':nm,value:d.k}))})
    result.charts.push({type:'bar',title:'Bayi Bazlı Kayıp Ciro (₺)',data:Object.entries(ib).sort((a,b)=>b[1].brut-a[1].brut).slice(0,10).map(([nm,d])=>({name:nm.length>18?nm.slice(0,18)+'…':nm,value:d.brut}))})

    result.insights.push({type:'info',title:'Dönem: '+dateRange,description:fN(iptalAll.length)+' kalem otomatik iptal. Toplam '+fN(n)+' kalemin %'+iptalOran+"'i. Kayıp ciro toplam brütün %"+((iptalBrut/brut)*100).toFixed(1)+"'i."})

    const topIB=Object.entries(ib).sort((a,b)=>b[1].k-a[1].k).slice(0,3)
    if(topIB.length>0) result.insights.push({type:'critical',title:'En Çok İptal Eden Bayiler',description:topIB.map(([nm,d])=>nm+': '+d.k+' kalem ('+fmt(d.brut)+')').join(' | '),action:'Bu bayilerin plasiyerleriyle görüş'})

    result.insights.push({type:'action',title:'Önerilen Aksiyonlar',description:'1) Plasiyerlere 5. günde otomatik hatırlatma gönder. 2) 6. günde bölge müdürüne escalation yap. 3) Kronik iptal eden bayilerle özel görüşme planla.'})
  }

  // ===== BAYİ =====
  else if(q.includes('bayi')||q.includes('performans')) {
    const sortedB=Object.entries(bayiMap).sort((a,b)=>b[1].brut-a[1].brut)
    const top5Brut=sortedB.slice(0,5).reduce((s,[,d])=>s+d.brut,0)
    const top5Oran=brut>0?((top5Brut/brut)*100).toFixed(1):0

    result.kpis=[
      {label:'Aktif Bayi',value:bayiCount.toString(),sub:plasCount+' plasiyer',icon:'dealers',color:'#2563eb'},
      {label:'Ort. Ciro/Bayi',value:fmt(brut/Math.max(bayiCount,1)),sub:'Bayi başına',icon:'revenue',color:'#0d9264'},
      {label:'Top 5 Payı',value:'%'+top5Oran,sub:'ciro konsantrasyonu',icon:'revenue',color:Number(top5Oran)>60?'#d97706':'#0d9264',status:Number(top5Oran)>60?'warning':'good'},
    ]

    result.charts.push({type:'bar',title:'Top 10 Bayi (Brüt Ciro)',data:sortedB.slice(0,10).map(([nm,d])=>({name:nm.length>18?nm.slice(0,18)+'…':nm,value:d.brut}))})

    // İptal oranına göre riskli bayiler
    const riskli=sortedB.filter(([,d])=>d.k>0&&(d.iptal/d.k)>0.15).map(([nm,d])=>({name:nm.length>18?nm.slice(0,18)+'…':nm,value:Math.round((d.iptal/d.k)*100)}))
    if(riskli.length>0) result.charts.push({type:'bar',title:'Riskli Bayiler (İptal Oranı %)',data:riskli.slice(0,8)})

    result.insights.push({type:'info',title:'Dönem: '+dateRange,description:bayiCount+' aktif bayi, '+plasCount+' plasiyer ile '+fmt(brut)+' brüt ciro. Bayi başına ortalama '+fmt(brut/Math.max(bayiCount,1))+'.'})
    result.insights.push({type:Number(top5Oran)>60?'warning':'success',title:'Bayi Konsantrasyonu: Top 5 = %'+top5Oran,description:'İlk 5 bayi cironun %'+top5Oran+"'ini oluşturuyor."+(Number(top5Oran)>60?' Yüksek bağımlılık riski — orta segment bayilerin geliştirilmesi önerilir.':' Dağılım dengeli.'),action:Number(top5Oran)>60?'Orta segment bayi geliştirme planı':null})

    const sorunlu=Object.entries(bayiMap).filter(([,d])=>d.iptal>2||d.red>1)
    if(sorunlu.length>0) result.insights.push({type:'warning',title:sorunlu.length+' Bayi Dikkat Gerektiriyor',description:'Yüksek iptal/red oranına sahip bayiler: '+sorunlu.slice(0,3).map(([nm,d])=>nm+' ('+d.iptal+' iptal)').join(', '),action:'Bayi bazlı aksiyon planı oluştur'})
  }

  // ===== KATEGORİ =====
  else if(q.includes('kategori')||q.includes('dağılım')||q.includes('ürün')) {
    const sortedK=Object.entries(katMap).sort((a,b)=>b[1].brut-a[1].brut)
    const topKatOran=brut>0?((sortedK[0]?.[1]?.brut||0)/brut*100).toFixed(1):0

    result.kpis=[
      {label:'Kategori',value:sortedK.length.toString(),sub:'farklı kategori',icon:'orders',color:'#7c3aed'},
      {label:'Lider',value:sortedK[0]?.[0]||'-',sub:fmt(sortedK[0]?.[1]?.brut||0),icon:'success',color:'#0d9264'},
      {label:'Lider Payı',value:'%'+topKatOran,sub:'toplam cirodan',icon:'revenue',color:'#0891b2'},
    ]

    result.charts.push({type:'donut',title:'Kategori Ciro Dağılımı',data:sortedK.slice(0,8).map(([nm,d])=>({name:nm.length>16?nm.slice(0,16)+'…':nm,value:d.brut}))})
    result.charts.push({type:'bar',title:'Kategori Kalem Sayısı',data:sortedK.slice(0,8).map(([nm,d])=>({name:nm.length>14?nm.slice(0,14)+'…':nm,value:d.k}))})

    // Marka dağılımı
    const sortedM=Object.entries(markaMap).sort((a,b)=>b[1].brut-a[1].brut)
    if(sortedM.length>1) result.charts.push({type:'donut',title:'Marka Dağılımı (Ciro)',data:sortedM.slice(0,6).map(([nm,d])=>({name:nm.length>16?nm.slice(0,16)+'…':nm,value:d.brut}))})

    result.insights.push({type:'info',title:'Dönem: '+dateRange,description:sortedK.length+' kategoride '+fN(n)+' kalem. Toplam ciro: '+fmt(brut)+'.'})
    if(sortedK.length>0) result.insights.push({type:'success',title:'Lider Kategori: '+sortedK[0][0],description:fmt(sortedK[0][1].brut)+' ciro ile toplamın %'+topKatOran+"'i. "+sortedK[0][1].k+' kalem sipariş.'})
    if(sortedK.length>=3){const bot=sortedK.slice(-3);result.insights.push({type:'recommendation',title:'Büyüme Fırsatı',description:'Düşük cirolu kategoriler: '+bot.map(([nm,d])=>nm+' ('+fmt(d.brut)+')').join(', ')+'. Cross-sell ve kampanya fırsatları değerlendirilmeli.',action:'Kategori bazlı kampanya planla'})}
  }

  // ===== FALLBACK =====
  else {
    result.kpis=[
      {label:'Sipariş',value:fN(uq),sub:fN(n)+' kalem',icon:'orders',color:'#0d9264'},
      {label:'Brüt Ciro',value:fmt(brut),sub:'Toplam',icon:'revenue',color:'#0891b2'},
      {label:'Bayi',value:bayiCount.toString(),sub:plasCount+' plasiyer',icon:'dealers',color:'#2563eb'},
      {label:'Teslim',value:avgTeslim+' gün',sub:'Ortalama',icon:'delivery',color:'#0891b2'},
    ]
    result.charts.push({type:'donut',title:'Onay Durumu',data:Object.entries(onayMap).map(([nm,v])=>({name:nm,value:v}))})
    result.insights.push({type:'info',title:'PM Aktif: '+dateRange,description:fN(uq)+' sipariş, '+fN(n)+' kalem, '+fmt(brut)+' brüt ciro.'})
    result.insights.push({type:'recommendation',title:'Daha detaylı analiz',description:'"Genel rapor", "iptal analizi", "bayi performans", "kategori dağılımı" veya "günlük trend" komutlarını deneyin.'})
  }

  return result
}

// ============================================================
// CHART RENDERERS
// ============================================================
function ChartRenderer({chart,isMobile}) {
  if(chart.type==='bar') return (
    <div style={{background:'var(--bg-card)',borderRadius:'var(--radius-md)',padding:'16px 14px 10px',border:'1px solid var(--border-subtle)'}}>
      <h4 style={{fontSize:12,color:'var(--text-secondary)',marginBottom:12,fontWeight:600}}>{chart.title}</h4>
      <ResponsiveContainer width="100%" height={isMobile?160:200}>
        <BarChart data={chart.data} layout="vertical" margin={{left:0,right:10}}>
          <XAxis type="number" tick={{fill:'#8b939f',fontSize:9}} tickFormatter={v=>v>=1e6?(v/1e6).toFixed(1)+'M':v>=1e3?(v/1e3).toFixed(0)+'K':v}/>
          <YAxis type="category" dataKey="name" width={isMobile?80:110} tick={{fill:'#4b5563',fontSize:10}}/>
          <Tooltip contentStyle={tooltipStyle} formatter={v=>[v.toLocaleString('tr-TR'),'Değer']}/>
          <Bar dataKey="value" radius={[0,6,6,0]}>{chart.data.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}</Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )

  if(chart.type==='donut'||chart.type==='pie') return (
    <div style={{background:'var(--bg-card)',borderRadius:'var(--radius-md)',padding:'16px 14px 10px',border:'1px solid var(--border-subtle)'}}>
      <h4 style={{fontSize:12,color:'var(--text-secondary)',marginBottom:12,fontWeight:600}}>{chart.title}</h4>
      <ResponsiveContainer width="100%" height={isMobile?160:200}>
        <PieChart><Pie data={chart.data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={isMobile?60:75} innerRadius={isMobile?30:40} paddingAngle={2}>
          {chart.data.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}</Pie>
          <Tooltip contentStyle={tooltipStyle} formatter={v=>[v.toLocaleString('tr-TR'),'Adet']}/>
        </PieChart>
      </ResponsiveContainer>
      <div style={{display:'flex',flexWrap:'wrap',gap:8,justifyContent:'center',marginTop:4}}>
        {chart.data.map((item,i)=>(
          <div key={i} style={{display:'flex',alignItems:'center',gap:4,fontSize:10,color:'var(--text-secondary)'}}>
            <div style={{width:7,height:7,borderRadius:2,background:COLORS[i%COLORS.length]}}/>{item.name}
          </div>
        ))}
      </div>
    </div>
  )

  if(chart.type==='area') return (
    <div style={{background:'var(--bg-card)',borderRadius:'var(--radius-md)',padding:'16px 14px 10px',border:'1px solid var(--border-subtle)'}}>
      <h4 style={{fontSize:12,color:'var(--text-secondary)',marginBottom:12,fontWeight:600}}>{chart.title}</h4>
      <ResponsiveContainer width="100%" height={isMobile?140:180}>
        <AreaChart data={chart.data} margin={{left:0,right:10,top:5}}>
          <defs>
            <linearGradient id={'grad_'+chart.dataKey} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={chart.color} stopOpacity={0.2}/>
              <stop offset="95%" stopColor={chart.color} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e4e9" vertical={false}/>
          <XAxis dataKey="gun" tick={{fill:'#8b939f',fontSize:9}} axisLine={false}/>
          <YAxis tick={{fill:'#8b939f',fontSize:9}} axisLine={false} tickFormatter={v=>v>=1e6?(v/1e6).toFixed(1)+'M':v>=1e3?(v/1e3).toFixed(0)+'K':v}/>
          <Tooltip contentStyle={tooltipStyle} formatter={v=>[v.toLocaleString('tr-TR'),chart.dataKey==='ciro'?'₺':'Adet']}/>
          <Area type="monotone" dataKey={chart.dataKey} stroke={chart.color} strokeWidth={2} fill={'url(#grad_'+chart.dataKey+')'} dot={{r:3,fill:chart.color}}/>
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )

  return null
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function PmAktif({initialQuery,onBack,isMobile,onMenuOpen}) {
  const [messages,setMessages]=useState([])
  const [input,setInput]=useState('')
  const [loading,setLoading]=useState(false)
  const endRef=useRef(null)
  const init=useRef(false)

  useEffect(()=>{endRef.current?.scrollIntoView({behavior:'smooth'})},[messages])
  useEffect(()=>{if(initialQuery&&!init.current){init.current=true;handleSend(initialQuery)}},[initialQuery])

  const handleSend=async(queryText)=>{
    const query=queryText||input;if(!query.trim())return;setInput('')
    const newMsgs=[...messages,{role:'user',content:query}];setMessages(newMsgs);setLoading(true)

    try{
      const{data:orders,error}=await supabase.from('pm_aktif_orders').select('*').eq('ay','2026-01')
      if(error)throw error
      if(!orders?.length){setMessages([...newMsgs,{role:'assistant',content:{insights:[{type:'warning',title:'Veri bulunamadı',description:'Bu dönem için veri mevcut değil.'}]}}]);setLoading(false);return}

      const dateFilter=parseDateFilter(query)
      const filtered=filterOrdersByDate(orders,dateFilter)

      if(filtered.length===0&&dateFilter){setMessages([...newMsgs,{role:'assistant',content:{insights:[{type:'warning',title:dateFilter.label+' için veri bulunamadı',description:'Bu tarihte sipariş kaydı yok. Farklı bir tarih veya "genel rapor" deneyin.'}]}}]);setLoading(false);return}

      const working=filtered.length>0?filtered:orders
      const result=analyzeData(working,query)

      if(dateFilter&&filtered.length>0&&filtered.length<orders.length)
        result.insights.unshift({type:'info',title:'Tarih Filtresi: '+dateFilter.label,description:'Toplam '+orders.length+' kalemden '+filtered.length+' kalem bu tarihe ait.'})

      setMessages([...newMsgs,{role:'assistant',content:result}])
    }catch(err){
      setMessages([...newMsgs,{role:'assistant',content:{insights:[{type:'critical',title:'Hata',description:err.message}]}}])
    }
    setLoading(false)
  }

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      {/* Header */}
      <div style={{padding:isMobile?'10px 12px':'10px 20px',borderBottom:'1px solid var(--border-subtle)',display:'flex',alignItems:'center',gap:8,background:'var(--bg-surface)'}}>
        {isMobile&&<button onClick={onMenuOpen} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-secondary)',display:'flex',padding:4}}><Menu size={20}/></button>}
        <button onClick={onBack} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-secondary)',display:'flex',padding:'2px 4px'}}><ArrowLeft size={18}/></button>
        <div style={{width:7,height:7,borderRadius:'50%',background:'var(--accent)',boxShadow:'0 0 6px #0d926466'}}/>
        <span style={{fontSize:isMobile?13:14,fontWeight:600}}>Saha AI Asistanı</span>
      </div>

      {/* Messages */}
      <div style={{flex:1,overflowY:'auto',padding:isMobile?'14px 10px':'20px 20px'}}>
        {messages.length===0&&!initialQuery&&(
          <div style={{textAlign:'center',padding:'48px 0',color:'var(--text-muted)'}}>
            <ShoppingCart size={36} color="var(--border-strong)" style={{margin:'0 auto 14px'}}/>
            <div style={{fontSize:16,fontWeight:500,color:'var(--text-secondary)',marginBottom:4}}>PM Aktif Sorgu</div>
            <div style={{fontSize:13}}>Aşağıdan bir komut seç veya soru yaz</div>
          </div>
        )}

        {messages.map((msg,i)=>(
          <div key={i} style={{marginBottom:16}}>
            {msg.role==='user'?(
              <div style={{display:'flex',justifyContent:'flex-end'}}>
                <div style={{background:'var(--accent)',color:'#fff',borderRadius:'14px 14px 4px 14px',padding:'10px 14px',maxWidth:isMobile?'85%':'65%',fontSize:13,fontWeight:500,lineHeight:1.5}}>{msg.content}</div>
              </div>
            ):(
              <div style={{display:'flex',gap:8,alignItems:'flex-start'}}>
                <div style={{width:26,height:26,borderRadius:7,background:'var(--accent-light)',border:'1px solid var(--accent-border)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:2}}>
                  <Bot size={13} color="var(--accent)"/>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  {msg.content.dateRange&&(
                    <div style={{display:'inline-flex',alignItems:'center',gap:4,fontSize:10,color:'var(--text-muted)',background:'var(--bg-elevated)',padding:'3px 8px',borderRadius:4,marginBottom:8,border:'1px solid var(--border-subtle)'}}>
                      <Calendar size={10}/>{msg.content.dateRange}
                    </div>
                  )}
                  {msg.content.kpis&&<KpiGrid data={msg.content.kpis} isMobile={isMobile}/>}
                  {msg.content.charts?.length>0&&(
                    <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':msg.content.charts.length>1?'1fr 1fr':'1fr',gap:8,marginBottom:14}}>
                      {msg.content.charts.map((c,ci)=><ChartRenderer key={ci} chart={c} isMobile={isMobile}/>)}
                    </div>
                  )}
                  {msg.content.insights?.map((ins,ii)=><InsightCard key={ii} {...ins}/>)}
                </div>
              </div>
            )}
          </div>
        ))}

        {loading&&(
          <div style={{display:'flex',gap:8,marginBottom:16}}>
            <div style={{width:26,height:26,borderRadius:7,background:'var(--accent-light)',border:'1px solid var(--accent-border)',display:'flex',alignItems:'center',justifyContent:'center'}}><Bot size={13} color="var(--accent)"/></div>
            <div style={{background:'var(--bg-card)',border:'1px solid var(--border-subtle)',borderRadius:'var(--radius-sm)',padding:'10px 14px',display:'flex',gap:4,alignItems:'center'}}>
              {[0,1,2].map(i=><div key={i} style={{width:5,height:5,borderRadius:'50%',background:'var(--accent)',animation:`pulse 1.2s infinite ${i*0.15}s`}}/>)}
              <span style={{marginLeft:6,fontSize:12,color:'var(--text-muted)'}}>Analiz ediliyor...</span>
            </div>
          </div>
        )}
        <div ref={endRef}/>
      </div>

      {/* Smart chips */}
      <div style={{padding:isMobile?'4px 10px':'6px 20px',display:'flex',gap:5,flexWrap:'wrap'}}>
        {SMART_CHIPS.map(c=>(
          <button key={c.id} onClick={()=>setInput(c.prompt)} style={{
            background:'var(--bg-card)',border:'1px solid var(--border-subtle)',
            borderRadius:16,padding:isMobile?'4px 10px':'5px 12px',
            color:'var(--text-secondary)',fontSize:11,cursor:'pointer',fontFamily:'inherit',transition:'all 0.15s',
          }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--accent-border)';e.currentTarget.style.color='var(--accent)'}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border-subtle)';e.currentTarget.style.color='var(--text-secondary)'}}
          >{c.label}</button>
        ))}
      </div>

      {/* Input */}
      <div className="safe-bottom" style={{padding:isMobile?'8px 10px 12px':'10px 20px 16px',position:'relative'}}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleSend()}
          placeholder="Soru sor veya komut yaz..."
          style={{width:'100%',padding:'12px 48px 12px 14px',background:'var(--bg-card)',border:'1px solid var(--border-subtle)',borderRadius:'var(--radius-md)',color:'var(--text-primary)',fontSize:14,outline:'none',fontFamily:'inherit',boxSizing:'border-box',boxShadow:'var(--shadow-sm)',transition:'border-color 0.2s, box-shadow 0.2s'}}
          onFocus={e=>{e.target.style.borderColor='var(--accent)';e.target.style.boxShadow='0 0 0 3px var(--accent-muted)'}}
          onBlur={e=>{e.target.style.borderColor='var(--border-subtle)';e.target.style.boxShadow='var(--shadow-sm)'}}
        />
        <button onClick={()=>handleSend()} style={{position:'absolute',right:isMobile?16:26,top:'50%',transform:'translateY(-50%)',width:34,height:34,borderRadius:9,background:input.trim()?'var(--accent)':'transparent',border:'none',cursor:input.trim()?'pointer':'default',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <Send size={15} color={input.trim()?'#fff':'var(--text-muted)'}/>
        </button>
      </div>

      <style>{`@keyframes pulse{0%,80%,100%{transform:scale(.5);opacity:.3}40%{transform:scale(1);opacity:1}}`}</style>
    </div>
  )
}
