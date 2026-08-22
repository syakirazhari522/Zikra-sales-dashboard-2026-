"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

type Sale = { id:number; formCode:string; classTitle:string; product:string; quantity:number; listPrice:number; revenue:number; submittedAt:string; confirmedAt:string };
type Period = "day" | "week" | "month" | "all";
const money = new Intl.NumberFormat("ms-MY", { style:"currency", currency:"MYR", minimumFractionDigits:0, maximumFractionDigits:2 });
const integer = new Intl.NumberFormat("ms-MY");
const shortDate = new Intl.DateTimeFormat("ms-MY", { day:"numeric", month:"short" });
const fullDate = new Intl.DateTimeFormat("ms-MY", { day:"numeric", month:"short", year:"numeric" });

function startOfPeriod(maxDate:Date, period:Period) {
  const start = new Date(maxDate); start.setHours(0,0,0,0);
  if (period === "day") return start;
  if (period === "week") { const day = start.getDay() || 7; start.setDate(start.getDate() - day + 1); return start; }
  if (period === "month") { start.setDate(1); return start; }
  return new Date(0);
}

export default function Home() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [period, setPeriod] = useState<Period>("month");
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const loadSales = async () => {
      try {
        const live = await fetch("/api/sales", { cache: "no-store" });
        const liveData = live.ok ? (await live.json()) as Sale[] : [];
        const data = liveData.length
          ? liveData
          : (await (await fetch("/data/sales.json", { cache: "no-store" })).json()) as Sale[];
        if (active && data.length) setSales(data);
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadSales();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!supabaseUrl || !publishableKey) return () => { active = false; };

    const supabase = createClient(supabaseUrl, publishableKey);
    const channel = supabase
      .channel("public-sales-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "sales" }, () => {
        void loadSales();
      })
      .subscribe();

    return () => { active = false; void supabase.removeChannel(channel); };
  }, []);
  const maxDate = useMemo(() => sales.length ? new Date(Math.max(...sales.map(s => Date.parse(s.confirmedAt)))) : new Date(), [sales]);
  const classes = useMemo(() => [...new Set(sales.map(s => s.classTitle.trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"ms")), [sales]);
  const periodFiltered = useMemo(() => {
    const start = startOfPeriod(maxDate, period);
    return sales.filter(s => { const date = new Date(s.confirmedAt); return period === "all" || (date >= start && date <= maxDate); });
  }, [maxDate, period, sales]);
  const filtered = useMemo(() => periodFiltered.filter(s => selectedClasses.length === 0 || selectedClasses.includes(s.classTitle)), [periodFiltered, selectedClasses]);
  const toggleClass = (name:string) => setSelectedClasses(current => current.includes(name) ? current.filter(item => item !== name) : [...current, name]);
  const metrics = useMemo(() => {
    const revenue = filtered.reduce((sum,s) => sum+s.revenue, 0); const paid = filtered.filter(s => s.revenue > 0);
    return { revenue, orders:filtered.length, paidOrders:paid.length, freeOrders:filtered.length-paid.length, registrations:filtered.reduce((sum,s)=>sum+s.quantity,0), average:paid.length ? revenue/paid.length : 0 };
  }, [filtered]);
  const trend = useMemo(() => {
    const grouped = new Map<string,number>(); filtered.forEach(s => { const key=s.confirmedAt.slice(0,10); grouped.set(key,(grouped.get(key)??0)+s.revenue); });
    return [...grouped.entries()].sort(([a],[b])=>a.localeCompare(b)).slice(period === "all" ? -45 : undefined).map(([date,value])=>({date,value}));
  }, [filtered,period]);
  const maxTrend = Math.max(...trend.map(i=>i.value),1);
  const topClasses = useMemo(() => {
    const grouped = new Map<string,{revenue:number;orders:number}>(); filtered.forEach(s=>{ const value=grouped.get(s.classTitle)??{revenue:0,orders:0}; value.revenue+=s.revenue; value.orders+=1; grouped.set(s.classTitle,value); });
    return [...grouped.entries()].sort(([,a],[,b])=>b.revenue-a.revenue).slice(0,5);
  },[filtered]);
  const topRevenue = Math.max(...topClasses.map(([,v])=>v.revenue),1);
  const classSummary = useMemo(() => {
    const grouped = new Map<string,{revenue:number;orders:number;paid:number;free:number;quantity:number}>();
    periodFiltered.forEach(s=>{ const value=grouped.get(s.classTitle)??{revenue:0,orders:0,paid:0,free:0,quantity:0}; value.revenue+=s.revenue; value.orders+=1; value.quantity+=s.quantity; if(s.revenue>0)value.paid+=1;else value.free+=1; grouped.set(s.classTitle,value); });
    return [...grouped.entries()].sort(([,a],[,b])=>b.revenue-a.revenue);
  },[periodFiltered]);
  const periodLabel = {day:"Hari terakhir",week:"Minggu semasa",month:"Bulan semasa",all:"Semua data"}[period];

  return <main className="dashboard-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">Z</div><div><strong>Jualan Zikra</strong><span>Dashboard 2026</span></div></div>
      <nav aria-label="Navigasi utama"><button className="nav-item active"><span>01</span>Ringkasan</button><button className="nav-item" disabled><span>02</span>Transaksi</button><button className="nav-item" disabled><span>03</span>Produk</button></nav>
      <div className="sidebar-note"><span className="status-dot"/><div><strong>Sync automatik aktif</strong><p>{integer.format(sales.length)} rekod dimuatkan</p></div></div>
      <div className="profile"><div className="avatar">SA</div><div><strong>Syakir Azhari</strong><span>Administrator</span></div></div>
    </aside>
    <section className="content">
      <header className="topbar"><div><p className="eyebrow">Prestasi jualan 2026</p><h1>Dashboard Jualan Zikra</h1><p className="subtitle">Data disahkan sehingga {fullDate.format(maxDate)}</p></div><div className="header-actions"><span className="sync-badge"><span className="status-dot"/>Google Sheet disambungkan</span><button className="export-button" onClick={()=>window.print()}>Cetak laporan</button></div></header>
      <div className="filter-row"><div className="period-tabs" aria-label="Tempoh laporan">{(["day","week","month","all"] as Period[]).map(value=><button key={value} className={period===value?"selected":""} onClick={()=>setPeriod(value)}>{{day:"Harian",week:"Mingguan",month:"Bulanan",all:"Keseluruhan"}[value]}</button>)}</div><div className="multi-select-wrap"><span>Lihat jualan mengikut kelas</span><details className="multi-select"><summary>{selectedClasses.length===0?"Semua kelas":selectedClasses.length===1?selectedClasses[0]:`${selectedClasses.length} kelas dipilih`}</summary><div className="multi-select-menu"><label className="select-all"><input type="checkbox" checked={selectedClasses.length===0} onChange={()=>setSelectedClasses([])}/>Semua kelas</label><div className="multi-select-options">{classes.map(name=><label key={name}><input type="checkbox" checked={selectedClasses.includes(name)} onChange={()=>toggleClass(name)}/><span>{name}</span></label>)}</div>{selectedClasses.length>0&&<button type="button" onClick={()=>setSelectedClasses([])}>Kosongkan pilihan</button>}</div></details></div></div>
      {loading ? <div className="loading">Menyediakan data jualan…</div> : <>
        <section className="metrics-grid" aria-label="Metrik utama">
          <article className="metric-card featured"><div className="metric-head"><span>Jumlah jualan</span><b>RM</b></div><strong>{money.format(metrics.revenue)}</strong><p>{periodLabel} · transaksi disahkan</p></article>
          <article className="metric-card featured-secondary"><div className="metric-head"><span>Jumlah pendaftaran</span><b>Q</b></div><strong>{integer.format(metrics.registrations)}</strong><p>{periodLabel} · berdasarkan jumlah kuantiti</p></article>
          <article className="metric-card"><div className="metric-head"><span>Jumlah transaksi</span><b>#</b></div><strong>{integer.format(metrics.orders)}</strong><p>{integer.format(metrics.paidOrders)} berbayar · {integer.format(metrics.freeOrders)} percuma</p></article>
          <article className="metric-card"><div className="metric-head"><span>Purata pesanan</span><b>↗</b></div><strong>{money.format(metrics.average)}</strong><p>Berdasarkan transaksi berbayar</p></article>
        </section>
        <section className="analytics-grid">
          <article className="panel trend-panel"><div className="panel-heading"><div><span className="panel-kicker">REVENUE TREND</span><h2>Prestasi harian</h2></div><span className="legend"><i/>Jualan</span></div>{trend.length?<div className="chart" role="img" aria-label="Carta jualan harian"><div className="y-label top">{money.format(maxTrend)}</div><div className="y-label middle">{money.format(maxTrend/2)}</div><div className="grid-line top-line"/><div className="grid-line mid-line"/><div className="grid-line base-line"/><div className="bars">{trend.map((item,index)=><div className="bar-slot" key={item.date} title={`${fullDate.format(new Date(item.date))}: ${money.format(item.value)}`}><div className="bar" style={{height:`${Math.max((item.value/maxTrend)*100,item.value?2:0)}%`}}/>{(index===0||index===trend.length-1||index%Math.ceil(trend.length/5)===0)&&<span>{shortDate.format(new Date(item.date))}</span>}</div>)}</div></div>:<div className="empty">Tiada jualan dalam tempoh ini.</div>}</article>
          <article className="panel top-panel"><div className="panel-heading"><div><span className="panel-kicker">TOP PROGRAM</span><h2>Kelas terbaik</h2></div></div><div className="ranking">{topClasses.map(([name,value],index)=><div className="rank-row" key={name}><span className="rank-number">{String(index+1).padStart(2,"0")}</span><div className="rank-main"><div><strong>{name}</strong><span>{integer.format(value.orders)} transaksi</span></div><div className="progress"><i style={{width:`${(value.revenue/topRevenue)*100}%`}}/></div></div><b>{money.format(value.revenue)}</b></div>)}</div></article>
        </section>
        <section className="panel class-panel"><div className="panel-heading"><div><span className="panel-kicker">PECAHAN KELAS</span><h2>Jualan dan pendaftaran mengikut kelas</h2><p className="panel-description">Nama kelas menggunakan kolum “Tiket” dalam Google Sheet; “Tajuk Borang” digunakan jika Tiket kosong.</p></div>{selectedClasses.length>0&&<button className="clear-filter" onClick={()=>setSelectedClasses([])}>Tunjuk semua kelas</button>}</div><div className="table-wrap"><table className="class-table"><thead><tr><th>Kelas</th><th>Jualan</th><th>Pendaftaran</th><th>Transaksi</th><th>Berbayar</th><th>Percuma</th><th></th></tr></thead><tbody>{classSummary.map(([name,value])=><tr key={name} className={selectedClasses.includes(name)?"active-class":""}><td><strong>{name}</strong></td><td><strong>{money.format(value.revenue)}</strong></td><td>{integer.format(value.quantity)}</td><td>{integer.format(value.orders)}</td><td>{integer.format(value.paid)}</td><td>{integer.format(value.free)}</td><td><button className="class-filter-button" onClick={()=>toggleClass(name)} aria-label={`${selectedClasses.includes(name)?"Buang":"Pilih"} kelas ${name}`}>{selectedClasses.includes(name)?"Dipilih":"Pilih"}</button></td></tr>)}</tbody></table></div></section>
        <section className="panel recent-panel"><div className="panel-heading"><div><span className="panel-kicker">AKTIVITI TERKINI</span><h2>Transaksi terkini</h2></div><span className="privacy-note">Maklumat pelanggan dilindungi</span></div><div className="table-wrap"><table><thead><tr><th>ID</th><th>Tarikh disahkan</th><th>Kelas</th><th>Pendaftaran</th><th>Status</th><th>Jumlah</th></tr></thead><tbody>{[...filtered].sort((a,b)=>Date.parse(b.confirmedAt)-Date.parse(a.confirmedAt)).slice(0,8).map((s,index)=><tr key={`${s.id}-${index}`}><td>#{String(s.id).padStart(4,"0")}</td><td>{fullDate.format(new Date(s.confirmedAt))}</td><td><strong>{s.classTitle}</strong><span>{s.formCode}</span></td><td>{s.quantity}</td><td><span className={s.revenue>0?"paid":"free"}>{s.revenue>0?"Berbayar":"Percuma"}</span></td><td><strong>{money.format(s.revenue)}</strong></td></tr>)}</tbody></table></div></section>
      </>}
    </section>
  </main>;
}
