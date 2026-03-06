import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { generateSQL, interpretResults } from '../lib/ai'
import { Bot, ArrowLeft, ShoppingCart, Send, Menu, Calendar, Database, Sparkles } from 'lucide-react'
import KpiGrid from '../components/KpiGrid'
import InsightCard from '../components/InsightCard'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, CartesianGrid } from 'recharts'

const COLORS = ['#0d9264','#0891b2','#7c3aed','#d97706','#dc2626','#2563eb','#ec4899','#64748b']
const ts = {background:'#fff',border:'1px solid #e2e4e9',borderRadius:8,fontFamily:'DM Sans',fontSize:12,boxShadow:'0 4px 12px rgba(0,0,0,0.08)'}

const SMART_CHIPS = [
  {id:'rapor',label:'📊 Genel Rapor',prompt:'PM Aktif genel rapor ve özet göster',mode:'rule'},
  {id:'iptal',label:'❌ İptaller',prompt:'Otomatik iptal edilen siparişleri analiz et',mode:'rule'},
  {id:'bayi',label:'🏪 Bayiler',prompt:'Bayi bazlı performans karşılaştırması yap',mode:'rule'},
  {id:'kategori',label:'📦 Kategoriler',prompt:'Kategori bazlı ciro dağılımını göster',mode:'rule'},
  {id:'trend',label:'📈 Günlük Trend',prompt:'Günlük sipariş ve ciro trendini göster',mode:'rule'},
]

// ============================================================
// DATE PARSER
// ============================================================
function parseDateFilter(query) {
  const q=query.toLowerCase()
  const months={'ocak':'01','şubat':'02','mart':'03','nisan':'04','mayıs':'05','haziran':'06','temmuz':'07','ağustos':'08','eylül':'09','ekim':'10','kasım':'11','aralık':'12'}
  const sd=q.match(/(?:sadece\s+)?(\d{1,2})\s+(ocak|şubat|mart|nisan|mayıs|haziran|temmuz|ağustos|eylül|ekim|kasım|aralık)/i)
  if(sd){const d=sd[1].padStart(2,'0'),m=months[sd[2].toLowerCase()];if(m)return{type:'single',date:`2026-${m}-${d}`,label:`${sd[1]} ${sd[2].charAt(0).toUpperCase()+sd[2].slice(1)} 2026`}}
  const rg=q.match(/(\d{1,2})\s*[-–]\s*(\d{1,2})\s+(ocak|şubat|mart|nisan|mayıs|haziran|temmuz|ağustos|eylül|ekim|kasım|aralık)/i)
  if(rg){const d1=rg[1].padStart(2,'0'),d2=rg[2].padStart(2,'0'),m=months[rg[3].toLowerCase()];if(m)return{type:'range',from:`2026-${m}-${d1}`,to:`2026-${m}-${d2}`,label:`${rg[1]}-${rg[2]} ${rg[3].charAt(0).toUpperCase()+rg[3].slice(1)} 2026`}}
  if(q.includes('ilk hafta'))return{type:'range',from:'2026-01-07',to:'2026-01-13',label:'İlk Hafta (7-13 Ocak)'}
  if(q.includes('son hafta'))return{type:'range',from:'2026-01-20',to:'2026-01-31',label:'Son Hafta (20-31 Ocak)'}
  return null
}
function filterByDate(orders,df){
  if(!df)return orders
  return orders.filter(o=>{const d=(o.siparis_tarihi||o.created_at||'').substring(0,10);if(df.type==='single')return d===df.date;if(df.type==='range')return d>=df.from&&d<=df.to;return true})
}

// ============================================================
// RULE-BASED ANALYSIS (for smart chips - fast, no API call)
// ============================================================
function ruleAnalysis(orders, query) {
  const q=query.toLowerCase(),n=orders.length
  const uq=[...new Set(orders.map(o=>o.pma_siparis_kodu))].length
  const brut=orders.reduce((s,o)=>s+(Number(o.son_brut_ciro)||0),0)
  const ind=orders.reduce((s,o)=>s+(Number(o.son_indirim_tutari)||0),0)
  const indOran=brut>0?((ind/brut)*100).toFixed(1):0
  const bayiMap={},katMap={},onayMap={},karsMap={},gunMap={}
  orders.forEach(o=>{
    const b=o.bayi||'?';if(!bayiMap[b])bayiMap[b]={k:0,brut:0,iptal:0,red:0,eksik:0}
    bayiMap[b].k++;bayiMap[b].brut+=Number(o.son_brut_ciro)||0
    if(o.onay_durumu==='Otomatik İptal')bayiMap[b].iptal++
    if(o.onay_durumu==='Reddedildi')bayiMap[b].red++
    if(o.karsilanma_durumu?.includes('Eksik'))bayiMap[b].eksik++
    const k=o.kategori||'?';if(!katMap[k])katMap[k]={k:0,brut:0};katMap[k].k++;katMap[k].brut+=Number(o.son_brut_ciro)||0
    onayMap[o.onay_durumu||'?']=(onayMap[o.onay_durumu||'?']||0)+1
    karsMap[o.karsilanma_durumu||'?']=(karsMap[o.karsilanma_durumu||'?']||0)+1
    const g=(o.siparis_tarihi||o.created_at||'').substring(0,10)
    if(g){if(!gunMap[g])gunMap[g]={s:0,brut:0};gunMap[g].s++;gunMap[g].brut+=Number(o.son_brut_ciro)||0}
  })
  const teslim=orders.filter(o=>o.teslim_suresi_gun!=null)
  const avgT=teslim.length?(teslim.reduce((s,o)=>s+o.teslim_suresi_gun,0)/teslim.length).toFixed(1):'N/A'
  const gec=teslim.filter(o=>o.teslim_suresi_gun>=5).length
  const iptalAll=orders.filter(o=>o.onay_durumu==='Otomatik İptal')
  const iptalUq=[...new Set(iptalAll.map(o=>o.pma_siparis_kodu))].length
  const eksikAll=orders.filter(o=>o.karsilanma_durumu?.includes('Eksik'))
  const tam=karsMap['Tam karşılanan sipariş']||0,tamO=n>0?((tam/n)*100).toFixed(1):0
  const bc=Object.keys(bayiMap).length,pc=[...new Set(orders.map(o=>o.plasiyer))].length
  const kacan=[...iptalAll,...orders.filter(o=>o.onay_durumu==='Reddedildi')].reduce((s,o)=>s+(Number(o.son_brut_ciro)||0),0)
  const fmt=v=>v>=1e6?(v/1e6).toFixed(1)+'M ₺':v>=1e3?(v/1e3).toFixed(1)+'K ₺':Math.round(v).toLocaleString('tr-TR')+' ₺'
  const fN=v=>v.toLocaleString('tr-TR')
  const dates=orders.map(o=>o.siparis_tarihi||o.created_at).filter(Boolean).sort()
  const dr=dates.length>0?new Date(dates[0]).toLocaleDateString('tr-TR',{day:'numeric',month:'long'})+' – '+new Date(dates[dates.length-1]).toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:'numeric'}):'Ocak 2026'
  const r={kpis:[],insights:[],charts:[],dateRange:dr}

  if(q.includes('trend')||q.includes('günlük')){
    const td=Object.entries(gunMap).sort((a,b)=>a[0].localeCompare(b[0])).map(([g,d])=>({gun:new Date(g).toLocaleDateString('tr-TR',{day:'numeric',month:'short'}),siparis:d.s,ciro:Math.round(d.brut)}))
    r.kpis=[{label:'Aktif Gün',value:td.length.toString(),sub:'sipariş günü',icon:'orders',color:'#0d9264'},{label:'Günlük Ort.',value:Math.round(n/Math.max(td.length,1)).toString(),sub:'kalem/gün',icon:'revenue',color:'#0891b2'},{label:'Günlük Ciro',value:fmt(brut/Math.max(td.length,1)),sub:'ortalama',icon:'revenue',color:'#7c3aed'}]
    r.charts.push({type:'area',title:'Günlük Sipariş',data:td,dataKey:'siparis',color:'#0d9264'})
    r.charts.push({type:'area',title:'Günlük Ciro (₺)',data:td,dataKey:'ciro',color:'#0891b2'})
    r.insights.push({type:'info',title:'Dönem: '+dr,description:td.length+' aktif gün, '+fN(n)+' kalem.'})
    if(td.length>=3){const l=td.slice(-3),f=td.slice(0,3),al=l.reduce((s,d)=>s+d.siparis,0)/3,af=f.reduce((s,d)=>s+d.siparis,0)/3
      if(al>af*1.2)r.insights.push({type:'success',title:'Yükselen Trend',description:'Son günler (ort '+Math.round(al)+') dönem başına göre ('+Math.round(af)+') artışta.',action:'Bayi bazlı trend analizi'})
      else if(al<af*0.8)r.insights.push({type:'warning',title:'Düşen Trend',description:'Son günler (ort '+Math.round(al)+') dönem başına göre ('+Math.round(af)+') düşüşte.',action:'Saha ekibi görüşmesi planla'})}
    const mx=td.reduce((a,b)=>b.siparis>a.siparis?b:a,td[0]),mn=td.reduce((a,b)=>b.siparis<a.siparis?b:a,td[0])
    r.insights.push({type:'recommendation',title:'Pik: '+mx.gun+' ('+mx.siparis+') / Dip: '+mn.gun+' ('+mn.siparis+')',description:'Dip günlerde kampanya veya hatırlatma planlanabilir.'})
  } else if(q.includes('rapor')||q.includes('özet')||q.includes('göster')||q.includes('genel')||q.includes('analiz et')){
    r.kpis=[
      {label:'Sipariş',value:fN(uq),sub:fN(n)+' kalem',icon:'orders',color:'#0d9264',status:'good'},
      {label:'Brüt Ciro',value:fmt(brut),sub:'Toplam',icon:'revenue',color:'#0891b2'},
      {label:'İndirim',value:fmt(ind),sub:'%'+indOran,icon:'decline',color:'#d97706',status:Number(indOran)>15?'warning':'good'},
      {label:'Aktif Bayi',value:bc.toString(),sub:pc+' plasiyer',icon:'dealers',color:'#2563eb'},
      {label:'Karşılanma',value:'%'+tamO,sub:fN(tam)+' tam',icon:'success',color:'#059669',status:Number(tamO)>=90?'good':Number(tamO)>=80?'warning':'bad'},
      {label:'Ort. Teslim',value:avgT+' gün',sub:gec>0?gec+' gecikmeli':'Sağlıklı',icon:'delivery',color:'#0891b2',status:gec>n*0.2?'warning':'good'},
    ]
    r.charts.push({type:'bar',title:'Kategori Brüt Ciro',data:Object.entries(katMap).sort((a,b)=>b[1].brut-a[1].brut).slice(0,8).map(([nm,d])=>({name:nm.length>14?nm.slice(0,14)+'…':nm,value:d.brut}))})
    r.charts.push({type:'donut',title:'Onay Durumu',data:Object.entries(onayMap).map(([nm,v])=>({name:nm,value:v}))})
    const td=Object.entries(gunMap).sort((a,b)=>a[0].localeCompare(b[0])).map(([g,d])=>({gun:new Date(g).toLocaleDateString('tr-TR',{day:'numeric',month:'short'}),siparis:d.s}))
    if(td.length>2)r.charts.push({type:'area',title:'Günlük Sipariş Trendi',data:td,dataKey:'siparis',color:'#0d9264'})
    r.insights.push({type:'info',title:'Dönem Özeti: '+dr,description:fN(uq)+' sipariş, '+fN(n)+' kalem. '+bc+' bayi, '+pc+' plasiyer. Günlük ort: '+Math.round(n/Math.max(Object.keys(gunMap).length,1))+' kalem.'})
    if(Number(tamO)>=90)r.insights.push({type:'success',title:'Karşılanma Güçlü: %'+tamO,description:'Stok yönetimi verimli.'})
    else if(Number(tamO)>=80)r.insights.push({type:'warning',title:'Karşılanma: %'+tamO,description:fN(eksikAll.length)+' kalem eksik. %90+ hedeflenebilir.',action:'Eksik kategorileri incele'})
    else r.insights.push({type:'critical',title:'Karşılanma Düşük: %'+tamO,description:fN(eksikAll.length)+' kalem eksik. Acil stok analizi gerekli.',action:'Acil stok toplantısı'})
    if(iptalAll.length>0){const io=((iptalAll.length/n)*100).toFixed(1);r.insights.push({type:io>10?'critical':'warning',title:'Oto. İptal: '+fN(iptalAll.length)+' kalem (%'+io+')',description:fN(iptalUq)+' sipariş iptal. Kayıp: '+fmt(kacan),action:'İptal detayını incele'})}
    if(Number(indOran)>15)r.insights.push({type:'warning',title:'Yüksek İndirim: %'+indOran,description:'Kampanya etkinliği değerlendirilmeli.',action:'Kampanya analizi'})
    const tk=Object.entries(katMap).sort((a,b)=>b[1].brut-a[1].brut).slice(0,3)
    if(tk.length>0)r.insights.push({type:'recommendation',title:'Top Kategoriler',description:tk.map(([nm,d])=>nm+' ('+fmt(d.brut)+')').join(', ')})
  } else if(q.includes('iptal')){
    const ib={};iptalAll.forEach(o=>{if(!ib[o.bayi])ib[o.bayi]={k:0,brut:0};ib[o.bayi].k++;ib[o.bayi].brut+=Number(o.son_brut_ciro)||0})
    const ipB=iptalAll.reduce((s,o)=>s+(Number(o.son_brut_ciro)||0),0),ipO=n>0?((iptalAll.length/n)*100).toFixed(1):0
    r.kpis=[{label:'Oto. İptal',value:iptalUq.toString(),sub:fN(iptalAll.length)+' kalem',icon:'cancel',color:'#dc2626',status:'bad'},{label:'Kayıp Ciro',value:fmt(ipB),sub:'brüt kayıp',icon:'decline',color:'#dc2626',status:'bad'},{label:'İptal Oranı',value:'%'+ipO,sub:'toplam kalem',icon:'warning',color:'#d97706',status:Number(ipO)>10?'bad':'warning'},{label:'Etkilenen Bayi',value:Object.keys(ib).length.toString(),sub:bc+' bayiden',icon:'dealers',color:'#d97706'}]
    r.charts.push({type:'bar',title:'Bayi İptal (Kalem)',data:Object.entries(ib).sort((a,b)=>b[1].k-a[1].k).slice(0,10).map(([nm,d])=>({name:nm.length>18?nm.slice(0,18)+'…':nm,value:d.k}))})
    r.charts.push({type:'bar',title:'Bayi Kayıp Ciro (₺)',data:Object.entries(ib).sort((a,b)=>b[1].brut-a[1].brut).slice(0,10).map(([nm,d])=>({name:nm.length>18?nm.slice(0,18)+'…':nm,value:d.brut}))})
    r.insights.push({type:'info',title:'Dönem: '+dr,description:fN(iptalAll.length)+' kalem iptal. Toplam '+fN(n)+" kalemin %"+ipO+"'i."})
    const tI=Object.entries(ib).sort((a,b)=>b[1].k-a[1].k).slice(0,3)
    if(tI.length>0)r.insights.push({type:'critical',title:'En Çok İptal Eden Bayiler',description:tI.map(([nm,d])=>nm+': '+d.k+' kalem ('+fmt(d.brut)+')').join(' | '),action:'Plasiyerlerle görüş'})
    r.insights.push({type:'action',title:'Önerilen Aksiyonlar',description:'1) 5. günde otomatik hatırlatma 2) 6. günde bölge müdürüne escalation 3) Kronik bayilerle özel görüşme'})
  } else if(q.includes('bayi')||q.includes('performans')){
    const sB=Object.entries(bayiMap).sort((a,b)=>b[1].brut-a[1].brut)
    const t5=sB.slice(0,5).reduce((s,[,d])=>s+d.brut,0),t5O=brut>0?((t5/brut)*100).toFixed(1):0
    r.kpis=[{label:'Aktif Bayi',value:bc.toString(),sub:pc+' plasiyer',icon:'dealers',color:'#2563eb'},{label:'Ort. Ciro/Bayi',value:fmt(brut/Math.max(bc,1)),sub:'bayi başına',icon:'revenue',color:'#0d9264'},{label:'Top 5 Payı',value:'%'+t5O,sub:'konsantrasyon',icon:'revenue',color:Number(t5O)>60?'#d97706':'#0d9264',status:Number(t5O)>60?'warning':'good'}]
    r.charts.push({type:'bar',title:'Top 10 Bayi (Ciro)',data:sB.slice(0,10).map(([nm,d])=>({name:nm.length>18?nm.slice(0,18)+'…':nm,value:d.brut}))})
    const risk=sB.filter(([,d])=>d.k>0&&(d.iptal/d.k)>0.15).map(([nm,d])=>({name:nm.length>18?nm.slice(0,18)+'…':nm,value:Math.round((d.iptal/d.k)*100)}))
    if(risk.length>0)r.charts.push({type:'bar',title:'Riskli Bayiler (İptal %)',data:risk.slice(0,8)})
    r.insights.push({type:'info',title:'Dönem: '+dr,description:bc+' bayi, '+pc+' plasiyer, '+fmt(brut)+' ciro.'})
    r.insights.push({type:Number(t5O)>60?'warning':'success',title:'Konsantrasyon: Top 5 = %'+t5O,description:Number(t5O)>60?'Yüksek bağımlılık. Orta segment geliştirilmeli.':'Dağılım dengeli.',action:Number(t5O)>60?'Bayi geliştirme planı':null})
    const sr=Object.entries(bayiMap).filter(([,d])=>d.iptal>2||d.red>1)
    if(sr.length>0)r.insights.push({type:'warning',title:sr.length+' Riskli Bayi',description:sr.slice(0,3).map(([nm,d])=>nm+' ('+d.iptal+' iptal)').join(', '),action:'Aksiyon planı oluştur'})
  } else if(q.includes('kategori')||q.includes('dağılım')||q.includes('ürün')){
    const sK=Object.entries(katMap).sort((a,b)=>b[1].brut-a[1].brut),tKO=brut>0?((sK[0]?.[1]?.brut||0)/brut*100).toFixed(1):0
    r.kpis=[{label:'Kategori',value:sK.length.toString(),sub:'farklı',icon:'orders',color:'#7c3aed'},{label:'Lider',value:sK[0]?.[0]||'-',sub:fmt(sK[0]?.[1]?.brut||0),icon:'success',color:'#0d9264'},{label:'Lider Payı',value:'%'+tKO,sub:'toplam ciro',icon:'revenue',color:'#0891b2'}]
    r.charts.push({type:'donut',title:'Kategori Ciro',data:sK.slice(0,8).map(([nm,d])=>({name:nm.length>16?nm.slice(0,16)+'…':nm,value:d.brut}))})
    r.charts.push({type:'bar',title:'Kategori Kalem',data:sK.slice(0,8).map(([nm,d])=>({name:nm.length>14?nm.slice(0,14)+'…':nm,value:d.k}))})
    r.insights.push({type:'info',title:'Dönem: '+dr,description:sK.length+' kategoride '+fN(n)+' kalem.'})
    if(sK.length>0)r.insights.push({type:'success',title:'Lider: '+sK[0][0],description:fmt(sK[0][1].brut)+' — toplamın %'+tKO+"'i."})
    if(sK.length>=3){const bt=sK.slice(-3);r.insights.push({type:'recommendation',title:'Büyüme Fırsatı',description:bt.map(([nm,d])=>nm+' ('+fmt(d.brut)+')').join(', '),action:'Kampanya planla'})}
  }
  return r
}

// ============================================================
// CHART RENDERER
// ============================================================
function ChartRenderer({chart,isMobile}) {
  if(chart.type==='bar')return(
    <div style={{background:'var(--bg-card)',borderRadius:'var(--radius-md)',padding:'16px 14px 10px',border:'1px solid var(--border-subtle)'}}>
      <h4 style={{fontSize:12,color:'var(--text-secondary)',marginBottom:12,fontWeight:600}}>{chart.title}</h4>
      <ResponsiveContainer width="100%" height={isMobile?160:200}>
        <BarChart data={chart.data} layout="vertical" margin={{left:0,right:10}}>
          <XAxis type="number" tick={{fill:'#8b939f',fontSize:9}} tickFormatter={v=>v>=1e6?(v/1e6).toFixed(1)+'M':v>=1e3?(v/1e3).toFixed(0)+'K':v}/>
          <YAxis type="category" dataKey="name" width={isMobile?80:110} tick={{fill:'#4b5563',fontSize:10}}/>
          <Tooltip contentStyle={ts} formatter={v=>[v.toLocaleString('tr-TR'),'Değer']}/>
          <Bar dataKey="value" radius={[0,6,6,0]}>{chart.data.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}</Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
  if(chart.type==='donut'||chart.type==='pie')return(
    <div style={{background:'var(--bg-card)',borderRadius:'var(--radius-md)',padding:'16px 14px 10px',border:'1px solid var(--border-subtle)'}}>
      <h4 style={{fontSize:12,color:'var(--text-secondary)',marginBottom:12,fontWeight:600}}>{chart.title}</h4>
      <ResponsiveContainer width="100%" height={isMobile?160:200}>
        <PieChart><Pie data={chart.data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={isMobile?60:75} innerRadius={isMobile?30:40} paddingAngle={2}>
          {chart.data.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}</Pie>
          <Tooltip contentStyle={ts} formatter={v=>[v.toLocaleString('tr-TR'),'Adet']}/>
        </PieChart>
      </ResponsiveContainer>
      <div style={{display:'flex',flexWrap:'wrap',gap:8,justifyContent:'center',marginTop:4}}>
        {chart.data.map((item,i)=>(<div key={i} style={{display:'flex',alignItems:'center',gap:4,fontSize:10,color:'var(--text-secondary)'}}><div style={{width:7,height:7,borderRadius:2,background:COLORS[i%COLORS.length]}}/>{item.name}</div>))}
      </div>
    </div>
  )
  if(chart.type==='area')return(
    <div style={{background:'var(--bg-card)',borderRadius:'var(--radius-md)',padding:'16px 14px 10px',border:'1px solid var(--border-subtle)'}}>
      <h4 style={{fontSize:12,color:'var(--text-secondary)',marginBottom:12,fontWeight:600}}>{chart.title}</h4>
      <ResponsiveContainer width="100%" height={isMobile?140:180}>
        <AreaChart data={chart.data} margin={{left:0,right:10,top:5}}>
          <defs><linearGradient id={'g_'+chart.dataKey} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={chart.color} stopOpacity={0.2}/><stop offset="95%" stopColor={chart.color} stopOpacity={0}/></linearGradient></defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e4e9" vertical={false}/>
          <XAxis dataKey="gun" tick={{fill:'#8b939f',fontSize:9}} axisLine={false}/>
          <YAxis tick={{fill:'#8b939f',fontSize:9}} axisLine={false} tickFormatter={v=>v>=1e6?(v/1e6).toFixed(1)+'M':v>=1e3?(v/1e3).toFixed(0)+'K':v}/>
          <Tooltip contentStyle={ts} formatter={v=>[v.toLocaleString('tr-TR'),chart.dataKey==='ciro'?'₺':'Adet']}/>
          <Area type="monotone" dataKey={chart.dataKey} stroke={chart.color} strokeWidth={2} fill={'url(#g_'+chart.dataKey+')'} dot={{r:3,fill:chart.color}}/>
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
  return null
}

// ============================================================
// SQL RESULT TABLE
// ============================================================
function SqlTable({data,isMobile}) {
  if(!data?.length)return null
  const cols=Object.keys(data[0])
  return(
    <div style={{overflowX:'auto',marginBottom:14,borderRadius:'var(--radius-md)',border:'1px solid var(--border-subtle)'}}>
      <table style={{width:'100%',borderCollapse:'collapse',fontSize:isMobile?11:12,fontFamily:'IBM Plex Mono, monospace'}}>
        <thead><tr>{cols.map(c=><th key={c} style={{padding:'8px 10px',textAlign:'left',background:'var(--bg-elevated)',borderBottom:'1px solid var(--border-subtle)',color:'var(--text-secondary)',fontWeight:600,fontSize:10,whiteSpace:'nowrap'}}>{c}</th>)}</tr></thead>
        <tbody>{data.slice(0,20).map((row,i)=><tr key={i}>{cols.map(c=><td key={c} style={{padding:'6px 10px',borderBottom:'1px solid var(--border-subtle)',color:'var(--text-primary)',whiteSpace:'nowrap'}}>{typeof row[c]==='number'?row[c].toLocaleString('tr-TR'):row[c]??'-'}</td>)}</tr>)}</tbody>
      </table>
      {data.length>20&&<div style={{padding:'8px',textAlign:'center',fontSize:11,color:'var(--text-muted)'}}>... ve {data.length-20} satır daha</div>}
    </div>
  )
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

  // Determine if query should use rule-based or text-to-sql
  // Only exact smart chip prompts go to rule-based, everything else → Claude
  const RULE_PROMPTS = SMART_CHIPS.map(c => c.prompt.toLowerCase())
  const isRuleQuery = (q) => RULE_PROMPTS.includes(q.toLowerCase().trim())

  const handleSend=async(queryText)=>{
    const query=queryText||input;if(!query.trim())return;setInput('')
    const newMsgs=[...messages,{role:'user',content:query}];setMessages(newMsgs);setLoading(true)

    try{
      if(isRuleQuery(query)){
        // RULE-BASED PATH (smart chips, known queries)
        const{data:orders,error}=await supabase.from('pm_aktif_orders').select('*').eq('ay','2026-01')
        if(error)throw error
        if(!orders?.length){setMessages([...newMsgs,{role:'assistant',content:{insights:[{type:'warning',title:'Veri bulunamadı',description:'Veri mevcut değil.'}]}}]);setLoading(false);return}
        const df=parseDateFilter(query),filtered=filterByDate(orders,df)
        if(filtered.length===0&&df){setMessages([...newMsgs,{role:'assistant',content:{insights:[{type:'warning',title:df.label+' için veri yok',description:'Farklı tarih deneyin.'}]}}]);setLoading(false);return}
        const working=filtered.length>0?filtered:orders
        const result=ruleAnalysis(working,query)
        if(df&&filtered.length<orders.length)result.insights.unshift({type:'info',title:'Filtre: '+df.label,description:orders.length+' kalemden '+filtered.length+' kalem.'})
        setMessages([...newMsgs,{role:'assistant',content:result}])
      } else {
        // TEXT-TO-SQL PATH (free-form questions → Claude → SQL → Supabase)
        const sqlResult=await generateSQL(query)
        if(!sqlResult?.sql){
          // Fallback to rule-based general report
          const{data:orders}=await supabase.from('pm_aktif_orders').select('*').eq('ay','2026-01')
          if(orders?.length){
            const result=ruleAnalysis(orders,query)
            result.insights.unshift({type:'info',title:'Genel analiz gösteriliyor',description:'Sorunuz için özel SQL üretilemedi. Genel rapor gösteriliyor.'})
            setMessages([...newMsgs,{role:'assistant',content:result}])
          } else {
            setMessages([...newMsgs,{role:'assistant',content:{insights:[{type:'warning',title:'Veri bulunamadı',description:'Veri mevcut değil.'}]}}])
          }
          setLoading(false);return
        }

        // Execute SQL via Supabase RPC or direct query
        const{data:sqlData,error:sqlError}=await supabase.rpc('execute_sql',{query_text:sqlResult.sql})

        if(sqlError){
          // If RPC not available, show the SQL and explanation
          setMessages([...newMsgs,{role:'assistant',content:{
            insights:[
              {type:'info',title:'SQL Üretildi',description:sqlResult.explanation},
              {type:'recommendation',title:'Üretilen SQL',description:sqlResult.sql},
              {type:'warning',title:'Direkt SQL çalıştırma henüz aktif değil',description:'Supabase RPC fonksiyonu kurulunca otomatik çalışacak. Şimdilik SQL\'i Supabase SQL Editor\'da çalıştırabilirsiniz.'}
            ]
          }}])
          setLoading(false);return
        }

        // Interpret results with Claude
        const interpretation=await interpretResults(query,sqlData,sqlResult.sql)
        const content={insights:[],charts:[],sqlData:sqlData}

        if(interpretation){
          content.insights=[...(interpretation.insights||[])]
          if(interpretation.summary)content.aiSummary=interpretation.summary
          if(interpretation.chartType&&interpretation.chartType!=='none'&&interpretation.chartData?.length){
            content.charts=[{type:interpretation.chartType,title:interpretation.chartTitle||'Sonuç',data:interpretation.chartData}]
          }
        } else {
          content.insights=[{type:'info',title:'Sorgu Sonucu',description:sqlData.length+' satır döndü.'},{type:'info',title:'SQL',description:sqlResult.sql}]
        }

        setMessages([...newMsgs,{role:'assistant',content}])
      }
    }catch(err){
      setMessages([...newMsgs,{role:'assistant',content:{insights:[{type:'critical',title:'Hata',description:err.message}]}}])
    }
    setLoading(false)
  }

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div style={{padding:isMobile?'10px 12px':'10px 20px',borderBottom:'1px solid var(--border-subtle)',display:'flex',alignItems:'center',gap:8,background:'var(--bg-surface)'}}>
        {isMobile&&<button onClick={onMenuOpen} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-secondary)',display:'flex',padding:4}}><Menu size={20}/></button>}
        <button onClick={onBack} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-secondary)',display:'flex',padding:'2px 4px'}}><ArrowLeft size={18}/></button>
        <div style={{width:7,height:7,borderRadius:'50%',background:'var(--accent)',boxShadow:'0 0 6px #0d926466'}}/>
        <span style={{fontSize:isMobile?13:14,fontWeight:600}}>Saha AI Asistanı</span>
        <span style={{fontSize:10,color:'var(--accent)',background:'var(--accent-light)',padding:'2px 8px',borderRadius:4,border:'1px solid var(--accent-border)',fontFamily:'IBM Plex Mono',display:'flex',alignItems:'center',gap:3}}><Sparkles size={10}/>Claude AI</span>
      </div>

      <div style={{flex:1,overflowY:'auto',padding:isMobile?'14px 10px':'20px 20px'}}>
        {messages.length===0&&!initialQuery&&(
          <div style={{textAlign:'center',padding:'48px 0',color:'var(--text-muted)'}}>
            <Database size={36} color="var(--border-strong)" style={{margin:'0 auto 14px'}}/>
            <div style={{fontSize:16,fontWeight:500,color:'var(--text-secondary)',marginBottom:4}}>PM Aktif Sorgu Merkezi</div>
            <div style={{fontSize:13,lineHeight:1.6}}>Hazır komutlardan birini seç veya<br/>doğal dilde herhangi bir soru sor</div>
            <div style={{fontSize:11,color:'var(--text-muted)',marginTop:12,background:'var(--bg-elevated)',display:'inline-block',padding:'4px 12px',borderRadius:6}}>💡 Örnek: "En çok ciro yapan ilk 5 bayi hangisi?"</div>
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
                <div style={{width:26,height:26,borderRadius:7,background:'var(--accent-light)',border:'1px solid var(--accent-border)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:2}}><Bot size={13} color="var(--accent)"/></div>
                <div style={{flex:1,minWidth:0}}>
                  {msg.content.dateRange&&<div style={{display:'inline-flex',alignItems:'center',gap:4,fontSize:10,color:'var(--text-muted)',background:'var(--bg-elevated)',padding:'3px 8px',borderRadius:4,marginBottom:8,border:'1px solid var(--border-subtle)'}}><Calendar size={10}/>{msg.content.dateRange}</div>}
                  {msg.content.aiSummary&&<div style={{background:'var(--accent-light)',border:'1px solid var(--accent-border)',borderRadius:'var(--radius-sm)',padding:'10px 14px',marginBottom:12,fontSize:13,color:'var(--text-primary)',lineHeight:1.6}}><Sparkles size={12} color="var(--accent)" style={{display:'inline',marginRight:6}}/>{ msg.content.aiSummary}</div>}
                  {msg.content.kpis&&<KpiGrid data={msg.content.kpis} isMobile={isMobile}/>}
                  {msg.content.sqlData&&<SqlTable data={msg.content.sqlData} isMobile={isMobile}/>}
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

      <div style={{padding:isMobile?'4px 10px':'6px 20px',display:'flex',gap:5,flexWrap:'wrap'}}>
        {SMART_CHIPS.map(c=>(<button key={c.id} onClick={()=>setInput(c.prompt)} style={{background:'var(--bg-card)',border:'1px solid var(--border-subtle)',borderRadius:16,padding:isMobile?'4px 10px':'5px 12px',color:'var(--text-secondary)',fontSize:11,cursor:'pointer',fontFamily:'inherit',transition:'all 0.15s'}} onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--accent-border)';e.currentTarget.style.color='var(--accent)'}} onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border-subtle)';e.currentTarget.style.color='var(--text-secondary)'}}>{c.label}</button>))}
      </div>

      <div className="safe-bottom" style={{padding:isMobile?'8px 10px 12px':'10px 20px 16px',position:'relative'}}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleSend()} placeholder="Herhangi bir soru sor... (örn: en çok satan 5 ürün)" style={{width:'100%',padding:'12px 48px 12px 14px',background:'var(--bg-card)',border:'1px solid var(--border-subtle)',borderRadius:'var(--radius-md)',color:'var(--text-primary)',fontSize:14,outline:'none',fontFamily:'inherit',boxSizing:'border-box',boxShadow:'var(--shadow-sm)',transition:'border-color 0.2s, box-shadow 0.2s'}}
          onFocus={e=>{e.target.style.borderColor='var(--accent)';e.target.style.boxShadow='0 0 0 3px var(--accent-muted)'}} onBlur={e=>{e.target.style.borderColor='var(--border-subtle)';e.target.style.boxShadow='var(--shadow-sm)'}}/>
        <button onClick={()=>handleSend()} style={{position:'absolute',right:isMobile?16:26,top:'50%',transform:'translateY(-50%)',width:34,height:34,borderRadius:9,background:input.trim()?'var(--accent)':'transparent',border:'none',cursor:input.trim()?'pointer':'default',display:'flex',alignItems:'center',justifyContent:'center'}}><Send size={15} color={input.trim()?'#fff':'var(--text-muted)'}/></button>
      </div>

      <style>{`@keyframes pulse{0%,80%,100%{transform:scale(.5);opacity:.3}40%{transform:scale(1);opacity:1}}`}</style>
    </div>
  )
}
