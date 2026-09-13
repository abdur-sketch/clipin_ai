"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, ArrowRight, ArrowUpRight, Bell, Check, CheckCircle2,
  CircleHelp, Clapperboard, Copy, Eye, Flame, FolderKanban, Gauge, HomeIcon,
  Instagram, Link2, MoreHorizontal, Music2, Pause, Pencil, Play, Plus,
  Rocket, Settings, Share2, Sparkles, TrendingUp, UploadCloud, X, Youtube,
} from "lucide-react";

type View = "dashboard" | "projects" | "clips" | "autopilot" | "settings";
type Clip = {
  id: number; score: number; duration: number; title: string; hook: string;
  caption: string; status: "ready" | "rendered"; accent: string;
};

const clips: Clip[] = [
  { id: 1, score: 94, duration: 34, title: "Jangan Memulai Bisnis Sebelum Tahu Ini", hook: "Kebanyakan pemula salah mulai dari sini.", caption: "Produk hebat bukan titik awal. Temukan masalah yang benar-benar ingin diselesaikan pelanggan.", status: "rendered", accent: "lime" },
  { id: 2, score: 91, duration: 28, title: "Rahasia Menemukan Ide Bisnis yang Tepat", hook: "Ide bagus selalu meninggalkan satu petunjuk.", caption: "Dengarkan keluhan yang terus berulang. Di sanalah peluang biasanya bersembunyi.", status: "ready", accent: "cyan" },
  { id: 3, score: 87, duration: 42, title: "Kenapa Produk Bagus Tetap Bisa Gagal?", hook: "Produk bagus saja ternyata tidak cukup.", caption: "Pasar, momentum, dan distribusi sering kali lebih menentukan daripada produk yang sempurna.", status: "rendered", accent: "violet" },
  { id: 4, score: 83, duration: 31, title: "Validasi Ide Tanpa Keluar Banyak Modal", hook: "Jangan produksi sebelum melakukan ini.", caption: "Uji minat orang dengan versi paling sederhana sebelum menghabiskan waktu dan biaya.", status: "ready", accent: "orange" },
  { id: 5, score: 78, duration: 36, title: "Kesalahan Pertama Founder Pemula", hook: "Kesalahan ini kelihatan produktif, padahal mahal.", caption: "Berhenti menambah fitur sebelum Anda memahami kebutuhan inti pengguna.", status: "ready", accent: "pink" },
  { id: 6, score: 74, duration: 25, title: "Mulai dari Masalah, Bukan Produk", hook: "Balik urutan berpikir Anda.", caption: "Masalah yang tajam akan membawa Anda pada produk yang jauh lebih relevan.", status: "rendered", accent: "blue" },
];

export default function Home() {
  const [view, setView] = useState<View>("dashboard");
  const [filter, setFilter] = useState<"all" | "hot" | "rendered">("all");
  const [editor, setEditor] = useState<Clip | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [toast, setToast] = useState("");
  const [upgradeOpen,setUpgradeOpen]=useState(false); const [profileOpen,setProfileOpen]=useState(false); const [plan,setPlan]=useState("Free plan");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(()=>{fetch("/api/account").then(response=>response.ok?response.json():null).then(data=>{if(data?.subscription?.plan==="pro")setPlan(data.subscription.status==="trialing"?"Pro trial":"Pro plan")}).catch(()=>{})},[]);

  const filtered = useMemo(() => clips.filter((clip) => {
    if (filter === "hot") return clip.score >= 85;
    if (filter === "rendered") return clip.status === "rendered";
    return true;
  }), [filter]);

  async function startUpload(source?: File | string) {
    setProgress(8); setProcessing(true);
    try {
      const file = source instanceof File ? source : undefined; const sourceUrl = typeof source === "string" ? source : undefined;
      const title = file?.name.replace(/\.[^.]+$/, "") || (sourceUrl ? "Video YouTube Baru" : "Podcast Bisnis: Mulai dari Nol");
      const created = await fetch("/api/projects", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title, filename: file?.name, contentType: file?.type, sourceUrl }) });
      if (!created.ok) throw new Error((await created.json()).error || "Gagal membuat project");
      const { project } = await created.json() as { project: { id: string } }; setProgress(22);
      if (file) {
        const uploaded = await fetch(`/api/projects/${project.id}/upload`, { method: "PUT", headers: { "content-type": file.type || "video/mp4" }, body: file });
        if (!uploaded.ok) throw new Error((await uploaded.json()).error || "Upload gagal"); setProgress(52);
      }
      const processed = await fetch(`/api/projects/${project.id}/process`, { method: "POST" });
      if (!processed.ok) throw new Error((await processed.json()).error || "Analisis gagal");
      setProgress(100); window.setTimeout(() => { setProcessing(false); setUploadOpen(false); setView("clips"); setToast("Analisis selesai — 6 klip terbaik ditemukan dan disimpan"); }, 500);
    } catch (error) { setProcessing(false); setToast(error instanceof Error ? error.message : "Terjadi kesalahan"); }
  }
  function go(next: View) { setView(next); window.scrollTo({ top: 0, behavior: "smooth" }); }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => go("dashboard")} aria-label="Buka dashboard"><span className="brand-mark"><Clapperboard /></span><span>CLIPIN<span className="brand-dot">.</span></span></button>
        <nav className="nav-list" aria-label="Navigasi utama">
          <button className={view === "dashboard" ? "active" : ""} onClick={() => go("dashboard")}><span><HomeIcon /></span>Dashboard</button>
          <button onClick={() => setUploadOpen(true)}><span><Plus /></span>New Project</button>
          <button className={view === "clips" ? "active" : ""} onClick={() => go("clips")}><span><Play /></span>My Clips <b>24</b></button>
          <button className={view === "projects" ? "active" : ""} onClick={() => go("projects")}><span><FolderKanban /></span>Projects</button>
          <button className={view === "autopilot" ? "active" : ""} onClick={() => go("autopilot")}><span><Rocket /></span>Autopilot <b>NEW</b></button>
        </nav>
        <div className="sidebar-bottom">
          <div className="usage-card"><div className="usage-icon"><Sparkles /></div><strong>{plan==="Free plan"?"8 dari 15":"8 dari 300"} menit</strong><span>Terpakai bulan ini</span><div className="usage-bar"><i style={{width:plan==="Free plan"?"54%":"3%"}} /></div><button onClick={() => setUpgradeOpen(true)}>Upgrade Plan <ArrowUpRight /></button></div>
          <button className={`settings-button ${view==="settings"?"active":""}`} onClick={() => go("settings")}><span><Settings /></span>Settings</button>
          <div className="profile-wrap"><div className="profile"><div className="avatar">AP</div><div><strong>Andi Pratama</strong><span>{plan}</span></div><button aria-label="Menu profil" onClick={() => setProfileOpen(!profileOpen)}><MoreHorizontal /></button></div>{profileOpen&&<div className="profile-menu"><button onClick={()=>{go("settings");setProfileOpen(false)}}>Account settings</button><button onClick={()=>{setUpgradeOpen(true);setProfileOpen(false)}}>Billing & plan</button><a href="/signout-with-chatgpt?return_to=/">Sign out</a></div>}</div>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <button className="mobile-brand" onClick={() => go("dashboard")}><span className="brand-mark"><Clapperboard /></span>CLIPIN.</button>
          <div className="breadcrumbs">Workspace <span>/</span> {view === "dashboard" ? "Dashboard" : view === "clips" ? "Detected Clips" : view === "autopilot" ? "Autopilot" : view==="settings"?"Settings":"Projects"}</div>
          <div className="top-actions"><button className="icon-button" aria-label="Bantuan" onClick={() => setToast("Pusat bantuan segera tersedia")}><CircleHelp /></button><button className="icon-button notification" aria-label="Notifikasi" onClick={() => setToast("Tidak ada notifikasi baru")}><Bell /></button><button className="primary small" onClick={() => setUploadOpen(true)}><Plus /> New project</button></div>
        </header>
        {view === "dashboard" && <Dashboard onUpload={() => setUploadOpen(true)} onClips={() => go("clips")} onProjects={() => go("projects")} />}
        {view === "clips" && <ClipsPage filter={filter} setFilter={setFilter} filtered={filtered} onBack={() => go("projects")} onNotice={setToast} onEdit={setEditor} onRender={(clip) => setToast(`CLIP #${String(clip.id).padStart(2, "0")} masuk antrean render`)} />}
        {view === "projects" && <ProjectsPage onOpen={() => go("clips")} onUpload={() => setUploadOpen(true)} />}
        {view === "autopilot" && <AutopilotPage notify={setToast} />}
        {view === "settings" && <SettingsPage notify={setToast} onUpgrade={()=>setUpgradeOpen(true)} plan={plan} />}
      </section>

      <nav className="mobile-nav"><button className={view === "dashboard" ? "active" : ""} onClick={() => go("dashboard")}><span><HomeIcon /></span>Home</button><button className={view === "clips" ? "active" : ""} onClick={() => go("clips")}><span><Play /></span>Clips</button><button className="mobile-create" aria-label="Buat project baru" onClick={() => setUploadOpen(true)}><Plus /></button><button className={view === "projects" ? "active" : ""} onClick={() => go("projects")}><span><FolderKanban /></span>Projects</button><button className={view === "autopilot" ? "active" : ""} onClick={() => go("autopilot")}><span><Rocket /></span>Auto</button><button className={view === "settings" ? "active" : ""} onClick={() => go("settings")}><span><Settings /></span>Settings</button></nav>
      {uploadOpen && <UploadModal processing={processing} progress={progress} onClose={() => !processing && setUploadOpen(false)} onStart={startUpload} inputRef={inputRef} />}
      {editor && <ClipEditor clip={editor} onClose={() => setEditor(null)} onSave={() => { setEditor(null); setToast("Perubahan klip berhasil disimpan"); }} />}
      {upgradeOpen&&<UpgradeModal plan={plan} onClose={()=>setUpgradeOpen(false)} onUpgraded={()=>{setPlan("Pro trial");setUpgradeOpen(false);setToast("Trial Pro 7 hari berhasil diaktifkan")}}/>}
      {toast && <div className="toast"><span><CheckCircle2 /></span>{toast}</div>}
    </main>
  );
}

function Dashboard({ onUpload, onClips, onProjects }: { onUpload: () => void; onClips: () => void; onProjects: () => void }) {
  return <div className="page dashboard-page">
    <div className="hero-copy"><div><span className="eyebrow"><i /> AI VIDEO REPURPOSING</span><h1>Ubah video panjang menjadi<br /><em>short content</em> yang memikat.</h1><p>Temukan momen terbaik, buat subtitle, dan siapkan konten vertikal—semuanya dalam hitungan menit.</p></div><div className="hero-stats"><div><strong>24</strong><span>Total clips</span></div><div><strong>3</strong><span>Hot clips</span></div><div><strong>8m</strong><span>Processed</span></div></div></div>
    <button className="upload-zone" onClick={onUpload}><div className="upload-visual"><span><UploadCloud /></span><i /><i /></div><div><strong>Drop video Anda di sini</strong><span>atau klik untuk memilih file</span></div><b>Upload video</b><small>MP4, MOV · maksimal 2 GB</small></button>
    <section className="section-block"><div className="section-title"><div><span>RECENT WORK</span><h2>Project terbaru</h2></div><button onClick={onProjects}>Lihat semua <span><ArrowRight /></span></button></div><div className="project-grid">
      <article className="project-card featured" onClick={onClips}><div className="project-cover cover-one"><div className="cover-person"><i /><b /></div><span className="duration">35:42</span><span className="cover-badge">14 CLIPS</span></div><div className="project-info"><div><span className="status-dot done" />Selesai diproses</div><h3>Podcast Bisnis: Mulai dari Nol</h3><p>Diunggah 2 jam lalu · 14 clips ditemukan</p><div className="score-row"><span><b>3</b> Hot clips</span><button>Open project <ArrowRight /></button></div></div></article>
      <article className="project-card" onClick={onClips}><div className="project-cover cover-two"><div className="cover-person side"><i /><b /></div><span className="duration">18:09</span><span className="cover-badge">6 CLIPS</span></div><div className="project-info"><div><span className="status-dot done" />Selesai diproses</div><h3>Tips Karier untuk Fresh Graduate</h3><p>Kemarin · 6 clips ditemukan</p><div className="score-row"><span><b>1</b> Hot clip</span><button>Open project <ArrowRight /></button></div></div></article>
      <button className="new-project-card" onClick={onUpload}><span><Plus /></span><strong>Buat project baru</strong><small>Mulai dari video Anda</small></button>
    </div></section>
  </div>;
}

function ClipsPage({ filter, setFilter, filtered, onBack, onNotice, onEdit, onRender }: { filter: "all" | "hot" | "rendered"; setFilter: (v: "all" | "hot" | "rendered") => void; filtered: Clip[]; onBack: () => void; onNotice: (message: string) => void; onEdit: (c: Clip) => void; onRender: (c: Clip) => void }) {
  return <div className="page clips-page">
    <div className="project-heading"><div><button className="back-link" onClick={onBack}><ArrowLeft /> Projects</button><div className="title-line"><h1>Podcast Bisnis: Mulai dari Nol</h1><span>Complete</span></div><p>35:42 · Bahasa Indonesia · Diproses 2 jam lalu</p></div><button className="outline-button" aria-label="Menu project" onClick={() => onNotice("Menu project segera tersedia")}><MoreHorizontal /></button></div>
    <div className="result-summary"><div className="radial-score"><strong>92</strong><span>TOP SCORE</span></div><div><span className="eyebrow"><i /> ANALYSIS COMPLETE</span><h2>14 momen menarik ditemukan.</h2><p>AI memilih bagian terbaik berdasarkan hook, konteks, dan kekuatan insight.</p></div><div className="summary-metrics"><div><strong>14</strong><span>Found</span></div><div><strong>3</strong><span><Flame /> Hot</span></div><div><strong>10</strong><span>Rendered</span></div></div></div>
    <div className="clip-toolbar"><div><h2>Detected clips</h2><span>{filtered.length} results</span></div><div className="filter-tabs"><button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>All <span>14</span></button><button className={filter === "hot" ? "active" : ""} onClick={() => setFilter("hot")}><Flame /> Hot <span>3</span></button><button className={filter === "rendered" ? "active" : ""} onClick={() => setFilter("rendered")}><Check /> Rendered <span>10</span></button></div><button className="primary" onClick={() => onRender(clips[0])}>Render all <ArrowRight /></button></div>
    <div className="clips-grid">{filtered.map((clip) => <ClipCard key={clip.id} clip={clip} onEdit={() => onEdit(clip)} onRender={() => onRender(clip)} />)}</div>
  </div>;
}

function ClipCard({ clip, onEdit, onRender }: { clip: Clip; onEdit: () => void; onRender: () => void }) {
  return <article className="clip-card"><div className={`clip-preview ${clip.accent}`}><div className="vertical-video"><div className="mini-person"><i /><b /></div><div className="subtitle-preview">JANGAN MULAI <em>BISNIS</em><br />SEBELUM TAHU INI</div></div><div className="clip-score"><span><Flame /></span><strong>{clip.score}</strong><small>HOT SCORE</small></div><span className="clip-duration">00:{clip.duration}</span><button className="play-button" onClick={onEdit} aria-label={`Preview ${clip.title}`}><Play /></button></div><div className="clip-body"><div className="clip-kicker"><span>CLIP #{String(clip.id).padStart(2, "0")}</span><span>{clip.duration} sec · 9:16</span></div><h3>{clip.title}</h3><p>“{clip.hook}”</p><div className="clip-actions"><button onClick={onEdit}><Pencil /> Edit</button><button onClick={onEdit}><Eye /> Preview</button><button className="render-button" onClick={onRender}>{clip.status === "rendered" ? <><Check /> Rendered</> : <>Render <ArrowRight /></>}</button></div></div></article>;
}

function ProjectsPage({ onOpen, onUpload }: { onOpen: () => void; onUpload: () => void }) {
  const rows = [["Podcast Bisnis: Mulai dari Nol", "35:42", "Complete", "14 clips", "2 jam lalu"], ["Tips Karier untuk Fresh Graduate", "18:09", "Complete", "6 clips", "Kemarin"], ["Cara Bangun Personal Branding", "28:17", "Draft", "4 clips", "3 hari lalu"]];
  return <div className="page projects-page"><div className="simple-heading"><div><span className="eyebrow"><i /> YOUR LIBRARY</span><h1>Semua project</h1><p>Kelola video panjang dan semua klip yang sudah dihasilkan.</p></div><button className="primary" onClick={onUpload}><Plus /> New project</button></div><div className="table-card"><div className="table-row table-head"><span>PROJECT</span><span>STATUS</span><span>CLIPS</span><span>CREATED</span><span /></div>{rows.map((item, index) => <button className="table-row" key={item[0]} onClick={onOpen}><span className="project-cell"><i className={`table-thumb thumb-${index + 1}`} /><span><strong>{item[0]}</strong><small>{item[1]} · Indonesian</small></span></span><span><b className={`table-status ${item[2].toLowerCase()}`}>{item[2]}</b></span><span>{item[3]}</span><span>{item[4]}</span><span><ArrowRight /></span></button>)}</div></div>;
}

function AutopilotPage({ notify }: { notify: (message:string)=>void }) {
  const [watch,setWatch]=useState(true),[mode,setMode]=useState<"approval"|"autopilot">("approval"),[score,setScore]=useState(85),[limit,setLimit]=useState(3);
  const [platforms,setPlatforms]=useState(["Instagram","TikTok"]); const [channel,setChannel]=useState("https://youtube.com/@tuahkreasi"); const [videoUrl,setVideoUrl]=useState(""); const [saving,setSaving]=useState(false);
  async function action(payload:Record<string,unknown>,success:string){setSaving(true);try{const response=await fetch("/api/automation",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)});if(!response.ok)throw new Error((await response.json()).error);notify(success)}catch(error){notify(error instanceof Error?error.message:"Gagal menyimpan")}finally{setSaving(false)}}
  function togglePlatform(name:string){setPlatforms(value=>value.includes(name)?value.filter(x=>x!==name):[...value,name])}
  async function importVideo(){if(!/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(videoUrl)){notify("Masukkan URL video YouTube yang valid");return}setSaving(true);try{const created=await fetch("/api/projects",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({title:"Video YouTube Baru",sourceUrl:videoUrl})});if(!created.ok)throw new Error("Gagal membuat project");const {project}=await created.json() as {project:{id:string}};await fetch(`/api/projects/${project.id}/process`,{method:"POST"});setVideoUrl("");notify("Video YouTube masuk antrean pemrosesan")}catch(error){notify(error instanceof Error?error.message:"Import gagal")}finally{setSaving(false)}}
  return <div className="page autopilot-page">
    <div className="simple-heading"><div><span className="eyebrow"><i/> CONTENT ON AUTOPILOT</span><h1>Mesin konten yang tetap jalan<br/>saat Anda <em>offline.</em></h1><p>Pantau channel, buat klip, minta approval, lalu posting otomatis.</p></div><span className="system-live">● SYSTEM ONLINE</span></div>
    <div className="automation-flow"><span>VIDEO BARU</span><i><ArrowRight /></i><span>DETEKSI</span><i><ArrowRight /></i><span>BIKIN KLIP</span><i><ArrowRight /></i><span>APPROVAL</span><i><ArrowRight /></i><span>POSTING</span></div>
    <div className="autopilot-grid">
      <section className="auto-card url-card"><div className="card-head"><div><small>QUICK IMPORT</small><h2>Tempel link video panjang</h2></div><span className="card-icon"><Link2 /></span></div><div className="big-url-input"><input value={videoUrl} onChange={e=>setVideoUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..."/><button disabled={saving} onClick={importVideo}>Bikin klip <ArrowRight /></button></div><p>Judul, thumbnail, dan durasi akan diambil otomatis ketika YouTube API terhubung.</p></section>
      <section className="auto-card channel-card"><div className="card-head"><div><small>SOURCE 01</small><h2>Channel Watch</h2></div><Toggle label="" value={watch} setValue={(v)=>{setWatch(v);action({action:"toggle-watch",id:"primary",enabled:v},v?"Channel Watch aktif":"Channel Watch dijeda")}}/></div><div className="channel-box"><b className="youtube-mark"><Youtube /></b><div><strong>TUAH KREASI</strong><span>Dipantau setiap 15 menit</span></div><em>CONNECTED</em></div><label className="channel-input"><span>Tambah channel YouTube</span><div><input value={channel} onChange={e=>setChannel(e.target.value)}/><button disabled={saving} onClick={()=>action({action:"connect-channel",url:channel,name:"TUAH KREASI"},"Channel berhasil dihubungkan")}>Connect <ArrowRight /></button></div></label><div className="detected-video"><i className="video-dot"/><div><small>VIDEO BARU TERDETEKSI</small><strong>KEJAR SETORAN — ENZY STORIA</strong><span>7 clips dibuat · 3 menunggu approval</span></div><button onClick={()=>notify("Membuka approval queue")}>Review</button></div></section>
      <section className="auto-card rules-card"><div className="card-head"><div><small>POSTING RULES</small><h2>Autopilot rules</h2></div><span className="card-icon"><Gauge /></span></div><div className="mode-switch"><button className={mode==="approval"?"active":""} onClick={()=>setMode("approval")}>Approval dulu</button><button className={mode==="autopilot"?"active":""} onClick={()=>setMode("autopilot")}>Full autopilot</button></div><label>Minimal Hot Score <b>{score}</b><input type="range" min="60" max="100" value={score} onChange={e=>setScore(Number(e.target.value))}/></label><label>Maksimal posting per hari <select value={limit} onChange={e=>setLimit(Number(e.target.value))}><option>1</option><option>2</option><option>3</option><option>5</option></select></label><label>Jam posting <div className="time-chips"><span>12:00</span><span>19:00</span><button aria-label="Tambah slot waktu" onClick={()=>notify("Slot waktu baru ditambahkan")}><Plus /></button></div></label><button className="primary save-rules" disabled={saving} onClick={()=>action({action:"save-rules",mode,minScore:score,dailyLimit:limit,postingTimes:["12:00","19:00"],platforms:platforms.map(x=>x.toLowerCase())},"Aturan autopilot tersimpan")}>Save rules</button></section>
      <section className="auto-card platform-card"><div className="card-head"><div><small>DISTRIBUTION</small><h2>Auto posting</h2></div><span>{platforms.length}/4 aktif</span></div><div className="platform-list">{([["TikTok",Music2],["Instagram",Instagram],["Facebook",Share2],["YouTube Shorts",Youtube]] as const).map(([name,PlatformIcon])=><button key={name} onClick={()=>togglePlatform(name)}><b><PlatformIcon /></b><span><strong>{name}</strong><small>{platforms.includes(name)?"Siap posting":"Hubungkan akun"}</small></span><i className={platforms.includes(name)?"connected":""}>{platforms.includes(name)?<Check />:<Plus />}</i></button>)}</div></section>
      <section className="auto-card approval-card"><div className="card-head"><div><small>APPROVAL QUEUE</small><h2>3 clips menunggu</h2></div><button onClick={()=>notify("Semua klip disetujui dan dijadwalkan")}>Approve all</button></div>{clips.slice(0,3).map((clip,index)=><div className="approval-row" key={clip.id}><span className={`approval-thumb ${clip.accent}`}><Play /></span><div><strong>{clip.title}</strong><small><Flame /> {clip.score} · {clip.duration} detik</small></div><button aria-label={`Tolak clip ${clip.id}`} onClick={()=>notify(`Clip #${clip.id} ditolak`)}><X /></button><button aria-label={`Setujui clip ${clip.id}`} className="approve" onClick={()=>notify(`Clip #${clip.id} disetujui`)}><Check /></button>{index===0&&<em>12:00</em>}</div>)}</section>
      <section className="auto-card analytics-card"><div className="card-head"><div><small>LAST 30 DAYS</small><h2>Performance</h2></div><button onClick={()=>notify("Laporan CSV sedang disiapkan")}>Export <ArrowUpRight /></button></div><div className="metric-strip"><div><strong>248K</strong><span>Views</span></div><div><strong>18.2K</strong><span>Likes</span></div><div><strong>7.3%</strong><span>Engagement</span></div></div><div className="chart-bars">{[35,48,42,68,55,78,92,74,88,96,81,100].map((h,i)=><i key={i} style={{height:`${h}%`}}/>)}</div><p><TrendingUp /> 32% dibanding 30 hari sebelumnya</p></section>
      <section className="auto-card affiliate-card"><div className="card-head"><div><small>CREATOR PARTNER</small><h2>Affiliate</h2></div><span>20% komisi</span></div><div className="affiliate-value"><strong>Rp1.240.000</strong><span>Komisi tersedia</span></div><div className="affiliate-stats"><span><b>184</b> Klik</span><span><b>23</b> Signup</span><span><b>8</b> Transaksi</span></div><button className="referral-button" onClick={()=>action({action:"create-referral"},"Link referral berhasil disalin")}>clipin.ai/ref/CLIPIN8A2F <b>Copy <Copy /></b></button></section>
    </div>
  </div>
}

function SettingsPage({notify,onUpgrade,plan}:{notify:(message:string)=>void;onUpgrade:()=>void;plan:string}){
  const [language,setLanguage]=useState("id"),[timezone,setTimezone]=useState("Asia/Jakarta"),[style,setStyle]=useState("bold"),[email,setEmail]=useState(true),[processing,setProcessing]=useState(true),[publishing,setPublishing]=useState(true),[saving,setSaving]=useState(false);
  async function save(){setSaving(true);try{const response=await fetch("/api/account",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({language,timezone,subtitleStyle:style,emailNotifications:email,processingNotifications:processing,publishNotifications:publishing})});if(!response.ok)throw new Error("Gagal menyimpan");notify("Semua pengaturan berhasil disimpan")}catch(error){notify(error instanceof Error?error.message:"Gagal menyimpan")}finally{setSaving(false)}}
  useEffect(()=>{fetch("/api/account").then(r=>r.ok?r.json():null).then(data=>{const s=data?.settings;if(!s)return;setLanguage(s.language);setTimezone(s.timezone);setStyle(s.subtitle_style);setEmail(Boolean(s.email_notifications));setProcessing(Boolean(s.processing_notifications));setPublishing(Boolean(s.publish_notifications))}).catch(()=>{})},[]);
  return <div className="page settings-page"><div className="simple-heading"><div><span className="eyebrow"><i/> PERSONAL WORKSPACE</span><h1>Settings</h1><p>Kelola akun, preferensi video, dan notifikasi.</p></div><button className="primary" disabled={saving} onClick={save}>{saving?"Saving...":"Save changes"}</button></div><div className="settings-layout"><nav><button className="active">Account</button><button>Video defaults</button><button>Notifications</button><button>Billing</button></nav><div className="settings-content"><section className="settings-panel"><div><small>PROFILE</small><h2>Informasi akun</h2></div><div className="account-line"><span className="large-avatar">AP</span><div><strong>Andi Pratama</strong><span>Akun ChatGPT terverifikasi</span></div><a href="/signout-with-chatgpt?return_to=/">Sign out</a></div></section><section className="settings-panel"><div><small>VIDEO DEFAULTS</small><h2>Preferensi pemrosesan</h2></div><div className="settings-fields"><label>Bahasa transkripsi<select value={language} onChange={e=>setLanguage(e.target.value)}><option value="id">Bahasa Indonesia</option><option value="en">English</option><option value="auto">Auto detect</option></select></label><label>Zona waktu<select value={timezone} onChange={e=>setTimezone(e.target.value)}><option>Asia/Jakarta</option><option>Asia/Makassar</option><option>Asia/Jayapura</option></select></label><label>Gaya subtitle<select value={style} onChange={e=>setStyle(e.target.value)}><option value="clean">Clean</option><option value="bold">Bold</option><option value="karaoke">Karaoke</option></select></label></div></section><section className="settings-panel"><div><small>NOTIFICATIONS</small><h2>Pemberitahuan</h2></div><Toggle label="Email ringkasan mingguan" value={email} setValue={setEmail}/><Toggle label="Video selesai diproses" value={processing} setValue={setProcessing}/><Toggle label="Posting berhasil atau gagal" value={publishing} setValue={setPublishing}/></section><section className="settings-panel billing-panel"><div><small>BILLING</small><h2>Paket saat ini</h2></div><div><div><strong>{plan}</strong><span>{plan==="Free plan"?"15 menit pemrosesan per bulan":"300 menit pemrosesan per bulan"}</span></div><button onClick={onUpgrade}>{plan==="Free plan"?"Upgrade plan":"Manage plan"}</button></div><div className="invoice-row"><span>Riwayat tagihan</span><em>Belum ada transaksi</em></div></section></div></div></div>
}

function UpgradeModal({plan,onClose,onUpgraded}:{plan:string;onClose:()=>void;onUpgraded:()=>void}){const [annual,setAnnual]=useState(false),[loading,setLoading]=useState(false);async function trial(){setLoading(true);try{const response=await fetch("/api/account",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"upgrade",plan:"trial",billingCycle:annual?"annual":"monthly"})});if(!response.ok)throw new Error((await response.json()).error);onUpgraded()}finally{setLoading(false)}}return <div className="modal-backdrop"><section className="upgrade-modal" role="dialog" aria-modal="true"><button className="close-button" aria-label="Tutup pilihan paket" onClick={onClose}><X /></button><span className="modal-kicker">CHOOSE YOUR PLAN</span><h2>Lebih banyak video.<br/><em>Lebih sedikit kerja manual.</em></h2><div className="billing-toggle"><button className={!annual?"active":""} onClick={()=>setAnnual(false)}>Bulanan</button><button className={annual?"active":""} onClick={()=>setAnnual(true)}>Tahunan <b>HEMAT 20%</b></button></div><div className="pricing-grid"><article><small>FREE</small><strong>Rp0</strong><span>/bulan</span><ul><li>15 menit video</li><li>6 clips per project</li><li>720p export</li></ul><button disabled>{plan}</button></article><article className="popular"><em>PALING POPULER</em><small>PRO</small><strong>{annual?"Rp119K":"Rp149K"}</strong><span>/bulan</span><ul><li>300 menit video</li><li>Full HD export</li><li>Channel Watch</li><li>Auto posting</li></ul><button disabled={loading} onClick={trial}>{loading?"Mengaktifkan...":"Coba gratis 7 hari"}</button></article><article><small>BUSINESS</small><strong>{annual?"Rp319K":"Rp399K"}</strong><span>/bulan</span><ul><li>1.000 menit video</li><li>5 anggota tim</li><li>Priority rendering</li></ul><button onClick={()=>alert("Tim sales akan menghubungi Anda.")}>Hubungi sales</button></article></div><p>Trial tidak memerlukan kartu kredit. Batalkan kapan saja.</p></section></div>}

function UploadModal({ processing, progress, onClose, onStart, inputRef }: { processing: boolean; progress: number; onClose: () => void; onStart: (file?: File) => void; inputRef: React.RefObject<HTMLInputElement | null> }) {
  const steps = ["Mengunggah video", "Mengekstrak audio", "Membuat transkrip", "Mendeteksi momen terbaik"];
  const activeStep = Math.min(Math.floor(progress / 26), 3);
  return <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><section className="upload-modal" role="dialog" aria-modal="true" aria-label="Upload video baru"><button className="close-button" aria-label="Tutup upload" onClick={onClose} disabled={processing}><X /></button>{!processing ? <><span className="modal-kicker">NEW PROJECT</span><h2>Video panjang masuk.<br /><em>Klip terbaik keluar.</em></h2><p>Unggah video Anda dan biarkan CLIPIN menemukan momen paling menarik.</p><button className="modal-drop" onClick={() => inputRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const file=event.dataTransfer.files[0]; if(file) onStart(file); }}><span><UploadCloud /></span><strong>Pilih atau drop video untuk diunggah</strong><small>MP4 atau MOV · maksimal 2 GB</small></button><input ref={inputRef} type="file" accept="video/mp4,video/quicktime" hidden onChange={(event) => { const file=event.target.files?.[0]; if(file) onStart(file); }} /><div className="or"><span />atau coba demo<span /></div><button className="primary demo-button" onClick={() => onStart()}>Gunakan video contoh <ArrowRight /></button></> : <><span className="modal-kicker live">● ANALYZING VIDEO</span><h2>Menemukan momen<br /><em>terbaik Anda.</em></h2><div className="processing-ring" style={{ "--progress": `${progress * 3.6}deg` } as React.CSSProperties}><div><strong>{progress}%</strong><span>ANALYZING</span></div></div><div className="processing-steps">{steps.map((step, index) => <div key={step} className={index < activeStep ? "done" : index === activeStep ? "active" : ""}><span>{index < activeStep ? <Check /> : index + 1}</span><b>{step}</b>{index === activeStep && <i />}</div>)}</div></>}</section></div>;
}

function ClipEditor({ clip, onClose, onSave }: { clip: Clip; onClose: () => void; onSave: () => void }) {
  const [subtitle, setSubtitle] = useState(true); const [tracking, setTracking] = useState(true); const [hook, setHook] = useState(true); const [style, setStyle] = useState("Bold");
  const [playing, setPlaying] = useState(false);
  return <div className="modal-backdrop editor-backdrop"><section className="editor-modal" role="dialog" aria-modal="true"><header><div><span>CLIP #{String(clip.id).padStart(2, "0")}</span><h2>Edit clip</h2></div><button aria-label="Tutup editor" onClick={onClose}><X /></button></header><div className="editor-layout"><div className="editor-preview"><div className="phone-preview"><div className="editor-person"><i /><b /></div>{hook && <span className="hook-overlay">{clip.hook}</span>}{subtitle && <div className={`editor-subtitle ${style.toLowerCase()}`}>JANGAN MULAI <em>BISNIS</em><br />SEBELUM TAHU INI</div>}<button aria-label={playing ? "Pause preview" : "Play preview"} onClick={() => setPlaying(!playing)}>{playing ? <Pause /> : <Play />}</button></div><div className="timeline"><span>00:12:14</span><div><i /><b /><i /></div><span>00:12:48</span></div></div><div className="editor-controls"><label>Judul clip<input defaultValue={clip.title} /></label><label>Hook overlay<textarea defaultValue={clip.hook} /></label><div className="time-fields"><label>Start<input defaultValue="00:12:14" /></label><label>End<input defaultValue="00:12:48" /></label></div><div className="toggle-list"><Toggle label="Burn subtitles" value={subtitle} setValue={setSubtitle} /><Toggle label="Face tracking" value={tracking} setValue={setTracking} /><Toggle label="Hook overlay" value={hook} setValue={setHook} /></div><label>Caption style<div className="style-options">{["Clean", "Bold", "Karaoke"].map((name) => <button key={name} className={style === name ? "active" : ""} onClick={() => setStyle(name)}>{name}</button>)}</div></label><div className="editor-actions"><button onClick={onClose}>Cancel</button><button className="primary" onClick={onSave}>Save changes</button></div></div></div></section></div>;
}

function Toggle({ label, value, setValue }: { label: string; value: boolean; setValue: (v: boolean) => void }) { return <button className="toggle-row" onClick={() => setValue(!value)}><span>{label}</span><i className={value ? "on" : ""}><b /></i></button>; }
