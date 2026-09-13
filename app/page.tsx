"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type View = "dashboard" | "projects" | "clips";
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
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!processing) return;
    const timer = window.setInterval(() => {
      setProgress((value) => {
        if (value >= 100) {
          window.clearInterval(timer);
          window.setTimeout(() => {
            setProcessing(false); setUploadOpen(false); setView("clips");
            setToast("Analisis selesai — 6 klip terbaik ditemukan");
          }, 450);
          return 100;
        }
        return Math.min(value + 4, 100);
      });
    }, 90);
    return () => window.clearInterval(timer);
  }, [processing]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const filtered = useMemo(() => clips.filter((clip) => {
    if (filter === "hot") return clip.score >= 85;
    if (filter === "rendered") return clip.status === "rendered";
    return true;
  }), [filter]);

  function startUpload() { setProgress(0); setProcessing(true); }
  function go(next: View) { setView(next); window.scrollTo({ top: 0, behavior: "smooth" }); }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => go("dashboard")} aria-label="Buka dashboard"><span className="brand-mark">C</span><span>CLIPIN<span className="brand-dot">.</span></span></button>
        <nav className="nav-list" aria-label="Navigasi utama">
          <button className={view === "dashboard" ? "active" : ""} onClick={() => go("dashboard")}><span>⌂</span>Dashboard</button>
          <button onClick={() => setUploadOpen(true)}><span>＋</span>New Project</button>
          <button className={view === "clips" ? "active" : ""} onClick={() => go("clips")}><span>▶</span>My Clips <b>24</b></button>
          <button className={view === "projects" ? "active" : ""} onClick={() => go("projects")}><span>▣</span>Projects</button>
        </nav>
        <div className="sidebar-bottom">
          <div className="usage-card"><div className="usage-icon">✦</div><strong>8 dari 15 menit</strong><span>Terpakai bulan ini</span><div className="usage-bar"><i /></div><button onClick={() => setToast("Paket Pro segera tersedia")}>Upgrade Plan ↗</button></div>
          <button className="settings-button" onClick={() => setToast("Pengaturan segera tersedia")}><span>⚙</span>Settings</button>
          <div className="profile"><div className="avatar">AP</div><div><strong>Andi Pratama</strong><span>Free plan</span></div><button aria-label="Menu profil">•••</button></div>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <button className="mobile-brand" onClick={() => go("dashboard")}><span className="brand-mark">C</span>CLIPIN.</button>
          <div className="breadcrumbs">Workspace <span>/</span> {view === "dashboard" ? "Dashboard" : view === "clips" ? "Detected Clips" : "Projects"}</div>
          <div className="top-actions"><button className="icon-button" aria-label="Bantuan">?</button><button className="icon-button notification" aria-label="Notifikasi">♢</button><button className="primary small" onClick={() => setUploadOpen(true)}>＋ New project</button></div>
        </header>
        {view === "dashboard" && <Dashboard onUpload={() => setUploadOpen(true)} onClips={() => go("clips")} onProjects={() => go("projects")} />}
        {view === "clips" && <ClipsPage filter={filter} setFilter={setFilter} filtered={filtered} onEdit={setEditor} onRender={(clip) => setToast(`CLIP #${String(clip.id).padStart(2, "0")} masuk antrean render`)} />}
        {view === "projects" && <ProjectsPage onOpen={() => go("clips")} onUpload={() => setUploadOpen(true)} />}
      </section>

      <nav className="mobile-nav"><button className={view === "dashboard" ? "active" : ""} onClick={() => go("dashboard")}><span>⌂</span>Home</button><button className={view === "clips" ? "active" : ""} onClick={() => go("clips")}><span>▶</span>Clips</button><button className="mobile-create" onClick={() => setUploadOpen(true)}>＋</button><button className={view === "projects" ? "active" : ""} onClick={() => go("projects")}><span>▣</span>Projects</button><button onClick={() => setToast("Pengaturan segera tersedia")}><span>⚙</span>Settings</button></nav>
      {uploadOpen && <UploadModal processing={processing} progress={progress} onClose={() => !processing && setUploadOpen(false)} onStart={startUpload} inputRef={inputRef} />}
      {editor && <ClipEditor clip={editor} onClose={() => setEditor(null)} onSave={() => { setEditor(null); setToast("Perubahan klip berhasil disimpan"); }} />}
      {toast && <div className="toast"><span>✓</span>{toast}</div>}
    </main>
  );
}

function Dashboard({ onUpload, onClips, onProjects }: { onUpload: () => void; onClips: () => void; onProjects: () => void }) {
  return <div className="page dashboard-page">
    <div className="hero-copy"><div><span className="eyebrow"><i /> AI VIDEO REPURPOSING</span><h1>Ubah video panjang menjadi<br /><em>short content</em> yang memikat.</h1><p>Temukan momen terbaik, buat subtitle, dan siapkan konten vertikal—semuanya dalam hitungan menit.</p></div><div className="hero-stats"><div><strong>24</strong><span>Total clips</span></div><div><strong>3</strong><span>Hot clips</span></div><div><strong>8m</strong><span>Processed</span></div></div></div>
    <button className="upload-zone" onClick={onUpload}><div className="upload-visual"><span>↑</span><i /><i /></div><div><strong>Drop video Anda di sini</strong><span>atau klik untuk memilih file</span></div><b>Upload video</b><small>MP4, MOV · maksimal 2 GB</small></button>
    <section className="section-block"><div className="section-title"><div><span>RECENT WORK</span><h2>Project terbaru</h2></div><button onClick={onProjects}>Lihat semua <span>→</span></button></div><div className="project-grid">
      <article className="project-card featured" onClick={onClips}><div className="project-cover cover-one"><div className="cover-person"><i /><b /></div><span className="duration">35:42</span><span className="cover-badge">14 CLIPS</span></div><div className="project-info"><div><span className="status-dot done" />Selesai diproses</div><h3>Podcast Bisnis: Mulai dari Nol</h3><p>Diunggah 2 jam lalu · 14 clips ditemukan</p><div className="score-row"><span><b>3</b> Hot clips</span><button>Open project →</button></div></div></article>
      <article className="project-card" onClick={onClips}><div className="project-cover cover-two"><div className="cover-person side"><i /><b /></div><span className="duration">18:09</span><span className="cover-badge">6 CLIPS</span></div><div className="project-info"><div><span className="status-dot done" />Selesai diproses</div><h3>Tips Karier untuk Fresh Graduate</h3><p>Kemarin · 6 clips ditemukan</p><div className="score-row"><span><b>1</b> Hot clip</span><button>Open project →</button></div></div></article>
      <button className="new-project-card" onClick={onUpload}><span>＋</span><strong>Buat project baru</strong><small>Mulai dari video Anda</small></button>
    </div></section>
  </div>;
}

function ClipsPage({ filter, setFilter, filtered, onEdit, onRender }: { filter: "all" | "hot" | "rendered"; setFilter: (v: "all" | "hot" | "rendered") => void; filtered: Clip[]; onEdit: (c: Clip) => void; onRender: (c: Clip) => void }) {
  return <div className="page clips-page">
    <div className="project-heading"><div><button className="back-link">← Projects</button><div className="title-line"><h1>Podcast Bisnis: Mulai dari Nol</h1><span>Complete</span></div><p>35:42 · Bahasa Indonesia · Diproses 2 jam lalu</p></div><button className="outline-button">•••</button></div>
    <div className="result-summary"><div className="radial-score"><strong>92</strong><span>TOP SCORE</span></div><div><span className="eyebrow"><i /> ANALYSIS COMPLETE</span><h2>14 momen menarik ditemukan.</h2><p>AI memilih bagian terbaik berdasarkan hook, konteks, dan kekuatan insight.</p></div><div className="summary-metrics"><div><strong>14</strong><span>Found</span></div><div><strong>3</strong><span>🔥 Hot</span></div><div><strong>10</strong><span>Rendered</span></div></div></div>
    <div className="clip-toolbar"><div><h2>Detected clips</h2><span>{filtered.length} results</span></div><div className="filter-tabs"><button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>All <span>14</span></button><button className={filter === "hot" ? "active" : ""} onClick={() => setFilter("hot")}>🔥 Hot <span>3</span></button><button className={filter === "rendered" ? "active" : ""} onClick={() => setFilter("rendered")}>✓ Rendered <span>10</span></button></div><button className="primary" onClick={() => onRender(clips[0])}>Render all <span>→</span></button></div>
    <div className="clips-grid">{filtered.map((clip) => <ClipCard key={clip.id} clip={clip} onEdit={() => onEdit(clip)} onRender={() => onRender(clip)} />)}</div>
  </div>;
}

function ClipCard({ clip, onEdit, onRender }: { clip: Clip; onEdit: () => void; onRender: () => void }) {
  return <article className="clip-card"><div className={`clip-preview ${clip.accent}`}><div className="vertical-video"><div className="mini-person"><i /><b /></div><div className="subtitle-preview">JANGAN MULAI <em>BISNIS</em><br />SEBELUM TAHU INI</div></div><div className="clip-score"><span>🔥</span><strong>{clip.score}</strong><small>HOT SCORE</small></div><span className="clip-duration">00:{clip.duration}</span><button className="play-button" onClick={onEdit} aria-label={`Preview ${clip.title}`}>▶</button></div><div className="clip-body"><div className="clip-kicker"><span>CLIP #{String(clip.id).padStart(2, "0")}</span><span>{clip.duration} sec · 9:16</span></div><h3>{clip.title}</h3><p>“{clip.hook}”</p><div className="clip-actions"><button onClick={onEdit}>✎ Edit</button><button onClick={onEdit}>▷ Preview</button><button className="render-button" onClick={onRender}>{clip.status === "rendered" ? "✓ Rendered" : "Render →"}</button></div></div></article>;
}

function ProjectsPage({ onOpen, onUpload }: { onOpen: () => void; onUpload: () => void }) {
  const rows = [["Podcast Bisnis: Mulai dari Nol", "35:42", "Complete", "14 clips", "2 jam lalu"], ["Tips Karier untuk Fresh Graduate", "18:09", "Complete", "6 clips", "Kemarin"], ["Cara Bangun Personal Branding", "28:17", "Draft", "4 clips", "3 hari lalu"]];
  return <div className="page projects-page"><div className="simple-heading"><div><span className="eyebrow"><i /> YOUR LIBRARY</span><h1>Semua project</h1><p>Kelola video panjang dan semua klip yang sudah dihasilkan.</p></div><button className="primary" onClick={onUpload}>＋ New project</button></div><div className="table-card"><div className="table-row table-head"><span>PROJECT</span><span>STATUS</span><span>CLIPS</span><span>CREATED</span><span /></div>{rows.map((item, index) => <button className="table-row" key={item[0]} onClick={onOpen}><span className="project-cell"><i className={`table-thumb thumb-${index + 1}`} /><span><strong>{item[0]}</strong><small>{item[1]} · Indonesian</small></span></span><span><b className={`table-status ${item[2].toLowerCase()}`}>{item[2]}</b></span><span>{item[3]}</span><span>{item[4]}</span><span>→</span></button>)}</div></div>;
}

function UploadModal({ processing, progress, onClose, onStart, inputRef }: { processing: boolean; progress: number; onClose: () => void; onStart: () => void; inputRef: React.RefObject<HTMLInputElement | null> }) {
  const steps = ["Mengunggah video", "Mengekstrak audio", "Membuat transkrip", "Mendeteksi momen terbaik"];
  const activeStep = Math.min(Math.floor(progress / 26), 3);
  return <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><section className="upload-modal" role="dialog" aria-modal="true" aria-label="Upload video baru"><button className="close-button" onClick={onClose} disabled={processing}>×</button>{!processing ? <><span className="modal-kicker">NEW PROJECT</span><h2>Video panjang masuk.<br /><em>Klip terbaik keluar.</em></h2><p>Unggah video Anda dan biarkan CLIPIN menemukan momen paling menarik.</p><button className="modal-drop" onClick={() => inputRef.current?.click()}><span>↑</span><strong>Pilih video untuk diunggah</strong><small>MP4 atau MOV · maksimal 2 GB</small></button><input ref={inputRef} type="file" accept="video/mp4,video/quicktime" hidden onChange={onStart} /><div className="or"><span />atau coba demo<span /></div><button className="primary demo-button" onClick={onStart}>Gunakan video contoh <span>→</span></button></> : <><span className="modal-kicker live">● ANALYZING VIDEO</span><h2>Menemukan momen<br /><em>terbaik Anda.</em></h2><div className="processing-ring" style={{ "--progress": `${progress * 3.6}deg` } as React.CSSProperties}><div><strong>{progress}%</strong><span>ANALYZING</span></div></div><div className="processing-steps">{steps.map((step, index) => <div key={step} className={index < activeStep ? "done" : index === activeStep ? "active" : ""}><span>{index < activeStep ? "✓" : index + 1}</span><b>{step}</b>{index === activeStep && <i />}</div>)}</div></>}</section></div>;
}

function ClipEditor({ clip, onClose, onSave }: { clip: Clip; onClose: () => void; onSave: () => void }) {
  const [subtitle, setSubtitle] = useState(true); const [tracking, setTracking] = useState(true); const [hook, setHook] = useState(true); const [style, setStyle] = useState("Bold");
  return <div className="modal-backdrop editor-backdrop"><section className="editor-modal" role="dialog" aria-modal="true"><header><div><span>CLIP #{String(clip.id).padStart(2, "0")}</span><h2>Edit clip</h2></div><button onClick={onClose}>×</button></header><div className="editor-layout"><div className="editor-preview"><div className="phone-preview"><div className="editor-person"><i /><b /></div>{hook && <span className="hook-overlay">{clip.hook}</span>}{subtitle && <div className={`editor-subtitle ${style.toLowerCase()}`}>JANGAN MULAI <em>BISNIS</em><br />SEBELUM TAHU INI</div>}<button>▶</button></div><div className="timeline"><span>00:12:14</span><div><i /><b /><i /></div><span>00:12:48</span></div></div><div className="editor-controls"><label>Judul clip<input defaultValue={clip.title} /></label><label>Hook overlay<textarea defaultValue={clip.hook} /></label><div className="time-fields"><label>Start<input defaultValue="00:12:14" /></label><label>End<input defaultValue="00:12:48" /></label></div><div className="toggle-list"><Toggle label="Burn subtitles" value={subtitle} setValue={setSubtitle} /><Toggle label="Face tracking" value={tracking} setValue={setTracking} /><Toggle label="Hook overlay" value={hook} setValue={setHook} /></div><label>Caption style<div className="style-options">{["Clean", "Bold", "Karaoke"].map((name) => <button key={name} className={style === name ? "active" : ""} onClick={() => setStyle(name)}>{name}</button>)}</div></label><div className="editor-actions"><button onClick={onClose}>Cancel</button><button className="primary" onClick={onSave}>Save changes</button></div></div></div></section></div>;
}

function Toggle({ label, value, setValue }: { label: string; value: boolean; setValue: (v: boolean) => void }) { return <button className="toggle-row" onClick={() => setValue(!value)}><span>{label}</span><i className={value ? "on" : ""}><b /></i></button>; }
