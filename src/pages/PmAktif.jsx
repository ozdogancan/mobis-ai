import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getAIInsight, prepareDataContext } from '../lib/gemini'
import { Bot, ArrowLeft, ShoppingCart, Send, Menu, Calendar } from 'lucide-react'
import KpiGrid from '../components/KpiGrid'
import InsightCard from '../components/InsightCard'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const COLORS = ['#0d9264', '#0891b2', '#7c3aed', '#d97706', '#dc2626', '#2563eb', '#ec4899', '#64748b']

const SMART_CHIPS = [
  { id: 'rapor', label: '📊 Genel Rapor', prompt: 'PM Aktif genel rapor ve özet göster' },
  { id: 'iptal', label: '❌ İptaller', prompt: 'Otomatik iptal edilen siparişleri analiz et' },
  { id: 'bayi', label: '🏪 Bayiler', prompt: 'Bayi bazlı performans karşılaştırması yap' },
  { id: 'kategori', label: '📦 Kategoriler', prompt: 'Kategori bazlı ciro dağılımını göster' },
]

function analyzeData(orders, query) {
  const q = query.toLowerCase()
  const totalRows = orders.length
  const uniqueOrders = [...new Set(orders.map(o => o.pma_siparis_kodu))].length
  const totalBrut = orders.reduce((s, o) => s + (Number(o.son_brut_ciro) || 0), 0)
  const totalIndirim = orders.reduce((s, o) => s + (Number(o.son_indirim_tutari) || 0), 0)
  const indirimOran = totalBrut > 0 ? ((totalIndirim / totalBrut) * 100).toFixed(1) : 0
  const bayiMap = {}, kategoriMap = {}, karsilanmaMap = {}, onayMap = {}
  orders.forEach(o => {
    const b=o.bayi||'?'; if(!bayiMap[b]) bayiMap[b]={count:0,brut:0,iptal:0,red:0}
    bayiMap[b].count++; bayiMap[b].brut+=Number(o.son_brut_ciro)||0
    if(o.onay_durumu==='Otomatik \u0130ptal') bayiMap[b].iptal++
    if(o.onay_durumu==='Reddedildi') bayiMap[b].red++
    const k=o.kategori||'?'; if(!kategoriMap[k]) kategoriMap[k]={count:0,brut:0}
    kategoriMap[k].count++; kategoriMap[k].brut+=Number(o.son_brut_ciro)||0
    karsilanmaMap[o.karsilanma_durumu||'?']=(karsilanmaMap[o.karsilanma_durumu||'?']||0)+1
    onayMap[o.onay_durumu||'?']=(onayMap[o.onay_durumu||'?']||0)+1
  })
  const teslim=orders.filter(o=>o.teslim_suresi_gun!=null)
  const avgTeslim=teslim.length?(teslim.reduce((s,o)=>s+o.teslim_suresi_gun,0)/teslim.length).toFixed(1):'N/A'
  const gecikme5=teslim.filter(o=>o.teslim_suresi_gun>=5).length
  const iptalOrders=orders.filter(o=>o.onay_durumu==='Otomatik \u0130ptal')
  const iptalCount=[...new Set(iptalOrders.map(o=>o.pma_siparis_kodu))].length
  const redOrders=orders.filter(o=>o.onay_durumu==='Reddedildi')
  const eksikOrders=orders.filter(o=>o.karsilanma_durumu?.includes('Eksik'))
  const tamKarsilanan=karsilanmaMap['Tam kar\u015f\u0131lanan sipari\u015f']||0
  const tamOran=totalRows>0?((tamKarsilanan/totalRows)*100).toFixed(1):0
  const activeBayis=Object.keys(bayiMap).length
  const plasiyerSayisi=[...new Set(orders.map(o=>o.plasiyer))].length
  const kacanBrut=[...iptalOrders,...redOrders].reduce((s,o)=>s+(Number(o.son_brut_ciro)||0),0)
  const fmt=(v)=>v>=1e9?(v/1e9).toFixed(1)+'B \u20ba':v>=1e6?(v/1e6).toFixed(1)+'M \u20ba':v>=1e3?(v/1e3).toFixed(1)+'K \u20ba':Math.round(v).toLocaleString('tr-TR')+' \u20ba'
  const fmtN=(v)=>v.toLocaleString('tr-TR')
  const dates=orders.map(o=>o.siparis_tarihi||o.created_at).filter(Boolean).sort()
  const dateRange=dates.length>0?new Date(dates[0]).toLocaleDateString('tr-TR',{day:'numeric',month:'long'})+' \u2013 '+new Date(dates[dates.length-1]).toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:'numeric'}):'Ocak 2026'
  const result={kpis:[],insights:[],charts:[],dateRange}

  if(q.includes('rapor')||q.includes('\u00f6zet')||q.includes('g\u00f6ster')||q.includes('genel')||q.includes('analiz et')) {
    result.kpis=[
      {label:'Sipari\u015f',value:fmtN(uniqueOrders),sub:fmtN(totalRows)+' kalem',icon:'orders',color:'#0d9264'},
      {label:'Br\u00fct Ciro',value:fmt(totalBrut),sub:'Toplam',icon:'revenue',color:'#0891b2'},
      {label:'\u0130ndirim',value:fmt(totalIndirim),sub:'%'+indirimOran,icon:'decline',color:'#d97706'},
      {label:'Bayi',value:activeBayis.toString(),sub:plasiyerSayisi+' plasiyer',icon:'dealers',color:'#2563eb'},
      {label:'Kar\u015f\u0131lanma',value:'%'+tamOran,sub:fmtN(tamKarsilanan)+' tam',icon:'success',color:'#059669'},
      {label:'Teslim',value:avgTeslim+' g\u00fcn',sub:'Ortalama',icon:'delivery',color:'#0891b2'},
    ]
    result.charts.push({type:'bar',title:'Kategori Bazl\u0131 Br\u00fct Ciro',data:Object.entries(kategoriMap).sort((a,b)=>b[1].brut-a[1].brut).slice(0,6).map(([n,d])=>({name:n.length>14?n.slice(0,14)+'\u2026':n,value:d.brut}))})
    result.charts.push({type:'pie',title:'Onay Durumu Da\u011f\u0131l\u0131m\u0131',data:Object.entries(onayMap).map(([n,v])=>({name:n,value:v}))})
    result.insights.push({type:'info',title:'D\u00f6nem \u00d6zeti: '+dateRange,description:fmtN(uniqueOrders)+' benzersiz sipari\u015f, '+fmtN(totalRows)+' kalem i\u015flem. '+activeBayis+' aktif bayi, '+plasiyerSayisi+' plasiyer.'})
    if(Number(tamOran)>=90) result.insights.push({type:'success',title:'Kar\u015f\u0131lanma Oran\u0131 G\u00fc\u00e7l\u00fc: %'+tamOran,description:'Sipari\u015flerin b\u00fcy\u00fck \u00e7o\u011funlu\u011fu tam kar\u015f\u0131lanm\u0131\u015f. Stok y\u00f6netimi verimli.'})
    else if(Number(tamOran)>=80) result.insights.push({type:'info',title:'Kar\u015f\u0131lanma: %'+tamOran,description:fmtN(eksikOrders.length)+' kalem eksik kar\u015f\u0131lanm\u0131\u015f. Stok planlama ile %90+ hedeflenebilir.'})
    else result.insights.push({type:'warning',title:'Kar\u015f\u0131lanma D\u00fc\u015f\u00fck: %'+tamOran,description:fmtN(eksikOrders.length)+' kalem eksik. Kategori bazl\u0131 stok analizi yap\u0131lmal\u0131.'})
    if(iptalOrders.length>0){const io=((iptalOrders.length/totalRows)*100).toFixed(1);result.insights.push({type:io>10?'critical':'warning',title:'Otomatik \u0130ptal: '+fmtN(iptalOrders.length)+' kalem (%'+io+')',description:'Plasiyerler 8 g\u00fcn i\u00e7inde onaylamad\u0131\u011f\u0131 i\u00e7in '+fmtN(iptalCount)+' sipari\u015f iptal olmu\u015f. Kay\u0131p ciro: '+fmt(kacanBrut)+'.'})}
    if(Number(indirimOran)>15) result.insights.push({type:'warning',title:'Y\u00fcksek \u0130ndirim: %'+indirimOran,description:'\u0130ndirim oran\u0131 %15 \u00fczeri. Kampanya etkinli\u011fi ve marj etkisi de\u011ferlendirilmeli.'})
    if(gecikme5>0){const go=((gecikme5/teslim.length)*100).toFixed(1);result.insights.push({type:go>20?'warning':'info',title:'Gecikmeli Teslim: '+fmtN(gecikme5)+' kalem',description:'Teslim edilenlerin %'+go+"\'\u0131 5+ g\u00fcn s\u00fcrm\u00fc\u015f. Ort: "+avgTeslim+' g\u00fcn.'})}
    const topKat=Object.entries(kategoriMap).sort((a,b)=>b[1].brut-a[1].brut).slice(0,3)
    if(topKat.length>0) result.insights.push({type:'recommendation',title:'Kategori Konsantrasyonu',description:'Top 3: '+topKat.map(([n,d])=>n+' ('+fmt(d.brut)+')').join(', ')+'. Stok derinli\u011fi ve kampanya \u00f6nceliklendirilmeli.'})
  } else if(q.includes('iptal')) {
    const ib={};iptalOrders.forEach(o=>{if(!ib[o.bayi])ib[o.bayi]={count:0,brut:0};ib[o.bayi].count++;ib[o.bayi].brut+=Number(o.son_brut_ciro)||0})
    const iptalBrut=iptalOrders.reduce((s,o)=>s+(Number(o.son_brut_ciro)||0),0)
    result.kpis=[
      {label:'Oto. \u0130ptal',value:iptalCount.toString(),sub:fmtN(iptalOrders.length)+' kalem',icon:'cancel',color:'#dc2626'},
      {label:'Kay\u0131p Ciro',value:fmt(iptalBrut),sub:'\u0130ptal br\u00fct',icon:'decline',color:'#dc2626'},
      {label:'Etkilenen Bayi',value:Object.keys(ib).length.toString(),sub:activeBayis+' bayiden',icon:'dealers',color:'#d97706'},
    ]
    result.charts.push({type:'bar',title:'Bayi Bazl\u0131 \u0130ptal',data:Object.entries(ib).sort((a,b)=>b[1].count-a[1].count).slice(0,8).map(([n,d])=>({name:n.length>18?n.slice(0,18)+'\u2026':n,value:d.count}))})
    result.insights.push({type:'info',title:'D\u00f6nem: '+dateRange,description:fmtN(iptalOrders.length)+' kalem otomatik iptal. Toplam '+fmtN(totalRows)+' kalemin %'+((iptalOrders.length/totalRows)*100).toFixed(1)+"\'i."})
    const topIB=Object.entries(ib).sort((a,b)=>b[1].count-a[1].count).slice(0,3)
    if(topIB.length>0) result.insights.push({type:'critical',title:'En \u00c7ok \u0130ptal Eden Bayiler',description:topIB.map(([n,d])=>n+': '+d.count+' kalem ('+fmt(d.brut)+')').join(' | ')+'. Plasiyerlerle acil g\u00f6r\u00fc\u015fme yap\u0131lmal\u0131.'})
    if(iptalBrut>0) result.insights.push({type:'warning',title:'Kay\u0131p Ciro: '+fmt(iptalBrut),description:'Toplam br\u00fct cironun %'+((iptalBrut/totalBrut)*100).toFixed(1)+"\'ine denk. Otomatik hat\u0131rlatma sistemi \u00f6nerilir."})
    result.insights.push({type:'recommendation',title:'Aksiyon \u00d6nerisi',description:'Plasiyerlere onay s\u00fcresi yakla\u015ft\u0131\u011f\u0131nda push bildirim, 5. g\u00fcnden sonra b\u00f6lge m\u00fcd\u00fcr\u00fcne escalation \u00f6nerilir.'})
  } else if(q.includes('bayi')||q.includes('performans')) {
    result.kpis=[{label:'Toplam Bayi',value:activeBayis.toString(),sub:plasiyerSayisi+' plasiyer',icon:'dealers',color:'#2563eb'}]
    result.charts.push({type:'bar',title:'Top 8 Bayi (Ciro)',data:Object.entries(bayiMap).sort((a,b)=>b[1].brut-a[1].brut).slice(0,8).map(([n,d])=>({name:n.length>18?n.slice(0,18)+'\u2026':n,value:d.brut}))})
    result.insights.push({type:'info',title:'D\u00f6nem: '+dateRange,description:activeBayis+' aktif bayi, '+plasiyerSayisi+' plasiyer ile '+fmt(totalBrut)+' br\u00fct ciro.'})
    const topBayiler=Object.entries(bayiMap).sort((a,b)=>b[1].brut-a[1].brut)
    const top5Brut=topBayiler.slice(0,5).reduce((s,[,d])=>s+d.brut,0)
    const top5Oran=totalBrut>0?((top5Brut/totalBrut)*100).toFixed(1):0
    result.insights.push({type:Number(top5Oran)>60?'warning':'info',title:'Bayi Konsantrasyonu: Top 5 = %'+top5Oran,description:'\u0130lk 5 bayi cironun %'+top5Oran+"\'ini olu\u015fturuyor."+(Number(top5Oran)>60?' Y\u00fcksek ba\u011f\u0131ml\u0131l\u0131k riski \u2014 orta segment bayiler geli\u015ftirilmeli.':' Da\u011f\u0131l\u0131m dengeli.')})
    const sorunlu=Object.entries(bayiMap).filter(([,d])=>d.iptal>3||d.red>2)
    if(sorunlu.length>0) result.insights.push({type:'warning',title:sorunlu.length+' Bayi Dikkat Gerektiriyor',description:'Y\u00fcksek iptal/red oranl\u0131 bayiler tespit edildi. \u00d6zel g\u00f6r\u00fc\u015fme planlanmal\u0131.'})
  } else if(q.includes('kategori')||q.includes('da\u011f\u0131l\u0131m')) {
    result.charts.push({type:'pie',title:'Kategori Ciro Da\u011f\u0131l\u0131m\u0131',data:Object.entries(kategoriMap).sort((a,b)=>b[1].brut-a[1].brut).slice(0,8).map(([n,d])=>({name:n.length>16?n.slice(0,16)+'\u2026':n,value:d.brut}))})
    result.charts.push({type:'bar',title:'Kategori Kalem Say\u0131s\u0131',data:Object.entries(kategoriMap).sort((a,b)=>b[1].count-a[1].count).slice(0,6).map(([n,d])=>({name:n.length>14?n.slice(0,14)+'\u2026':n,value:d.count}))})
    const sk=Object.entries(kategoriMap).sort((a,b)=>b[1].brut-a[1].brut)
    result.insights.push({type:'info',title:'D\u00f6nem: '+dateRange,description:sk.length+' kategoride '+fmtN(totalRows)+' kalem i\u015flem.'})
    if(sk.length>0){const o=totalBrut>0?((sk[0][1].brut/totalBrut)*100).toFixed(1):0;result.insights.push({type:'success',title:'Lider: '+sk[0][0],description:fmt(sk[0][1].brut)+' ciro ile toplam\u0131n %'+o+"\'i. "+sk[0][1].count+' kalem.'})}
    if(sk.length>=3){const bot=sk.slice(-3);result.insights.push({type:'recommendation',title:'D\u00fc\u015f\u00fck Kategoriler',description:bot.map(([n,d])=>n+' ('+fmt(d.brut)+')').join(', ')+'. Cross-sell f\u0131rsatlar\u0131 de\u011ferlendirilmeli.'})}
  } else {
    result.insights.push({type:'info',title:'PM Aktif: '+dateRange,description:fmtN(uniqueOrders)+' sipari\u015f, '+fmtN(totalRows)+' kalem, '+fmt(totalBrut)+' br\u00fct ciro. "Genel rapor", "iptal analizi", "bayi performans" veya "kategori da\u011f\u0131l\u0131m\u0131" deneyin.'})
  }
  return result
}

function ChartRenderer({chart}) {
  const ts={background:'#fff',border:'1px solid #e2e4e9',borderRadius:8,fontFamily:'DM Sans',fontSize:12,boxShadow:'0 4px 12px rgba(0,0,0,0.08)'}
  if(chart.type==='bar') return (
    <div style={{background:'var(--bg-card)',borderRadius:'var(--radius-md)',padding:'14px 14px 10px',border:'1px solid var(--border-subtle)'}}>
      <h4 style={{fontSize:11,color:'var(--text-muted)',marginBottom:10,fontWeight:500}}>{chart.title}</h4>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={chart.data} layout="vertical" margin={{left:0,right:10}}>
          <XAxis type="number" tick={{fill:'#8b939f',fontSize:9}} tickFormatter={v=>v>=1e6?(v/1e6).toFixed(1)+'M':v>=1e3?(v/1e3).toFixed(0)+'K':v}/>
          <YAxis type="category" dataKey="name" width={100} tick={{fill:'#6b7280',fontSize:10}}/>
          <Tooltip contentStyle={ts} formatter={v=>[v.toLocaleString('tr-TR'),'Değer']}/>
          <Bar dataKey="value" radius={[0,4,4,0]}>{chart.data.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}</Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
  if(chart.type==='pie') return (
    <div style={{background:'var(--bg-card)',borderRadius:'var(--radius-md)',padding:'14px 14px 10px',border:'1px solid var(--border-subtle)'}}>
      <h4 style={{fontSize:11,color:'var(--text-muted)',marginBottom:10,fontWeight:500}}>{chart.title}</h4>
      <ResponsiveContainer width="100%" height={180}>
        <PieChart><Pie data={chart.data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={40} paddingAngle={2}>
          {chart.data.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}</Pie>
          <Tooltip contentStyle={ts} formatter={v=>[v.toLocaleString('tr-TR'),'Adet']}/>
        </PieChart>
      </ResponsiveContainer>
      <div style={{display:'flex',flexWrap:'wrap',gap:6,justifyContent:'center'}}>
        {chart.data.map((item,i)=>(
          <div key={i} style={{display:'flex',alignItems:'center',gap:3,fontSize:10,color:'var(--text-muted)'}}>
            <div style={{width:6,height:6,borderRadius:1,background:COLORS[i%COLORS.length]}}/>{item.name}
          </div>
        ))}
      </div>
    </div>
  )
  return null
}

export default function PmAktif({initialQuery,onBack,isMobile,onMenuOpen}) {
  const [messages,setMessages]=useState([])
  const [input,setInput]=useState('')
  const [loading,setLoading]=useState(false)
  const endRef=useRef(null)
  const init=useRef(false)

  useEffect(()=>{endRef.current?.scrollIntoView({behavior:'smooth'})},[messages])
  useEffect(()=>{
    if(initialQuery&&!init.current){init.current=true;handleSend(initialQuery)}
  },[initialQuery])

  const handleSend=async(queryText)=>{
    const query=queryText||input; if(!query.trim())return; setInput('')
    const newMsgs=[...messages,{role:'user',content:query}]; setMessages(newMsgs); setLoading(true)

    try {
      const {data:orders,error}=await supabase.from('pm_aktif_orders').select('*').eq('ay','2026-01')
      if(error) throw error
      if(!orders?.length){
        setMessages([...newMsgs,{role:'assistant',content:{insights:[{type:'warning',title:'Veri bulunamadı',description:'Bu dönem için veri mevcut değil.'}]}}])
        setLoading(false); return
      }

      const ruleResult=analyzeData(orders,query)
      const dataContext=prepareDataContext(orders)
      const aiResult=await getAIInsight(dataContext,query)

      setMessages([...newMsgs,{role:'assistant',content:{
        kpis:ruleResult.kpis, charts:ruleResult.charts, dateRange:ruleResult.dateRange,
        insights:aiResult?.insights||ruleResult.insights||[],
        aiSummary:aiResult?.summary||null, isAI:!!aiResult,
        aiUnavailable:!aiResult,
      }}])
    } catch(err) {
      setMessages([...newMsgs,{role:'assistant',content:{insights:[{type:'critical',title:'Hata',description:err.message}]}}])
    }
    setLoading(false)
  }

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      {/* Header */}
      <div style={{
        padding:isMobile?'10px 12px':'10px 20px',
        borderBottom:'1px solid var(--border-subtle)',
        display:'flex',alignItems:'center',gap:8,background:'var(--bg-surface)',
      }}>
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
                <div style={{
                  background:'var(--accent)',color:'#fff',
                  borderRadius:'14px 14px 4px 14px',
                  padding:'10px 14px',maxWidth:isMobile?'85%':'65%',
                  fontSize:13,fontWeight:500,lineHeight:1.5,
                }}>{msg.content}</div>
              </div>
            ):(
              <div style={{display:'flex',gap:8,alignItems:'flex-start'}}>
                <div style={{
                  width:26,height:26,borderRadius:7,
                  background:'var(--accent-light)',border:'1px solid var(--accent-border)',
                  display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:2,
                }}><Bot size={13} color="var(--accent)"/></div>
                <div style={{flex:1,minWidth:0}}>
                  {msg.content.dateRange&&(
                    <div style={{display:'inline-flex',alignItems:'center',gap:4,fontSize:10,color:'var(--text-muted)',background:'var(--bg-elevated)',padding:'3px 8px',borderRadius:4,marginBottom:8,border:'1px solid var(--border-subtle)'}}>
                      <Calendar size={10}/> {msg.content.dateRange}
                    </div>
                  )}
                  {msg.content.isAI&&(
                    <div style={{display:'inline-flex',alignItems:'center',gap:4,fontSize:10,color:'var(--success)',background:'var(--accent-light)',padding:'2px 8px',borderRadius:4,marginBottom:8,border:'1px solid var(--accent-border)'}}>✦ AI Analiz</div>
                  )}
                  {msg.content.aiUnavailable&&!msg.content.isAI&&msg.content.kpis?.length>0&&(
                    <div style={{display:'inline-flex',alignItems:'center',gap:4,fontSize:10,color:'var(--warning)',background:'#fffbeb',padding:'2px 8px',borderRadius:4,marginBottom:8,border:'1px solid #fde68a'}}>⚡ AI şu an meşgul — kural bazlı analiz gösteriliyor</div>
                  )}
                  {msg.content.aiSummary&&(
                    <div style={{
                      background:'var(--bg-card)',border:'1px solid var(--border-subtle)',
                      borderRadius:'var(--radius-sm)',padding:'10px 14px',marginBottom:12,
                      fontSize:13,color:'var(--text-secondary)',lineHeight:1.6,
                    }}>{msg.content.aiSummary}</div>
                  )}
                  {msg.content.kpis&&<KpiGrid data={msg.content.kpis} isMobile={isMobile}/>}
                  {msg.content.charts?.length>0&&(
                    <div style={{
                      display:'grid',
                      gridTemplateColumns:isMobile?'1fr':msg.content.charts.length>1?'1fr 1fr':'1fr',
                      gap:8,marginBottom:12,
                    }}>
                      {msg.content.charts.map((c,ci)=><ChartRenderer key={ci} chart={c}/>)}
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
            <div style={{width:26,height:26,borderRadius:7,background:'var(--accent-light)',border:'1px solid var(--accent-border)',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <Bot size={13} color="var(--accent)"/>
            </div>
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
          style={{
            width:'100%',padding:'12px 48px 12px 14px',
            background:'var(--bg-card)',border:'1px solid var(--border-subtle)',
            borderRadius:'var(--radius-md)',color:'var(--text-primary)',
            fontSize:14,outline:'none',fontFamily:'inherit',boxSizing:'border-box',
            boxShadow:'var(--shadow-sm)',transition:'border-color 0.2s, box-shadow 0.2s',
          }}
          onFocus={e=>{e.target.style.borderColor='var(--accent)';e.target.style.boxShadow='0 0 0 3px var(--accent-muted)'}}
          onBlur={e=>{e.target.style.borderColor='var(--border-subtle)';e.target.style.boxShadow='var(--shadow-sm)'}}
        />
        <button onClick={()=>handleSend()} style={{
          position:'absolute',right:isMobile?16:26,top:'50%',transform:'translateY(-50%)',
          width:34,height:34,borderRadius:9,
          background:input.trim()?'var(--accent)':'transparent',
          border:'none',cursor:input.trim()?'pointer':'default',
          display:'flex',alignItems:'center',justifyContent:'center',
        }}><Send size={15} color={input.trim()?'#fff':'var(--text-muted)'}/></button>
      </div>

      <style>{`@keyframes pulse{0%,80%,100%{transform:scale(.5);opacity:.3}40%{transform:scale(1);opacity:1}}`}</style>
    </div>
  )
}
