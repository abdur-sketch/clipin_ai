"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Check,
  CheckCircle2,
  BadgeDollarSign,
  BarChart3,
  CircleHelp,
  Clapperboard,
  Copy,
  Download,
  Eye,
  FileVideo2,
  Flame,
  FolderKanban,
  Gauge,
  HomeIcon,
  Instagram,
  Link2,
  MoreHorizontal,
  Music2,
  Pause,
  Pencil,
  Play,
  Plus,
  Send,
  Settings,
  Share2,
  Sparkles,
  TrendingUp,
  UploadCloud,
  WandSparkles,
  X,
  Youtube,
} from "lucide-react";
import { ContentOS } from "./content-os";

type View =
  | "dashboard"
  | "projects"
  | "clips"
  | "published"
  | "analytics"
  | "monetization"
  | "settings";
type Clip = {
  id: number | string;
  score: number;
  duration: number;
  title: string;
  hook: string;
  caption: string;
  status: "ready" | "rendering" | "rendered";
  accent: string;
  startTime?: number;
  endTime?: number;
  style?: string;
  faceTracking?: boolean;
  hookOverlay?: boolean;
  aspectRatio?: string;
  fontSize?: number;
  fontFamily?: string;
  fontColor?: string;
  fontEffect?: string;
  titleEffect?: string;
  titleAnimation?: string;
  titlePosition?: string;
  captionPosition?: string;
  smartCleanup?: boolean;
  watermark?: boolean;
  captionsEnabled?: boolean;
  logoName?: string;
  postCaption?: string;
  postCta?: string;
  postHashtags?: string[];
  subtitles?: { start: number; end: number; text: string }[];
};

const demoClips: Clip[] = [
  {
    id: 1,
    score: 94,
    duration: 34,
    title: "Jangan Memulai Bisnis Sebelum Tahu Ini",
    hook: "Kebanyakan pemula salah mulai dari sini.",
    caption:
      "Produk hebat bukan titik awal. Temukan masalah yang benar-benar ingin diselesaikan pelanggan.",
    status: "rendered",
    accent: "lime",
  },
  {
    id: 2,
    score: 91,
    duration: 28,
    title: "Rahasia Menemukan Ide Bisnis yang Tepat",
    hook: "Ide bagus selalu meninggalkan satu petunjuk.",
    caption:
      "Dengarkan keluhan yang terus berulang. Di sanalah peluang biasanya bersembunyi.",
    status: "ready",
    accent: "cyan",
  },
  {
    id: 3,
    score: 87,
    duration: 42,
    title: "Kenapa Produk Bagus Tetap Bisa Gagal?",
    hook: "Produk bagus saja ternyata tidak cukup.",
    caption:
      "Pasar, momentum, dan distribusi sering kali lebih menentukan daripada produk yang sempurna.",
    status: "rendered",
    accent: "violet",
  },
  {
    id: 4,
    score: 83,
    duration: 31,
    title: "Validasi Ide Tanpa Keluar Banyak Modal",
    hook: "Jangan produksi sebelum melakukan ini.",
    caption:
      "Uji minat orang dengan versi paling sederhana sebelum menghabiskan waktu dan biaya.",
    status: "ready",
    accent: "orange",
  },
  {
    id: 5,
    score: 78,
    duration: 36,
    title: "Kesalahan Pertama Founder Pemula",
    hook: "Kesalahan ini kelihatan produktif, padahal mahal.",
    caption:
      "Berhenti menambah fitur sebelum Anda memahami kebutuhan inti pengguna.",
    status: "ready",
    accent: "pink",
  },
  {
    id: 6,
    score: 74,
    duration: 25,
    title: "Mulai dari Masalah, Bukan Produk",
    hook: "Balik urutan berpikir Anda.",
    caption:
      "Masalah yang tajam akan membawa Anda pada produk yang jauh lebih relevan.",
    status: "rendered",
    accent: "blue",
  },
];
type ProjectSummary = {
  id: string;
  title: string;
  status: string;
  progress: number;
  clip_count?: number;
  duration?: number;
  updated_at?: number;
};
type Notice = {
  id: string;
  type: string;
  title: string;
  message: string;
  read: number;
  created_at: number;
};
type BusinessSummary = {
  projects: number;
  clips: number;
  published: number;
  views: number;
  likes: number;
  followers: number;
  revenue: number;
};

export default function Home() {
  const [view, setView] = useState<View>("dashboard");
  const [filter, setFilter] = useState<"all" | "hot" | "ready" | "rendered">(
    "all",
  );
  const [editor, setEditor] = useState<Clip | null>(null);
  const [preview, setPreview] = useState<Clip | null>(null);
  const [clipItems, setClipItems] = useState<Clip[]>([]);
  const [projectTitle, setProjectTitle] = useState("My Clips");
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [renderingIds, setRenderingIds] = useState<string[]>([]);
  const [renderProgress, setRenderProgress] = useState<Record<string, number>>(
    {},
  );
  const renderControllers = useRef(new Map<string, AbortController>());
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [toast, setToast] = useState("");
  const [accountName, setAccountName] = useState("Creator KLIYU");
  const [accountEmail, setAccountEmail] = useState("");
  const [usage, setUsage] = useState({ used: 0, limit: 15 });
  const [helpOpen, setHelpOpen] = useState(false);
  const [noticesOpen, setNoticesOpen] = useState(false);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [business, setBusiness] = useState<BusinessSummary>({
    projects: 0,
    clips: 0,
    published: 0,
    views: 0,
    likes: 0,
    followers: 0,
    revenue: 0,
  });
  const [profileOpen, setProfileOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    fetch("/api/account")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data?.subscription)
          setUsage({
            used: Number(data.subscription.minutes_used || 0),
            limit: Number(data.subscription.minutes_limit || 15),
          });
        if (data?.user?.name) setAccountName(data.user.name);
        if (data?.user?.email) setAccountEmail(data.user.email);
      })
      .catch(() => {});
    fetch("/api/notifications")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setNotices(data?.notifications || []))
      .catch(() => {});
  }, []);
  useEffect(() => {
    void loadProjects();
  }, []);
  useEffect(() => {
    fetch("/api/content")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data?.summary && setBusiness(data.summary))
      .catch(() => {});
  }, [view]);

  async function loadProjects() {
    try {
      const response = await fetch("/api/projects");
      if (response.ok) {
        const data = (await response.json()) as { projects: ProjectSummary[] };
        setProjects(data.projects);
      }
    } catch {
      /* local preview can run before D1 is ready */
    }
  }
  async function openProject(projectId: string) {
    try {
      const response = await fetch(`/api/projects/${projectId}`);
      if (!response.ok) throw new Error("Project tidak dapat dibuka");
      const detail = (await response.json()) as {
        project: Record<string, unknown>;
        clips: Record<string, unknown>[];
      };
      const accents = ["lime", "cyan", "violet", "orange", "pink", "blue"];
      setProjectTitle(String(detail.project.title || "My Clips"));
      setClipItems(
        detail.clips.map((item, index) => ({
          id: String(item.id),
          score: Number(item.score),
          duration: Math.max(
            1,
            Math.round(Number(item.end_time) - Number(item.start_time)),
          ),
          title: String(item.title),
          hook: String(item.hook),
          caption: String(item.caption),
          status: String(item.status) as Clip["status"],
          accent: accents[index % accents.length],
          startTime: Number(item.start_time),
          endTime: Number(item.end_time),
          style: String(item.style || "bold"),
          faceTracking: Boolean(item.face_tracking),
          hookOverlay: Boolean(item.hook_overlay),
          captionsEnabled:
            item.captions_enabled === undefined
              ? true
              : Boolean(item.captions_enabled),
          aspectRatio: String(item.aspect_ratio || "9:16"),
          fontSize: Number(item.font_size || 48),
          fontFamily: String(item.font_family || "system"),
          fontColor: String(item.font_color || "#FFFFFF"),
          fontEffect: String(item.font_effect || "outline"),
          titleEffect: String(item.title_effect || "background"),
          titleAnimation: String(item.title_animation || "fade"),
          titlePosition: String(item.title_position || "top"),
          captionPosition: String(item.caption_position || "bottom"),
          smartCleanup:
            item.smart_cleanup === undefined
              ? true
              : Boolean(item.smart_cleanup),
          watermark: Boolean(item.watermark),
          logoName: item.logo_key
            ? String(item.logo_key).split("/").pop()
            : undefined,
          postCaption: item.post_caption
            ? String(item.post_caption)
            : undefined,
          postCta: item.post_cta ? String(item.post_cta) : undefined,
          postHashtags: item.post_hashtags
            ? JSON.parse(String(item.post_hashtags))
            : [],
          subtitles: item.subtitles ? JSON.parse(String(item.subtitles)) : [],
        })),
      );
      go("clips");
    } catch (error) {
      setToast(
        error instanceof Error ? error.message : "Project tidak dapat dibuka",
      );
    }
  }

  const filtered = useMemo(
    () =>
      clipItems.filter((clip) => {
        if (filter === "hot") return clip.score >= 85;
        if (filter === "ready") return clip.status === "ready";
        if (filter === "rendered") return clip.status === "rendered";
        return true;
      }),
    [filter, clipItems],
  );

  async function startUpload(source?: File | string, projectName?: string) {
    setUploadError("");
    setProgress(8);
    setProcessing(true);
    try {
      const file = source instanceof File ? source : undefined;
      const sourceUrl = typeof source === "string" ? source : undefined;
      const sourceHost = sourceUrl
        ? new URL(sourceUrl).hostname.replace(/^www\./, "")
        : "";
      const title =
        projectName?.trim() ||
        file?.name.replace(/\.[^.]+$/, "") ||
        (sourceUrl ? `Video dari ${sourceHost}` : "Project video baru");
      const created = await fetch("/api/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title,
          filename: file?.name,
          contentType: file?.type,
          sourceUrl,
        }),
      });
      if (!created.ok)
        throw new Error(
          (await created.json()).error || "Gagal membuat project",
        );
      const { project } = (await created.json()) as { project: { id: string } };
      setProgress(22);
      if (file) {
        const uploaded = await fetch(`/api/projects/${project.id}/upload`, {
          method: "PUT",
          headers: { "content-type": file.type || "video/mp4" },
          body: file,
        });
        if (!uploaded.ok)
          throw new Error((await uploaded.json()).error || "Upload gagal");
        setProgress(52);
      }
      const processed = await fetch(`/api/projects/${project.id}/process`, {
        method: "POST",
      });
      if (!processed.ok)
        throw new Error((await processed.json()).error || "Analisis gagal");
      const detailResponse = await fetch(`/api/projects/${project.id}`);
      if (detailResponse.ok) {
        const detail = (await detailResponse.json()) as {
          project: Record<string, unknown>;
          clips: Record<string, unknown>[];
        };
        const accents = ["lime", "cyan", "violet", "orange", "pink", "blue"];
        setProjectTitle(String(detail.project.title || title));
        setClipItems(
          detail.clips.map((item, index) => ({
            id: String(item.id),
            score: Number(item.score),
            duration: Math.max(
              1,
              Math.round(Number(item.end_time) - Number(item.start_time)),
            ),
            title: String(item.title),
            hook: String(item.hook),
            caption: String(item.caption),
            status: String(item.status) as Clip["status"],
            accent: accents[index % accents.length],
            startTime: Number(item.start_time),
            endTime: Number(item.end_time),
            style: String(item.style || "bold"),
            faceTracking: Boolean(item.face_tracking),
            hookOverlay: Boolean(item.hook_overlay),
            aspectRatio: String(item.aspect_ratio || "9:16"),
            fontSize: Number(item.font_size || 48),
            fontFamily: String(item.font_family || "system"),
            fontColor: String(item.font_color || "#FFFFFF"),
            fontEffect: String(item.font_effect || "outline"),
            titleEffect: String(item.title_effect || "background"),
            titleAnimation: String(item.title_animation || "fade"),
            titlePosition: String(item.title_position || "top"),
            captionPosition: String(item.caption_position || "bottom"),
            smartCleanup:
              item.smart_cleanup === undefined
                ? true
                : Boolean(item.smart_cleanup),
            watermark: Boolean(item.watermark),
            logoName: item.logo_key
              ? String(item.logo_key).split("/").pop()
              : undefined,
            postCaption: item.post_caption
              ? String(item.post_caption)
              : undefined,
            postCta: item.post_cta ? String(item.post_cta) : undefined,
            postHashtags: item.post_hashtags
              ? JSON.parse(String(item.post_hashtags))
              : [],
            subtitles: item.subtitles ? JSON.parse(String(item.subtitles)) : [],
          })),
        );
      }
      await loadProjects();
      setProgress(100);
      window.setTimeout(() => {
        setProcessing(false);
        setUploadOpen(false);
        setView("clips");
        setToast("Analisis selesai — momen terbaik ditemukan dan disimpan");
      }, 500);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Terjadi kesalahan";
      setProcessing(false);
      setUploadError(message);
      setToast(message);
    }
  }
  function go(next: View) {
    setView(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function renderClip(clip: Clip) {
    if (clip.status === "rendered" || renderingIds.includes(String(clip.id)))
      return;
    setRenderingIds((items) => [...items, String(clip.id)]);
    const renderId = String(clip.id);
    const controller = new AbortController();
    renderControllers.current.set(renderId, controller);
    setRenderProgress((items) => ({ ...items, [renderId]: 4 }));
    const progressTimer = window.setInterval(
      () =>
        setRenderProgress((items) => ({
          ...items,
          [renderId]: Math.min(
            92,
            (items[renderId] || 4) +
              Math.max(1, Math.round((95 - (items[renderId] || 4)) / 12)),
          ),
        })),
      850,
    );
    setClipItems((items) =>
      items.map((item) =>
        item.id === clip.id ? { ...item, status: "rendering" } : item,
      ),
    );
    try {
      if (typeof clip.id === "string") {
        const response = await fetch(`/api/clips/${clip.id}/render`, {
          method: "POST",
          signal: controller.signal,
        });
        if (!response.ok)
          throw new Error((await response.json()).error || "Render gagal");
      } else await new Promise((resolve) => window.setTimeout(resolve, 450));
      setClipItems((items) =>
        items.map((item) =>
          item.id === clip.id ? { ...item, status: "rendered" } : item,
        ),
      );
      setToast(
        `CLIP #${String(clip.id).slice(-2).padStart(2, "0")} selesai dirender`,
      );
      setRenderProgress((items) => ({ ...items, [renderId]: 100 }));
    } catch (error) {
      setClipItems((items) =>
        items.map((item) =>
          item.id === clip.id ? { ...item, status: "ready" } : item,
        ),
      );
      setToast(
        error instanceof DOMException && error.name === "AbortError"
          ? "Render dibatalkan"
          : error instanceof Error
            ? error.message
            : "Render gagal",
      );
    } finally {
      window.clearInterval(progressTimer);
      renderControllers.current.delete(renderId);
      setRenderingIds((items) => items.filter((id) => id !== String(clip.id)));
    }
  }
  async function cancelRender(clip: Clip) {
    const id = String(clip.id);
    renderControllers.current.get(id)?.abort();
    if (typeof clip.id === "string")
      await fetch(`/api/clips/${clip.id}/render`, { method: "DELETE" });
    setRenderProgress((items) => ({ ...items, [id]: 0 }));
  }
  async function renderAll() {
    const pending = clipItems.filter((clip) => clip.status !== "rendered");
    if (!pending.length) {
      setToast("Semua klip sudah selesai dirender");
      return;
    }
    setToast(`${pending.length} klip masuk antrean render`);
    for (const clip of pending) await renderClip(clip);
  }
  function exportClip(clip: Clip) {
    if (typeof clip.id !== "string" || clip.status !== "rendered") {
      setToast("Render klip terlebih dahulu sebelum mengunduh MP4");
      return;
    }
    window.location.assign(`/api/clips/${clip.id}/download`);
  }
  async function saveClip(updated: Clip) {
    try {
      if (typeof updated.id === "string") {
        const response = await fetch(`/api/clips/${updated.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            title: updated.title,
            hook: updated.hook,
            caption: updated.caption,
            startTime: updated.startTime ?? 0,
            endTime: updated.endTime ?? updated.duration,
            style: updated.style ?? "bold",
            faceTracking: updated.faceTracking ?? true,
            hookOverlay: updated.hookOverlay ?? true,
            captionsEnabled: updated.captionsEnabled ?? true,
            aspectRatio: updated.aspectRatio ?? "9:16",
            fontSize: updated.fontSize ?? 48,
            fontFamily: updated.fontFamily ?? "system",
            fontColor: updated.fontColor ?? "#FFFFFF",
            fontEffect: updated.fontEffect ?? "outline",
            titleEffect: updated.titleEffect ?? "background",
            titleAnimation: updated.titleAnimation ?? "fade",
            titlePosition: updated.titlePosition ?? "top",
            captionPosition: updated.captionPosition ?? "bottom",
            smartCleanup: updated.smartCleanup ?? true,
            watermark: updated.watermark ?? true,
            subtitles: updated.subtitles ?? [],
          }),
        });
        if (!response.ok)
          throw new Error(
            (await response.json()).error || "Gagal menyimpan klip",
          );
      }
      setClipItems((items) =>
        items.map((clip) => (clip.id === updated.id ? updated : clip)),
      );
      setEditor(null);
      setToast("Perubahan klip berhasil disimpan");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Gagal menyimpan klip");
    }
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <button
          className="brand"
          onClick={() => go("dashboard")}
          aria-label="Buka KLIYU Home"
        >
          <span className="brand-mark">
            <Clapperboard />
          </span>
          <span>
            KLIYU<span className="brand-dot">.</span>
          </span>
        </button>
        <nav className="nav-list" aria-label="Navigasi utama">
          <button
            className={view === "dashboard" ? "active" : ""}
            onClick={() => go("dashboard")}
          >
            <span>
              <HomeIcon />
            </span>
            Dashboard
          </button>
          <button
            className={view === "projects" ? "active" : ""}
            onClick={() => go("projects")}
          >
            <span>
              <FolderKanban />
            </span>
            Projects
          </button>
          <button
            className={view === "clips" ? "active" : ""}
            onClick={() => go("clips")}
          >
            <span>
              <WandSparkles />
            </span>
            AI Clips <b>{clipItems.length}</b>
          </button>
          <button
            onClick={() =>
              clipItems[0]
                ? setEditor(clipItems[0])
                : setToast("Buat atau buka project terlebih dahulu")
            }
          >
            <span>
              <Pencil />
            </span>
            Studio
          </button>
          <button
            className={view === "published" ? "active" : ""}
            onClick={() => go("published")}
          >
            <span>
              <Send />
            </span>
            Published
          </button>
          <button
            className={view === "analytics" ? "active" : ""}
            onClick={() => go("analytics")}
          >
            <span>
              <BarChart3 />
            </span>
            Analytics
          </button>
          <button
            className={view === "monetization" ? "active" : ""}
            onClick={() => go("monetization")}
          >
            <span>
              <BadgeDollarSign />
            </span>
            Monetization
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="usage-card personal-card">
            <div className="usage-icon">
              <Sparkles />
            </div>
            <strong>{usage.used} menit diproses</strong>
            <span>Personal content engine</span>
            <div className="usage-bar">
              <i
                style={{
                  width: `${Math.min(100, Math.round((usage.used / Math.max(1, usage.limit)) * 100))}%`,
                }}
              />
            </div>
            <small>SOURCE → CLIPS → MONEY</small>
          </div>
          <button
            className={`settings-button ${view === "settings" ? "active" : ""}`}
            onClick={() => go("settings")}
          >
            <span>
              <Settings />
            </span>
            Settings
          </button>
          <div className="profile-wrap">
            <div className="profile">
              <div className="avatar">
                {accountName
                  .split(/\s+/)
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <div>
                <strong>{accountName}</strong>
                <span>Owner workspace</span>
              </div>
              <button
                aria-label="Menu profil"
                onClick={() => setProfileOpen(!profileOpen)}
              >
                <MoreHorizontal />
              </button>
            </div>
            {profileOpen && (
              <div className="profile-menu">
                <button
                  onClick={() => {
                    go("settings");
                    setProfileOpen(false);
                  }}
                >
                  Account settings
                </button>
                <a href="/signout-with-chatgpt?return_to=/">Sign out</a>
              </div>
            )}
          </div>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <button className="mobile-brand" onClick={() => go("dashboard")}>
            <span className="brand-mark">
              <Clapperboard />
            </span>
            KLIYU.
          </button>
          <div className="breadcrumbs">
            KLIYU <span>/</span>{" "}
            {
              {
                dashboard: "Dashboard",
                projects: "Projects",
                clips: "AI Clips",
                published: "Published",
                analytics: "Analytics",
                monetization: "Monetization",
                settings: "Settings",
              }[view]
            }
          </div>
          <div className="top-actions">
            <button
              className="icon-button"
              aria-label="Bantuan"
              onClick={() => setHelpOpen(true)}
            >
              <CircleHelp />
            </button>
            <button
              className={`icon-button notification ${notices.some((item) => !item.read) ? "has-unread" : ""}`}
              aria-label="Notifikasi"
              onClick={() => setNoticesOpen(true)}
            >
              <Bell />
            </button>
            <button
              className="primary small"
              onClick={() => setUploadOpen(true)}
            >
              <Plus /> New project
            </button>
          </div>
        </header>
        {view === "dashboard" && (
          <Dashboard
            projects={projects}
            clips={clipItems}
            usage={usage.used}
            business={business}
            name={accountName}
            onUpload={() => setUploadOpen(true)}
            onStudio={() =>
              clipItems[0]
                ? setEditor(clipItems[0])
                : setToast("Buat atau buka project terlebih dahulu")
            }
            onClips={() => go("clips")}
            onOpenProject={openProject}
            onProjects={() => go("projects")}
          />
        )}
        {view === "clips" && (
          <ClipsPage
            projectTitle={projectTitle}
            items={clipItems}
            filter={filter}
            setFilter={setFilter}
            filtered={filtered}
            onBack={() => go("projects")}
            onNotice={setToast}
            onEdit={setEditor}
            onPreview={setPreview}
            onRender={renderClip}
            onExport={exportClip}
            onRenderAll={renderAll}
            renderingIds={renderingIds}
            renderProgress={renderProgress}
            onCancelRender={cancelRender}
          />
        )}
        {view === "projects" && (
          <ProjectsPage
            projects={projects}
            onOpen={openProject}
            onUpload={() => setUploadOpen(true)}
          />
        )}
        {(view === "published" ||
          view === "analytics" ||
          view === "monetization") && (
          <ContentOS mode={view} notify={setToast} />
        )}
        {view === "settings" && (
          <SettingsPage
            notify={setToast}
            accountName={accountName}
            accountEmail={accountEmail}
          />
        )}
      </section>

      <nav className="mobile-nav">
        <button
          className={view === "dashboard" ? "active" : ""}
          onClick={() => go("dashboard")}
        >
          <span>
            <HomeIcon />
          </span>
          Home
        </button>
        <button
          className={view === "clips" ? "active" : ""}
          onClick={() => go("clips")}
        >
          <span>
            <Play />
          </span>
          Clips
        </button>
        <button
          className="mobile-create"
          aria-label="Buat dengan Kliyu AI"
          onClick={() => setUploadOpen(true)}
        >
          <WandSparkles />
        </button>
        <button
          className={view === "published" ? "active" : ""}
          onClick={() => go("published")}
        >
          <span>
            <Send />
          </span>
          Published
        </button>
        <button
          className={view === "analytics" ? "active" : ""}
          onClick={() => go("analytics")}
        >
          <span>
            <BarChart3 />
          </span>
          Analytics
        </button>
        <button
          className={view === "monetization" ? "active" : ""}
          onClick={() => go("monetization")}
        >
          <span>
            <BadgeDollarSign />
          </span>
          Money
        </button>
        <button
          className={view === "settings" ? "active" : ""}
          onClick={() => go("settings")}
        >
          <span>
            <Settings />
          </span>
          Settings
        </button>
      </nav>
      {uploadOpen && (
        <UploadModal
          processing={processing}
          progress={progress}
          error={uploadError}
          onClose={() => !processing && setUploadOpen(false)}
          onStart={startUpload}
          inputRef={inputRef}
        />
      )}
      {preview && (
        <ClipPreview
          clip={preview}
          onClose={() => setPreview(null)}
          onEdit={() => {
            setPreview(null);
            setEditor(preview);
          }}
        />
      )}
      {editor && (
        <ClipEditor
          clip={editor}
          onClose={() => setEditor(null)}
          onSave={saveClip}
          onNotice={setToast}
        />
      )}
      {helpOpen && (
        <HelpModal
          onClose={() => setHelpOpen(false)}
          onNewProject={() => {
            setHelpOpen(false);
            setUploadOpen(true);
          }}
        />
      )}
      {noticesOpen && (
        <NotificationsModal
          items={notices}
          onClose={() => setNoticesOpen(false)}
          onReadAll={async () => {
            await fetch("/api/notifications", {
              method: "PATCH",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ all: true }),
            });
            setNotices((items) => items.map((item) => ({ ...item, read: 1 })));
          }}
        />
      )}
      {toast && (
        <div className="toast">
          <span>
            <CheckCircle2 />
          </span>
          {toast}
        </div>
      )}
    </main>
  );
}

function Dashboard({
  projects,
  clips,
  usage,
  business,
  name,
  onUpload,
  onStudio,
  onClips,
  onOpenProject,
  onProjects,
}: {
  projects: ProjectSummary[];
  clips: Clip[];
  usage: number;
  business: BusinessSummary;
  name: string;
  onUpload: () => void;
  onStudio: () => void;
  onClips: () => void;
  onOpenProject: (id: string) => void;
  onProjects: () => void;
}) {
  return (
    <div className="page dashboard-page">
      <div className="hero-copy personal-hero">
        <div>
          <span className="eyebrow">
            <i /> PERSONAL CONTENT OS
          </span>
          <h1>
            Good morning, {name.split(" ")[0]}.<br />
            <em>What are we clipping today?</em>
          </h1>
          <p>
            Satu tempat untuk mengubah video panjang menjadi short content,
            memantau performa, dan mencatat pendapatan.
          </p>
          <div className="hero-actions">
            <button className="primary" onClick={onUpload}>
              <WandSparkles /> New Project
            </button>
            <button onClick={onStudio}>
              <Pencil /> Open Studio
            </button>
          </div>
        </div>
        <div className="hero-stats business-stats">
          <div>
            <strong>{business.projects || projects.length}</strong>
            <span>Projects</span>
          </div>
          <div>
            <strong>{business.clips || clips.length}</strong>
            <span>Clips generated</span>
          </div>
          <div>
            <strong>{business.published}</strong>
            <span>Published</span>
          </div>
          <div>
            <strong>
              {new Intl.NumberFormat("id-ID", { notation: "compact" }).format(
                business.views,
              )}
            </strong>
            <span>Total views</span>
          </div>
          <div>
            <strong>
              {new Intl.NumberFormat("id-ID", {
                style: "currency",
                currency: "IDR",
                notation: "compact",
                maximumFractionDigits: 1,
              }).format(business.revenue)}
            </strong>
            <span>Revenue</span>
          </div>
          <div>
            <strong>{usage}m</strong>
            <span>Processed</span>
          </div>
        </div>
      </div>
      <button className="upload-zone" onClick={onUpload}>
        <div className="upload-visual">
          <span>
            <UploadCloud />
          </span>
          <i />
          <i />
        </div>
        <div>
          <strong>Drop video Anda di sini</strong>
          <span>atau klik untuk memilih file</span>
        </div>
        <b>Create with Kliyu AI</b>
        <small>MP4, MOV · AI aktif setelah API terhubung</small>
      </button>
      <section className="section-block">
        <div className="section-title">
          <div>
            <span>RECENT WORK</span>
            <h2>Project terbaru</h2>
          </div>
          <button onClick={onProjects}>
            Lihat semua{" "}
            <span>
              <ArrowRight />
            </span>
          </button>
        </div>
        <div className="project-grid">
          {projects.slice(0, 2).map((project, index) => (
            <article
              key={project.id}
              className={`project-card ${index === 0 ? "featured" : ""}`}
              onClick={() => onOpenProject(project.id)}
            >
              <div
                className={`project-cover ${index === 0 ? "cover-one" : "cover-two"}`}
              >
                <div className="cover-person">
                  <i />
                  <b />
                </div>
                <span className="cover-badge">
                  {project.clip_count || 0} CLIPS
                </span>
              </div>
              <div className="project-info">
                <div>
                  <span
                    className={`status-dot ${project.status === "complete" ? "done" : ""}`}
                  />
                  {project.status === "complete"
                    ? "Selesai diproses"
                    : `${project.progress || 0}% diproses`}
                </div>
                <h3>{project.title}</h3>
                <p>{project.clip_count || 0} clips ditemukan</p>
                <div className="score-row">
                  <span>{project.status}</span>
                  <button>
                    Open project <ArrowRight />
                  </button>
                </div>
              </div>
            </article>
          ))}
          <button className="new-project-card" onClick={onUpload}>
            <span>
              <Plus />
            </span>
            <strong>Buat project baru</strong>
            <small>Mulai dari video Anda</small>
          </button>
        </div>
      </section>
      <section className="section-block recent-clips">
        <div className="section-title">
          <div>
            <span>READY TO SHARE</span>
            <h2>Recent Clips</h2>
          </div>
          <button onClick={onClips}>
            Lihat semua{" "}
            <span>
              <ArrowRight />
            </span>
          </button>
        </div>
        {clips.length ? (
          <div className="recent-clip-grid">
            {clips.slice(0, 3).map((clip) => (
              <button key={clip.id} onClick={onClips}>
                <span className={`recent-clip-art ${clip.accent}`}>
                  <Play />
                </span>
                <span>
                  <b>{clip.title}</b>
                  <small>
                    <Flame /> {clip.score} · {clip.duration} sec
                  </small>
                </span>
                <ArrowRight />
              </button>
            ))}
          </div>
        ) : (
          <div className="clips-empty">
            <Clapperboard />
            <h3>Belum ada clip</h3>
            <p>Buat project pertama untuk menemukan momen terbaik.</p>
            <button onClick={onUpload}>New project</button>
          </div>
        )}
      </section>
    </div>
  );
}

function ClipsPage({
  projectTitle,
  items,
  filter,
  setFilter,
  filtered,
  onBack,
  onNotice,
  onEdit,
  onPreview,
  onRender,
  onExport,
  onRenderAll,
  renderingIds,
  renderProgress,
  onCancelRender,
}: {
  projectTitle: string;
  items: Clip[];
  filter: "all" | "hot" | "ready" | "rendered";
  setFilter: (v: "all" | "hot" | "ready" | "rendered") => void;
  filtered: Clip[];
  onBack: () => void;
  onNotice: (message: string) => void;
  onEdit: (c: Clip) => void;
  onPreview: (c: Clip) => void;
  onRender: (c: Clip) => void;
  onExport: (c: Clip) => void;
  onRenderAll: () => void;
  renderingIds: string[];
  renderProgress: Record<string, number>;
  onCancelRender: (clip: Clip) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const hotCount = items.filter((clip) => clip.score >= 85).length;
  const renderedCount = items.filter(
    (clip) => clip.status === "rendered",
  ).length;
  const readyCount = items.filter((clip) => clip.status === "ready").length;
  const topScore = Math.max(0, ...items.map((clip) => clip.score));
  function downloadReport() {
    const report = [
      `KLIYU — ${projectTitle}`,
      `${items.length} clips · ${hotCount} hot · ${renderedCount} exported`,
      "",
      ...items.map(
        (clip, index) =>
          `${index + 1}. ${clip.title} (${clip.score}/100)\n${clip.hook}`,
      ),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([report], { type: "text/plain" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${
      projectTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "kliyu-project"
    }-report.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
    setMenuOpen(false);
    onNotice("Laporan analisis berhasil diunduh");
  }
  async function copySummary() {
    await navigator.clipboard.writeText(
      `${projectTitle}: ${items.length} clips, ${hotCount} hot clips, top score ${topScore}.`,
    );
    setMenuOpen(false);
    onNotice("Ringkasan project berhasil disalin");
  }
  return (
    <div className="page clips-page">
      <div className="project-heading">
        <div>
          <button className="back-link" onClick={onBack}>
            <ArrowLeft /> Projects
          </button>
          <div className="title-line">
            <h1>{projectTitle}</h1>
            <span>Complete</span>
          </div>
          <p>
            {items.reduce((total, clip) => total + clip.duration, 0)} detik
            pilihan · Bahasa Indonesia · Analisis selesai
          </p>
        </div>
        <div className="project-menu-wrap">
          <button
            className="outline-button"
            aria-label="Menu project"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <MoreHorizontal />
          </button>
          {menuOpen && (
            <div className="project-action-menu">
              <button onClick={copySummary}>
                <Copy /> Salin ringkasan
              </button>
              <button onClick={downloadReport}>
                <Download /> Unduh laporan
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="result-summary">
        <div className="radial-score">
          <strong>{topScore}</strong>
          <span>TOP SCORE</span>
        </div>
        <div>
          <span className="eyebrow">
            <i /> ANALYSIS COMPLETE
          </span>
          <h2>{items.length} momen menarik ditemukan.</h2>
          <p>
            AI memilih bagian terbaik berdasarkan hook, konteks, dan kekuatan
            insight.
          </p>
        </div>
        <div className="summary-metrics">
          <div>
            <strong>{items.length}</strong>
            <span>Found</span>
          </div>
          <div>
            <strong>{hotCount}</strong>
            <span>
              <Flame /> Hot
            </span>
          </div>
          <div>
            <strong>{renderedCount}</strong>
            <span>Rendered</span>
          </div>
        </div>
      </div>
      <div className="clip-toolbar">
        <div>
          <h2>My Clips</h2>
          <span>{filtered.length} results</span>
        </div>
        <div className="filter-tabs">
          <button
            className={filter === "all" ? "active" : ""}
            onClick={() => setFilter("all")}
          >
            All <span>{items.length}</span>
          </button>
          <button
            className={filter === "hot" ? "active" : ""}
            onClick={() => setFilter("hot")}
          >
            <Flame /> Hot <span>{hotCount}</span>
          </button>
          <button
            className={filter === "ready" ? "active" : ""}
            onClick={() => setFilter("ready")}
          >
            Ready <span>{readyCount}</span>
          </button>
          <button
            className={filter === "rendered" ? "active" : ""}
            onClick={() => setFilter("rendered")}
          >
            <Check /> Exported <span>{renderedCount}</span>
          </button>
        </div>
        <button
          className="primary"
          disabled={renderingIds.length > 0 || renderedCount === items.length}
          onClick={onRenderAll}
        >
          {renderingIds.length
            ? `Rendering ${renderingIds.length}...`
            : renderedCount === items.length
              ? "All exported"
              : "Render all"}{" "}
          <ArrowRight />
        </button>
      </div>
      {filtered.length ? (
        <div className="clips-grid">
          {filtered.map((clip) => (
            <ClipCard
              key={clip.id}
              clip={clip}
              onEdit={() => onEdit(clip)}
              onPreview={() => onPreview(clip)}
              onRender={() => onRender(clip)}
              onExport={() => onExport(clip)}
              rendering={renderingIds.includes(String(clip.id))}
              progress={renderProgress[String(clip.id)] || 0}
              onCancel={() => onCancelRender(clip)}
            />
          ))}
        </div>
      ) : (
        <div className="clips-empty">
          <Clapperboard />
          <h3>Tidak ada klip di filter ini</h3>
          <p>Coba pilih filter lain untuk melihat hasil analisis.</p>
          <button onClick={() => setFilter("all")}>Tampilkan semua klip</button>
        </div>
      )}
    </div>
  );
}

function ClipCard({
  clip,
  onEdit,
  onPreview,
  onRender,
  onExport,
  rendering,
  progress,
  onCancel,
}: {
  clip: Clip;
  onEdit: () => void;
  onPreview: () => void;
  onRender: () => void;
  onExport: () => void;
  rendering: boolean;
  progress: number;
  onCancel: () => void;
}) {
  return (
    <article className="clip-card">
      <div className={`clip-preview ${clip.accent}`}>
        <ClipThumbnail clip={clip} />
        <div className="clip-score">
          <span>
            <Flame />
          </span>
          <strong>{clip.score}</strong>
          <small>VIRAL SCORE</small>
        </div>
        <span className={`clip-state ${clip.status}`}>
          {clip.status === "rendered"
            ? "FINAL"
            : clip.status === "rendering"
              ? "RENDERING"
              : "SOURCE"}
        </span>
        <span className="clip-duration">
          00:{String(clip.duration).padStart(2, "0")}
        </span>
        <button
          className="play-button"
          onClick={onPreview}
          aria-label={`Preview ${clip.title}`}
        >
          <Play />
        </button>
      </div>
      <div className="clip-body">
        <div className="clip-kicker">
          <span>CLIP #{String(clip.id).slice(-2).padStart(2, "0")}</span>
          <span>
            {clip.duration} sec · {clip.aspectRatio || "9:16"}
          </span>
        </div>
        <h3>{clip.title}</h3>
        <p>“{clip.hook}”</p>
        {rendering && (
          <div className="render-progress">
            <span style={{ width: `${progress}%` }} />
            <b>{progress}% · antrean lokal</b>
          </div>
        )}
        <div className="clip-actions">
          <button onClick={onEdit}>
            <Pencil /> Edit
          </button>
          <button onClick={onPreview}>
            <Eye /> Preview
          </button>
          <button
            className={`render-button ${rendering ? "is-rendering" : ""}`}
            onClick={
              rendering
                ? onCancel
                : clip.status === "rendered"
                  ? onExport
                  : onRender
            }
          >
            {rendering || clip.status === "rendering" ? (
              <>
                <X /> Batalkan
              </>
            ) : clip.status === "rendered" ? (
              <>
                <Download /> Export MP4
              </>
            ) : (
              <>
                Render <ArrowRight />
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}

function ClipThumbnail({ clip }: { clip: Clip }) {
  const ref = useRef<HTMLVideoElement>(null);
  const source =
    clip.status === "rendered"
      ? `/api/clips/${clip.id}/media`
      : `/api/clips/${clip.id}/media?source=1`;
  return (
    <video
      ref={ref}
      className="clip-card-video"
      src={source}
      muted
      playsInline
      preload="metadata"
      onLoadedMetadata={() => {
        if (ref.current && clip.status !== "rendered")
          ref.current.currentTime = clip.startTime || 0;
      }}
    />
  );
}

function ClipPreview({
  clip,
  onClose,
  onEdit,
}: {
  clip: Clip;
  onClose: () => void;
  onEdit: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const rendered = clip.status === "rendered";
  function positionPreview() {
    if (!rendered && videoRef.current)
      videoRef.current.currentTime = clip.startTime || 0;
  }
  function stopAtClipEnd() {
    const video = videoRef.current;
    if (
      !rendered &&
      video &&
      clip.endTime !== undefined &&
      video.currentTime >= clip.endTime
    ) {
      video.pause();
      video.currentTime = clip.startTime || 0;
    }
  }
  return (
    <div
      className="modal-backdrop preview-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        className="clip-preview-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Preview ${clip.title}`}
      >
        <button
          className="close-button"
          aria-label="Tutup preview"
          onClick={onClose}
        >
          <X />
        </button>
        <div className={`preview-stage ${clip.accent}`}>
          <video
            ref={videoRef}
            className={`real-clip-video ratio-${(clip.aspectRatio || "9:16").replace(":", "-")}`}
            src={`/api/clips/${clip.id}/media`}
            controls
            playsInline
            preload="metadata"
            onLoadedMetadata={positionPreview}
            onTimeUpdate={stopAtClipEnd}
          >
            Browser Anda tidak mendukung pemutar video.
          </video>
        </div>
        <div className="preview-details">
          <span className="modal-kicker">
            {rendered ? "FINAL CLIP PREVIEW" : "SOURCE CLIP PREVIEW"}
          </span>
          <h2>{clip.title}</h2>
          <p>{clip.caption}</p>
          {!rendered && (
            <p className="preview-note">
              Ini preview potongan dari video sumber. Klik Render untuk melihat
              crop, subtitle, hook, dan watermark final.
            </p>
          )}
          <div className="preview-stats">
            <span>
              <Flame /> <b>{clip.score}</b> Viral score
            </span>
            <span>{clip.duration} detik</span>
            <span>{clip.aspectRatio || "9:16"}</span>
          </div>
          <div className="preview-actions">
            <button onClick={onEdit}>
              <Pencil /> Edit clip
            </button>
            {rendered ? (
              <a className="primary" href={`/api/clips/${clip.id}/download`}>
                <Download /> Export MP4
              </a>
            ) : (
              <button className="primary" onClick={onEdit}>
                <Pencil /> Edit sebelum render
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function ProjectsPage({
  projects,
  onOpen,
  onUpload,
}: {
  projects: ProjectSummary[];
  onOpen: (id: string) => void;
  onUpload: () => void;
}) {
  return (
    <div className="page projects-page">
      <div className="simple-heading">
        <div>
          <span className="eyebrow">
            <i /> YOUR LIBRARY
          </span>
          <h1>Semua project</h1>
          <p>Kelola video panjang dan semua klip yang sudah dihasilkan.</p>
        </div>
        <button className="primary" onClick={onUpload}>
          <Plus /> New project
        </button>
      </div>
      {projects.length ? (
        <div className="table-card">
          <div className="table-row table-head">
            <span>PROJECT</span>
            <span>STATUS</span>
            <span>CLIPS</span>
            <span>PROGRESS</span>
            <span />
          </div>
          {projects.map((project, index) => (
            <button
              className="table-row"
              key={project.id}
              onClick={() => onOpen(project.id)}
            >
              <span className="project-cell">
                <i className={`table-thumb thumb-${(index % 3) + 1}`} />
                <span>
                  <strong>{project.title}</strong>
                  <small>
                    {Math.round(project.duration || 0)} sec · Indonesian
                  </small>
                </span>
              </span>
              <span>
                <b className={`table-status ${project.status}`}>
                  {project.status}
                </b>
              </span>
              <span>{project.clip_count || 0} clips</span>
              <span>{project.progress || 0}%</span>
              <span>
                <ArrowRight />
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="clips-empty">
          <FolderKanban />
          <h3>Belum ada project</h3>
          <p>Upload video asli atau masukkan link video langsung.</p>
          <button onClick={onUpload}>Buat project pertama</button>
        </div>
      )}
    </div>
  );
}

function AutopilotPage({ notify }: { notify: (message: string) => void }) {
  const [watch, setWatch] = useState(true),
    [mode, setMode] = useState<"approval" | "autopilot">("approval"),
    [score, setScore] = useState(85),
    [limit, setLimit] = useState(3);
  const [platforms, setPlatforms] = useState(["Instagram", "TikTok"]);
  const [channel, setChannel] = useState("https://youtube.com/@tuahkreasi");
  const [videoUrl, setVideoUrl] = useState("");
  const [saving, setSaving] = useState(false);
  async function action(payload: Record<string, unknown>, success: string) {
    setSaving(true);
    try {
      const response = await fetch("/api/automation", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error((await response.json()).error);
      notify(success);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }
  function togglePlatform(name: string) {
    setPlatforms((value) =>
      value.includes(name) ? value.filter((x) => x !== name) : [...value, name],
    );
  }
  async function importVideo() {
    if (!/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(videoUrl)) {
      notify("Masukkan URL video YouTube yang valid");
      return;
    }
    setSaving(true);
    try {
      const created = await fetch("/api/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: "Video YouTube Baru",
          sourceUrl: videoUrl,
        }),
      });
      if (!created.ok) throw new Error("Gagal membuat project");
      const { project } = (await created.json()) as { project: { id: string } };
      await fetch(`/api/projects/${project.id}/process`, { method: "POST" });
      setVideoUrl("");
      notify("Video YouTube masuk antrean pemrosesan");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Import gagal");
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="page autopilot-page">
      <div className="simple-heading">
        <div>
          <span className="eyebrow">
            <i /> CONTENT ON AUTOPILOT
          </span>
          <h1>
            Mesin konten yang tetap jalan
            <br />
            saat Anda <em>offline.</em>
          </h1>
          <p>
            Pantau channel, buat klip, minta approval, lalu posting otomatis.
          </p>
        </div>
        <span className="system-live">● SYSTEM ONLINE</span>
      </div>
      <div className="automation-flow">
        <span>VIDEO BARU</span>
        <i>
          <ArrowRight />
        </i>
        <span>DETEKSI</span>
        <i>
          <ArrowRight />
        </i>
        <span>BIKIN KLIP</span>
        <i>
          <ArrowRight />
        </i>
        <span>APPROVAL</span>
        <i>
          <ArrowRight />
        </i>
        <span>POSTING</span>
      </div>
      <div className="autopilot-grid">
        <section className="auto-card url-card">
          <div className="card-head">
            <div>
              <small>QUICK IMPORT</small>
              <h2>Tempel link video panjang</h2>
            </div>
            <span className="card-icon">
              <Link2 />
            </span>
          </div>
          <div className="big-url-input">
            <input
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
            />
            <button disabled={saving} onClick={importVideo}>
              Bikin klip <ArrowRight />
            </button>
          </div>
          <p>
            Judul, thumbnail, dan durasi akan diambil otomatis ketika YouTube
            API terhubung.
          </p>
        </section>
        <section className="auto-card channel-card">
          <div className="card-head">
            <div>
              <small>SOURCE 01</small>
              <h2>Channel Watch</h2>
            </div>
            <Toggle
              label=""
              value={watch}
              setValue={(v) => {
                setWatch(v);
                action(
                  { action: "toggle-watch", id: "primary", enabled: v },
                  v ? "Channel Watch aktif" : "Channel Watch dijeda",
                );
              }}
            />
          </div>
          <div className="channel-box">
            <b className="youtube-mark">
              <Youtube />
            </b>
            <div>
              <strong>TUAH KREASI</strong>
              <span>Dipantau setiap 15 menit</span>
            </div>
            <em>CONNECTED</em>
          </div>
          <label className="channel-input">
            <span>Tambah channel YouTube</span>
            <div>
              <input
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
              />
              <button
                disabled={saving}
                onClick={() =>
                  action(
                    {
                      action: "connect-channel",
                      url: channel,
                      name: "TUAH KREASI",
                    },
                    "Channel berhasil dihubungkan",
                  )
                }
              >
                Connect <ArrowRight />
              </button>
            </div>
          </label>
          <div className="detected-video">
            <i className="video-dot" />
            <div>
              <small>VIDEO BARU TERDETEKSI</small>
              <strong>KEJAR SETORAN — ENZY STORIA</strong>
              <span>7 clips dibuat · 3 menunggu approval</span>
            </div>
            <button onClick={() => notify("Membuka approval queue")}>
              Review
            </button>
          </div>
        </section>
        <section className="auto-card rules-card">
          <div className="card-head">
            <div>
              <small>POSTING RULES</small>
              <h2>Autopilot rules</h2>
            </div>
            <span className="card-icon">
              <Gauge />
            </span>
          </div>
          <div className="mode-switch">
            <button
              className={mode === "approval" ? "active" : ""}
              onClick={() => setMode("approval")}
            >
              Approval dulu
            </button>
            <button
              className={mode === "autopilot" ? "active" : ""}
              onClick={() => setMode("autopilot")}
            >
              Full autopilot
            </button>
          </div>
          <label>
            Minimal Hot Score <b>{score}</b>
            <input
              type="range"
              min="60"
              max="100"
              value={score}
              onChange={(e) => setScore(Number(e.target.value))}
            />
          </label>
          <label>
            Maksimal posting per hari{" "}
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
            >
              <option>1</option>
              <option>2</option>
              <option>3</option>
              <option>5</option>
            </select>
          </label>
          <label>
            Jam posting{" "}
            <div className="time-chips">
              <span>12:00</span>
              <span>19:00</span>
              <button
                aria-label="Tambah slot waktu"
                onClick={() => notify("Slot waktu baru ditambahkan")}
              >
                <Plus />
              </button>
            </div>
          </label>
          <button
            className="primary save-rules"
            disabled={saving}
            onClick={() =>
              action(
                {
                  action: "save-rules",
                  mode,
                  minScore: score,
                  dailyLimit: limit,
                  postingTimes: ["12:00", "19:00"],
                  platforms: platforms.map((x) => x.toLowerCase()),
                },
                "Aturan autopilot tersimpan",
              )
            }
          >
            Save rules
          </button>
        </section>
        <section className="auto-card platform-card">
          <div className="card-head">
            <div>
              <small>DISTRIBUTION</small>
              <h2>Auto posting</h2>
            </div>
            <span>{platforms.length}/4 aktif</span>
          </div>
          <div className="platform-list">
            {(
              [
                ["TikTok", Music2],
                ["Instagram", Instagram],
                ["Facebook", Share2],
                ["YouTube Shorts", Youtube],
              ] as const
            ).map(([name, PlatformIcon]) => (
              <button key={name} onClick={() => togglePlatform(name)}>
                <b>
                  <PlatformIcon />
                </b>
                <span>
                  <strong>{name}</strong>
                  <small>
                    {platforms.includes(name)
                      ? "Siap posting"
                      : "Hubungkan akun"}
                  </small>
                </span>
                <i className={platforms.includes(name) ? "connected" : ""}>
                  {platforms.includes(name) ? <Check /> : <Plus />}
                </i>
              </button>
            ))}
          </div>
        </section>
        <section className="auto-card approval-card">
          <div className="card-head">
            <div>
              <small>APPROVAL QUEUE</small>
              <h2>3 clips menunggu</h2>
            </div>
            <button
              onClick={() => notify("Semua klip disetujui dan dijadwalkan")}
            >
              Approve all
            </button>
          </div>
          {demoClips.slice(0, 3).map((clip, index) => (
            <div className="approval-row" key={clip.id}>
              <span className={`approval-thumb ${clip.accent}`}>
                <Play />
              </span>
              <div>
                <strong>{clip.title}</strong>
                <small>
                  <Flame /> {clip.score} · {clip.duration} detik
                </small>
              </div>
              <button
                aria-label={`Tolak clip ${clip.id}`}
                onClick={() => notify(`Clip #${clip.id} ditolak`)}
              >
                <X />
              </button>
              <button
                aria-label={`Setujui clip ${clip.id}`}
                className="approve"
                onClick={() => notify(`Clip #${clip.id} disetujui`)}
              >
                <Check />
              </button>
              {index === 0 && <em>12:00</em>}
            </div>
          ))}
        </section>
        <section className="auto-card analytics-card">
          <div className="card-head">
            <div>
              <small>LAST 30 DAYS</small>
              <h2>Performance</h2>
            </div>
            <button onClick={() => notify("Laporan CSV sedang disiapkan")}>
              Export <ArrowUpRight />
            </button>
          </div>
          <div className="metric-strip">
            <div>
              <strong>248K</strong>
              <span>Views</span>
            </div>
            <div>
              <strong>18.2K</strong>
              <span>Likes</span>
            </div>
            <div>
              <strong>7.3%</strong>
              <span>Engagement</span>
            </div>
          </div>
          <div className="chart-bars">
            {[35, 48, 42, 68, 55, 78, 92, 74, 88, 96, 81, 100].map((h, i) => (
              <i key={i} style={{ height: `${h}%` }} />
            ))}
          </div>
          <p>
            <TrendingUp /> 32% dibanding 30 hari sebelumnya
          </p>
        </section>
        <section className="auto-card affiliate-card">
          <div className="card-head">
            <div>
              <small>CREATOR PARTNER</small>
              <h2>Affiliate</h2>
            </div>
            <span>20% komisi</span>
          </div>
          <div className="affiliate-value">
            <strong>Rp1.240.000</strong>
            <span>Komisi tersedia</span>
          </div>
          <div className="affiliate-stats">
            <span>
              <b>184</b> Klik
            </span>
            <span>
              <b>23</b> Signup
            </span>
            <span>
              <b>8</b> Transaksi
            </span>
          </div>
          <button
            className="referral-button"
            onClick={() =>
              action(
                { action: "create-referral" },
                "Link referral berhasil disalin",
              )
            }
          >
            kliyu.ai/ref/KLIYU8A2F{" "}
            <b>
              Copy <Copy />
            </b>
          </button>
        </section>
      </div>
    </div>
  );
}
void AutopilotPage;

function SettingsPage({
  notify,
  accountName,
  accountEmail,
}: {
  notify: (message: string) => void;
  accountName: string;
  accountEmail: string;
}) {
  const [language, setLanguage] = useState("id"),
    [timezone, setTimezone] = useState("Asia/Jakarta"),
    [style, setStyle] = useState("bold"),
    [email, setEmail] = useState(true),
    [processing, setProcessing] = useState(true),
    [publishing, setPublishing] = useState(true),
    [saving, setSaving] = useState(false);
  const [active, setActive] = useState("account");
  const [capabilities, setCapabilities] = useState<Record<string, boolean>>({});
  function jump(id: string) {
    setActive(id);
    document
      .getElementById(`settings-${id}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  async function save() {
    setSaving(true);
    try {
      const response = await fetch("/api/account", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          language,
          timezone,
          subtitleStyle: style,
          emailNotifications: email,
          processingNotifications: processing,
          publishNotifications: publishing,
        }),
      });
      if (!response.ok) throw new Error("Gagal menyimpan");
      notify("Semua pengaturan berhasil disimpan");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }
  useEffect(() => {
    fetch("/api/account")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const s = data?.settings;
        if (!s) return;
        setLanguage(s.language);
        setTimezone(s.timezone);
        setStyle(s.subtitle_style);
        setEmail(Boolean(s.email_notifications));
        setProcessing(Boolean(s.processing_notifications));
        setPublishing(Boolean(s.publish_notifications));
      })
      .catch(() => {});
    fetch("/api/capabilities")
      .then((r) => (r.ok ? r.json() : {}))
      .then(setCapabilities)
      .catch(() => {});
  }, []);
  return (
    <div className="page settings-page">
      <div className="simple-heading">
        <div>
          <span className="eyebrow">
            <i /> PERSONAL WORKSPACE
          </span>
          <h1>Settings</h1>
          <p>Kelola akun, preferensi video, integrasi, dan notifikasi.</p>
        </div>
        <button className="primary" disabled={saving} onClick={save}>
          {saving ? "Saving..." : "Save changes"}
        </button>
      </div>
      <div className="settings-layout">
        <nav>
          {[
            ["account", "Account"],
            ["video", "Video defaults"],
            ["notifications", "Notifications"],
            ["integrations", "Integrations"],
          ].map(([id, label]) => (
            <button
              key={id}
              className={active === id ? "active" : ""}
              onClick={() => jump(id)}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="settings-content">
          <section id="settings-account" className="settings-panel">
            <div>
              <small>PROFILE</small>
              <h2>Informasi akun</h2>
            </div>
            <div className="account-line">
              <span className="large-avatar">
                {accountName
                  .split(/\s+/)
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </span>
              <div>
                <strong>{accountName}</strong>
                <span>{accountEmail || "Akun ChatGPT terverifikasi"}</span>
              </div>
              <a href="/signout-with-chatgpt?return_to=/">Sign out</a>
            </div>
          </section>
          <section id="settings-video" className="settings-panel">
            <div>
              <small>VIDEO DEFAULTS</small>
              <h2>Preferensi pemrosesan</h2>
            </div>
            <div className="settings-fields">
              <label>
                Bahasa transkripsi
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                >
                  <option value="id">Bahasa Indonesia</option>
                  <option value="en">English</option>
                  <option value="auto">Auto detect</option>
                </select>
              </label>
              <label>
                Zona waktu
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                >
                  <option>Asia/Jakarta</option>
                  <option>Asia/Makassar</option>
                  <option>Asia/Jayapura</option>
                </select>
              </label>
              <label>
                Gaya subtitle
                <select
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                >
                  <option value="clean">Clean</option>
                  <option value="bold">Bold</option>
                  <option value="karaoke">Karaoke</option>
                </select>
              </label>
            </div>
          </section>
          <section id="settings-notifications" className="settings-panel">
            <div>
              <small>NOTIFICATIONS</small>
              <h2>Pemberitahuan</h2>
            </div>
            <Toggle
              label="Email ringkasan mingguan"
              value={email}
              setValue={setEmail}
            />
            <Toggle
              label="Video selesai diproses"
              value={processing}
              setValue={setProcessing}
            />
            <Toggle
              label="Export selesai atau gagal"
              value={publishing}
              setValue={setPublishing}
            />
          </section>
          <section id="settings-integrations" className="settings-panel">
            <div>
              <small>PRODUCTION ENGINE</small>
              <h2>Status mesin produksi</h2>
            </div>
            <div className="integration-list">
              {[
                ["database", "Database D1"],
                ["storage", "Media Storage R2"],
                ["transcription", "Whisper Transcription"],
                ["momentDetection", "KLIYU Moment Detection"],
                ["mp4Export", "FFmpeg MP4 Export"],
              ].map(([key, label]) => (
                <div key={key}>
                  <span>
                    <b>{label}</b>
                    <small>
                      {capabilities[key]
                        ? "Siap digunakan"
                        : "Perlu dikonfigurasi"}
                    </small>
                  </span>
                  <em className={capabilities[key] ? "connected" : "missing"}>
                    {capabilities[key] ? "CONNECTED" : "NOT CONNECTED"}
                  </em>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function UploadModal({
  processing,
  progress,
  error,
  onClose,
  onStart,
  inputRef,
}: {
  processing: boolean;
  progress: number;
  error: string;
  onClose: () => void;
  onStart: (source?: File | string, projectName?: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const [sourceMode, setSourceMode] = useState<"file" | "link">("file");
  const [videoLink, setVideoLink] = useState("");
  const [linkError, setLinkError] = useState("");
  const [projectName, setProjectName] = useState("");
  const steps = [
    sourceMode === "link" ? "Mengimpor link video" : "Mengunggah video",
    "Mengekstrak audio",
    "Membuat transkrip",
    "Mendeteksi momen terbaik",
  ];
  const activeStep = Math.min(Math.floor(progress / 26), 3);

  function submitLink() {
    const value = videoLink.trim();
    try {
      const parsed = new URL(value);
      if (!/^https?:$/.test(parsed.protocol)) throw new Error();
      setLinkError("");
      onStart(value, projectName);
    } catch {
      setLinkError(
        "Masukkan link video yang valid, diawali http:// atau https://",
      );
    }
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        className="upload-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Buat project video baru"
      >
        <button
          className="close-button"
          aria-label="Tutup New Project"
          onClick={onClose}
          disabled={processing}
        >
          <X />
        </button>
        {!processing ? (
          <>
            <span className="modal-kicker">NEW PROJECT</span>
            <h2>
              Video panjang masuk.
              <br />
              <em>Klip terbaik keluar.</em>
            </h2>
            <p>
              Pilih video asli dari perangkat atau tempel link video yang dapat
              diakses publik.
            </p>
            {error && <div className="upload-error-banner">{error}</div>}
            <label className="project-name-field">
              Project Name
              <input
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
                placeholder="Contoh: Kajian — Pentingnya Shalat"
              />
            </label>
            <div
              className="source-tabs"
              role="tablist"
              aria-label="Pilih sumber video"
            >
              <button
                role="tab"
                aria-selected={sourceMode === "file"}
                className={sourceMode === "file" ? "active" : ""}
                onClick={() => {
                  setSourceMode("file");
                  setLinkError("");
                }}
              >
                <FileVideo2 /> Video asli
              </button>
              <button
                role="tab"
                aria-selected={sourceMode === "link"}
                className={sourceMode === "link" ? "active" : ""}
                onClick={() => setSourceMode("link")}
              >
                <Link2 /> Link video
              </button>
            </div>
            {sourceMode === "file" ? (
              <>
                <button
                  className="modal-drop"
                  onClick={() => inputRef.current?.click()}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    const file = event.dataTransfer.files[0];
                    if (file) onStart(file, projectName);
                  }}
                >
                  <span>
                    <UploadCloud />
                  </span>
                  <strong>Pilih atau drop video asli</strong>
                  <small>MP4 atau MOV · hingga 512 MB dengan AI lokal</small>
                </button>
                <input
                  ref={inputRef}
                  type="file"
                  accept="video/mp4,video/quicktime"
                  hidden
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) onStart(file, projectName);
                  }}
                />
              </>
            ) : (
              <div className="link-source-panel">
                <label htmlFor="new-project-video-link">
                  Link video YouTube, TikTok, Instagram, atau file langsung
                </label>
                <div
                  className={`video-link-input ${linkError ? "invalid" : ""}`}
                >
                  <Link2 />
                  <input
                    id="new-project-video-link"
                    value={videoLink}
                    onChange={(event) => {
                      setVideoLink(event.target.value);
                      setLinkError("");
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") submitLink();
                    }}
                    placeholder="https://www.youtube.com/watch?v=..."
                    inputMode="url"
                    autoFocus
                  />
                  <button onClick={submitLink} disabled={!videoLink.trim()}>
                    Proses <ArrowRight />
                  </button>
                </div>
                {linkError ? (
                  <small className="link-error">{linkError}</small>
                ) : (
                  <small>
                    Mendukung video publik. Gunakan hanya video milik Anda atau
                    yang Anda punya izin untuk diproses.
                  </small>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            <span className="modal-kicker live">● ANALYZING VIDEO</span>
            <h2>
              Menemukan momen
              <br />
              <em>terbaik Anda.</em>
            </h2>
            <div
              className="processing-ring"
              style={
                { "--progress": `${progress * 3.6}deg` } as React.CSSProperties
              }
            >
              <div>
                <strong>{progress}%</strong>
                <span>ANALYZING</span>
              </div>
            </div>
            <div className="processing-steps">
              {steps.map((step, index) => (
                <div
                  key={step}
                  className={
                    index < activeStep
                      ? "done"
                      : index === activeStep
                        ? "active"
                        : ""
                  }
                >
                  <span>{index < activeStep ? <Check /> : index + 1}</span>
                  <b>{step}</b>
                  {index === activeStep && <i />}
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function ClipEditor({
  clip,
  onClose,
  onSave: persistClip,
  onNotice,
}: {
  clip: Clip;
  onClose: () => void;
  onSave: (clip: Clip) => void;
  onNotice: (message: string) => void;
}) {
  const [title, setTitle] = useState(clip.title);
  const [hookText, setHookText] = useState(clip.hook);
  const [subtitle, setSubtitle] = useState(clip.captionsEnabled ?? true);
  const [tracking, setTracking] = useState(clip.faceTracking ?? true);
  const [hook, setHook] = useState(clip.hookOverlay ?? true);
  const [style, setStyle] = useState(
    clip.style ? clip.style[0].toUpperCase() + clip.style.slice(1) : "Bold",
  );
  const [playing, setPlaying] = useState(false);
  const [ratio, setRatio] = useState(clip.aspectRatio || "9:16");
  const [fontSize, setFontSize] = useState(clip.fontSize || 48);
  const [fontFamily, setFontFamily] = useState(clip.fontFamily || "system");
  const [fontColor, setFontColor] = useState(clip.fontColor || "#FFFFFF");
  const [fontEffect, setFontEffect] = useState(clip.fontEffect || "outline");
  const [titleEffect, setTitleEffect] = useState(
    clip.titleEffect || "background",
  );
  const [titleAnimation, setTitleAnimation] = useState(
    clip.titleAnimation || "fade",
  );
  const [titlePosition, setTitlePosition] = useState(
    clip.titlePosition || "top",
  );
  const [captionPosition, setCaptionPosition] = useState(
    clip.captionPosition || "bottom",
  );
  const [smartCleanup, setSmartCleanup] = useState(clip.smartCleanup ?? true);
  const [watermark, setWatermark] = useState(clip.watermark ?? true);
  const [logoName, setLogoName] = useState(clip.logoName || "");
  const studioVideoRef = useRef<HTMLVideoElement>(null);
  const [startTime, setStartTime] = useState(clip.startTime ?? 0);
  const [endTime, setEndTime] = useState(clip.endTime ?? clip.duration);
  const [videoDuration, setVideoDuration] = useState(
    Math.max(clip.endTime ?? clip.duration, clip.duration),
  );
  const [subtitleRows, setSubtitleRows] = useState(
    (clip.subtitles || []).map((item) => ({ ...item })),
  );
  const [postCaption, setPostCaption] = useState(clip.postCaption || ""),
    [postCta, setPostCta] = useState(clip.postCta || ""),
    [postHashtags, setPostHashtags] = useState<string[]>(
      clip.postHashtags || [],
    ),
    [captionBusy, setCaptionBusy] = useState(false);
  const [currentSubtitle, setCurrentSubtitle] = useState(
    subtitleRows.find(
      (item) => item.start <= startTime && item.end >= startTime,
    )?.text || "",
  );
  const builtInPresets = [
    {
      name: "Viral Pop",
      fontFamily: "rounded",
      fontColor: "#FFE066",
      fontEffect: "outline",
      titleEffect: "background",
      titleAnimation: "pop",
      style: "Karaoke",
    },
    {
      name: "Clean Pro",
      fontFamily: "system",
      fontColor: "#FFFFFF",
      fontEffect: "shadow",
      titleEffect: "none",
      titleAnimation: "fade",
      style: "Clean",
    },
    {
      name: "Neon Creator",
      fontFamily: "condensed",
      fontColor: "#69E8FF",
      fontEffect: "glow",
      titleEffect: "glow",
      titleAnimation: "slide",
      style: "Bold",
    },
  ];
  function applyPreset(preset: (typeof builtInPresets)[number]) {
    setFontFamily(preset.fontFamily);
    setFontColor(preset.fontColor);
    setFontEffect(preset.fontEffect);
    setTitleEffect(preset.titleEffect);
    setTitleAnimation(preset.titleAnimation);
    setStyle(preset.style);
    onNotice(`Preset ${preset.name} diterapkan`);
  }
  const fontStacks: Record<string, string> = {
    system: "system-ui, sans-serif",
    rounded: "'Avenir Next', sans-serif",
    condensed: "'Avenir Next Condensed', sans-serif",
    serif: "Georgia, serif",
    mono: "Menlo, monospace",
  };
  const effectStyle = (effect: string): React.CSSProperties => ({
    textShadow:
      effect === "shadow"
        ? "0 4px 6px rgba(0,0,0,.95)"
        : effect === "outline"
          ? "-2px -2px 0 #000,2px -2px 0 #000,-2px 2px 0 #000,2px 2px 0 #000"
          : effect === "glow"
            ? `0 0 8px ${fontColor},0 0 18px ${fontColor}`
            : "none",
    background: effect === "background" ? "rgba(0,0,0,.72)" : "transparent",
  });
  const textStyle: React.CSSProperties = {
    fontFamily: fontStacks[fontFamily],
    color: fontColor,
    ...effectStyle(fontEffect),
  };
  const titleTextStyle: React.CSSProperties = {
    fontFamily: fontStacks[fontFamily],
    color: fontColor,
    ...effectStyle(titleEffect),
  };
  const onSave = (updated: Clip) =>
    persistClip({ ...updated, captionsEnabled: subtitle });
  async function uploadLogo(file?: File) {
    if (!file) return;
    setLogoName(file.name);
    if (typeof clip.id !== "string") return;
    try {
      const response = await fetch(`/api/clips/${clip.id}/logo`, {
        method: "PUT",
        headers: {
          "content-type": file.type,
          "content-length": String(file.size),
        },
        body: file,
      });
      if (!response.ok)
        throw new Error((await response.json()).error || "Upload logo gagal");
      onNotice("Logo brand berhasil diunggah");
    } catch (error) {
      setLogoName("");
      onNotice(error instanceof Error ? error.message : "Upload logo gagal");
    }
  }
  async function generateCaption() {
    if (typeof clip.id !== "string") {
      onNotice("Buka clip hasil analisis untuk membuat caption");
      return;
    }
    setCaptionBusy(true);
    try {
      const response = await fetch(`/api/clips/${clip.id}/caption`, {
        method: "POST",
      });
      if (!response.ok)
        throw new Error(
          (await response.json()).error || "Caption gagal dibuat",
        );
      const result = (await response.json()) as {
        hook: string;
        caption: string;
        cta: string;
        hashtags: string[];
      };
      setPostCaption(`${result.hook}\n\n${result.caption}`);
      setPostCta(result.cta);
      setPostHashtags(result.hashtags);
      onNotice("AI Caption berhasil dibuat");
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "Caption gagal dibuat");
    } finally {
      setCaptionBusy(false);
    }
  }
  async function copyCaption() {
    const value = [postCaption, postCta, postHashtags.join(" ")]
      .filter(Boolean)
      .join("\n\n");
    if (!value) {
      onNotice("Generate caption terlebih dahulu");
      return;
    }
    await navigator.clipboard.writeText(value);
    onNotice("Caption siap ditempel ke platform");
  }
  function toggleStudioPlayback() {
    const video = studioVideoRef.current;
    if (!video) return;
    if (video.paused) {
      if (video.currentTime < startTime || video.currentTime >= endTime)
        video.currentTime = startTime;
      void video.play();
      setPlaying(true);
    } else {
      video.pause();
      setPlaying(false);
    }
  }
  function updateStudioPlayback() {
    const video = studioVideoRef.current;
    if (!video) return;
    setCurrentSubtitle(
      subtitleRows.find(
        (item) =>
          item.start <= video.currentTime && item.end >= video.currentTime,
      )?.text || "",
    );
    if (video.currentTime >= endTime) {
      video.pause();
      video.currentTime = startTime;
      setPlaying(false);
    }
  }
  return (
    <div className="modal-backdrop editor-backdrop">
      <section className="editor-modal" role="dialog" aria-modal="true">
        <header>
          <div>
            <span>
              KLIYU STUDIO · CLIP #{String(clip.id).slice(-2).padStart(2, "0")}
            </span>
            <h2>Quick Short-Form Editor</h2>
          </div>
          <button aria-label="Tutup editor" onClick={onClose}>
            <X />
          </button>
        </header>
        <div className="editor-layout">
          <div className="editor-preview">
            <div className={`phone-preview ratio-${ratio.replace(":", "-")}`}>
              <video
                ref={studioVideoRef}
                className="studio-source-video"
                src={`/api/clips/${clip.id}/media?source=1`}
                playsInline
                preload="metadata"
                onLoadedMetadata={() => {
                  if (studioVideoRef.current) {
                    setVideoDuration(
                      studioVideoRef.current.duration || endTime,
                    );
                    studioVideoRef.current.currentTime = startTime;
                  }
                }}
                onTimeUpdate={updateStudioPlayback}
              />
              {hook && (
                <span
                  className={`hook-overlay title-${titlePosition} title-anim-${titleAnimation} font-effect-${titleEffect}`}
                  style={titleTextStyle}
                >
                  {hookText}
                </span>
              )}
              {subtitle && currentSubtitle && (
                <div
                  className={`editor-subtitle caption-${captionPosition} ${style.toLowerCase()} font-effect-${fontEffect}`}
                  style={{
                    ...textStyle,
                    fontSize: `${Math.round(fontSize / 3)}px`,
                  }}
                >
                  {currentSubtitle}
                </div>
              )}
              {watermark && <span className="studio-watermark">KLIYU.</span>}
              {logoName && (
                <span className="studio-logo">{logoName.slice(0, 12)}</span>
              )}
              <button
                aria-label={playing ? "Pause preview" : "Play preview"}
                onClick={toggleStudioPlayback}
              >
                {playing ? <Pause /> : <Play />}
              </button>
            </div>
            <div className="timeline">
              <span>{Math.round(startTime)}s</span>
              <div>
                <span className="waveform" aria-hidden="true">
                  {Array.from({ length: 32 }, (_, index) => (
                    <i
                      key={index}
                      style={{ height: `${25 + ((index * 37) % 70)}%` }}
                    />
                  ))}
                </span>
                <b
                  style={{
                    left: `${(startTime / Math.max(1, videoDuration)) * 100}%`,
                    right: `${100 - (endTime / Math.max(1, videoDuration)) * 100}%`,
                  }}
                />
                <input
                  aria-label="Waktu mulai"
                  type="range"
                  min="0"
                  max={videoDuration}
                  step="0.1"
                  value={startTime}
                  onChange={(event) => {
                    const value = Math.min(
                      Number(event.target.value),
                      endTime - 0.5,
                    );
                    setStartTime(value);
                    if (studioVideoRef.current)
                      studioVideoRef.current.currentTime = value;
                  }}
                />
                <input
                  aria-label="Waktu selesai"
                  type="range"
                  min="0"
                  max={videoDuration}
                  step="0.1"
                  value={endTime}
                  onChange={(event) =>
                    setEndTime(
                      Math.max(Number(event.target.value), startTime + 0.5),
                    )
                  }
                />
              </div>
              <span>{Math.round(endTime)}s</span>
            </div>
          </div>
          <div className="editor-controls">
            <label>
              Judul clip
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </label>
            <label>
              Hook overlay
              <textarea
                value={hookText}
                onChange={(event) => setHookText(event.target.value)}
              />
            </label>
            <label>
              Efek teks judul / hook
              <div className="font-effect-options title-effect-options">
                {[
                  ["none", "None"],
                  ["shadow", "Shadow"],
                  ["outline", "Outline"],
                  ["background", "Box"],
                  ["glow", "Glow"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    className={titleEffect === value ? "active" : ""}
                    onClick={() => setTitleEffect(value)}
                  >
                    <i className={`effect-sample ${value}`}>Tt</i>
                    {label}
                  </button>
                ))}
              </div>
            </label>
            <div className="advanced-grid">
              <label>
                Animasi judul
                <select
                  value={titleAnimation}
                  onChange={(event) => setTitleAnimation(event.target.value)}
                >
                  <option value="none">Tanpa animasi</option>
                  <option value="fade">Fade in</option>
                  <option value="slide">Slide down</option>
                  <option value="pop">Pop</option>
                </select>
              </label>
              <label>
                Posisi judul
                <select
                  value={titlePosition}
                  onChange={(event) => setTitlePosition(event.target.value)}
                >
                  <option value="top">Atas</option>
                  <option value="center">Tengah</option>
                  <option value="bottom">Bawah</option>
                </select>
              </label>
            </div>
            <label>
              Preset visual
              <div className="preset-options">
                {builtInPresets.map((preset) => (
                  <button key={preset.name} onClick={() => applyPreset(preset)}>
                    {preset.name}
                  </button>
                ))}
              </div>
            </label>
            <div className="time-fields">
              <label>
                Start
                <input
                  type="number"
                  min="0"
                  max={Math.max(0, endTime - 0.1)}
                  step="0.1"
                  value={startTime}
                  onChange={(event) =>
                    setStartTime(
                      Math.max(
                        0,
                        Math.min(Number(event.target.value), endTime - 0.1),
                      ),
                    )
                  }
                />
              </label>
              <label>
                End
                <input
                  type="number"
                  min={startTime + 0.1}
                  step="0.1"
                  value={endTime}
                  onChange={(event) =>
                    setEndTime(
                      Math.max(startTime + 0.1, Number(event.target.value)),
                    )
                  }
                />
              </label>
            </div>
            <label>
              Format video
              <div className="style-options">
                {["9:16", "1:1", "16:9"].map((name) => (
                  <button
                    key={name}
                    className={ratio === name ? "active" : ""}
                    onClick={() => setRatio(name)}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </label>
            <label>
              Ukuran subtitle <b>{fontSize}px</b>
              <input
                type="range"
                min="24"
                max="80"
                value={fontSize}
                onChange={(event) => setFontSize(Number(event.target.value))}
              />
            </label>
            <div className="typography-controls">
              <label>
                Jenis font
                <select
                  value={fontFamily}
                  onChange={(event) => setFontFamily(event.target.value)}
                >
                  <option value="system">Modern</option>
                  <option value="rounded">Rounded</option>
                  <option value="condensed">Condensed</option>
                  <option value="serif">Editorial Serif</option>
                  <option value="mono">Creator Mono</option>
                </select>
              </label>
              <label>
                Warna font
                <span className="color-picker-field">
                  <input
                    type="color"
                    value={fontColor}
                    onChange={(event) => setFontColor(event.target.value)}
                    aria-label="Pilih warna font"
                  />
                  <b>{fontColor.toUpperCase()}</b>
                </span>
              </label>
            </div>
            <label>
              Efek font
              <div className="font-effect-options">
                {[
                  ["none", "None"],
                  ["shadow", "Shadow"],
                  ["outline", "Outline"],
                  ["background", "Box"],
                  ["glow", "Glow"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    className={fontEffect === value ? "active" : ""}
                    onClick={() => setFontEffect(value)}
                  >
                    <i className={`effect-sample ${value}`}>Aa</i>
                    {label}
                  </button>
                ))}
              </div>
            </label>
            <label>
              Posisi subtitle
              <div className="style-options">
                {[
                  ["top", "Atas"],
                  ["center", "Tengah"],
                  ["bottom", "Bawah"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    className={captionPosition === value ? "active" : ""}
                    onClick={() => setCaptionPosition(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </label>
            <div className="color-presets" aria-label="Preset warna font">
              {["#FFFFFF", "#C9FF45", "#FFE066", "#69E8FF", "#FF6B9B"].map(
                (color) => (
                  <button
                    key={color}
                    aria-label={`Gunakan warna ${color}`}
                    className={
                      fontColor.toUpperCase() === color ? "active" : ""
                    }
                    style={{ background: color }}
                    onClick={() => setFontColor(color)}
                  />
                ),
              )}
            </div>
            <label className="logo-upload">
              Logo brand
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => uploadLogo(event.target.files?.[0])}
              />
              <span>{logoName || "Pilih PNG, JPG, atau WebP"}</span>
            </label>
            <div className="toggle-list">
              <Toggle
                label="Automatic captions"
                value={subtitle}
                setValue={setSubtitle}
              />
              <Toggle
                label="Face tracking"
                value={tracking}
                setValue={setTracking}
              />
              <Toggle
                label="Smart cleanup"
                value={smartCleanup}
                setValue={setSmartCleanup}
              />
              <Toggle label="Hook overlay" value={hook} setValue={setHook} />
              <Toggle
                label="KLIYU watermark"
                value={watermark}
                setValue={setWatermark}
              />
            </div>
            <label>
              Caption style
              <div className="style-options">
                {["Clean", "Bold", "Karaoke"].map((name) => (
                  <button
                    key={name}
                    className={style === name ? "active" : ""}
                    onClick={() => setStyle(name)}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </label>
            <section className="subtitle-editor">
              <div>
                <span>SUBTITLE EDITOR</span>
                <button
                  onClick={() =>
                    setSubtitleRows((rows) => [
                      ...rows,
                      {
                        start: startTime,
                        end: Math.min(endTime, startTime + 2.5),
                        text: "Subtitle baru",
                      },
                    ])
                  }
                >
                  <Plus /> Tambah
                </button>
              </div>
              {subtitleRows
                .filter((row) => row.end >= startTime && row.start <= endTime)
                .map((row, index) => {
                  const sourceIndex = subtitleRows.indexOf(row);
                  return (
                    <div
                      className="subtitle-row"
                      key={`${sourceIndex}-${row.start}`}
                    >
                      <input
                        type="number"
                        step="0.1"
                        value={row.start}
                        aria-label={`Mulai subtitle ${index + 1}`}
                        onChange={(event) =>
                          setSubtitleRows((rows) =>
                            rows.map((item, i) =>
                              i === sourceIndex
                                ? { ...item, start: Number(event.target.value) }
                                : item,
                            ),
                          )
                        }
                      />
                      <input
                        type="number"
                        step="0.1"
                        value={row.end}
                        aria-label={`Selesai subtitle ${index + 1}`}
                        onChange={(event) =>
                          setSubtitleRows((rows) =>
                            rows.map((item, i) =>
                              i === sourceIndex
                                ? { ...item, end: Number(event.target.value) }
                                : item,
                            ),
                          )
                        }
                      />
                      <textarea
                        value={row.text}
                        aria-label={`Teks subtitle ${index + 1}`}
                        onChange={(event) =>
                          setSubtitleRows((rows) =>
                            rows.map((item, i) =>
                              i === sourceIndex
                                ? { ...item, text: event.target.value }
                                : item,
                            ),
                          )
                        }
                      />
                      <button
                        aria-label={`Hapus subtitle ${index + 1}`}
                        onClick={() =>
                          setSubtitleRows((rows) =>
                            rows.filter((_, i) => i !== sourceIndex),
                          )
                        }
                      >
                        <X />
                      </button>
                    </div>
                  );
                })}
            </section>
            <section className="ai-caption-box">
              <div>
                <span>AI CAPTION</span>
                <button onClick={generateCaption} disabled={captionBusy}>
                  <Sparkles />{" "}
                  {captionBusy ? "Generating..." : "Generate Caption"}
                </button>
              </div>
              {postCaption ? (
                <>
                  <p>{postCaption}</p>
                  <p>{postCta}</p>
                  <b>{postHashtags.join(" ")}</b>
                  <button onClick={copyCaption}>
                    <Copy /> Copy Caption
                  </button>
                </>
              ) : (
                <small>
                  Generate hook, caption, CTA, dan hashtag dari isi clip.
                </small>
              )}
            </section>
            <div className="editor-actions">
              <button onClick={onClose}>Cancel</button>
              <button
                className="primary"
                disabled={
                  !title.trim() || !hookText.trim() || endTime <= startTime
                }
                onClick={() =>
                  onSave({
                    ...clip,
                    title: title.trim(),
                    hook: hookText.trim(),
                    startTime,
                    endTime,
                    duration: Math.max(1, Math.round(endTime - startTime)),
                    style: style.toLowerCase(),
                    faceTracking: tracking,
                    hookOverlay: hook,
                    aspectRatio: ratio,
                    fontSize,
                    fontFamily,
                    fontColor,
                    fontEffect,
                    titleEffect,
                    titleAnimation,
                    titlePosition,
                    captionPosition,
                    smartCleanup,
                    watermark,
                    logoName,
                    postCaption,
                    postCta,
                    postHashtags,
                    subtitles: subtitleRows,
                  })
                }
              >
                Save changes
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function HelpModal({
  onClose,
  onNewProject,
}: {
  onClose: () => void;
  onNewProject: () => void;
}) {
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        className="utility-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Pusat bantuan"
      >
        <button
          className="close-button"
          aria-label="Tutup bantuan"
          onClick={onClose}
        >
          <X />
        </button>
        <span className="modal-kicker">KLIYU HELP</span>
        <h2>Mulai dalam tiga langkah.</h2>
        <div className="help-steps">
          <div>
            <b>1</b>
            <span>
              <strong>Masukkan video</strong>
              <small>
                Upload MP4/MOV atau gunakan link file MP4/WebM publik.
              </small>
            </span>
          </div>
          <div>
            <b>2</b>
            <span>
              <strong>Pilih momen terbaik</strong>
              <small>
                Kliyu AI membuat transkrip dan memberi Viral Score pada setiap
                momen.
              </small>
            </span>
          </div>
          <div>
            <b>3</b>
            <span>
              <strong>Edit dan export</strong>
              <small>
                Atur trim, rasio, caption, logo, lalu render menjadi MP4.
              </small>
            </span>
          </div>
        </div>
        <div className="utility-actions">
          <button onClick={onClose}>Tutup</button>
          <button className="primary" onClick={onNewProject}>
            <Plus /> New project
          </button>
        </div>
      </section>
    </div>
  );
}

function NotificationsModal({
  items,
  onClose,
  onReadAll,
}: {
  items: Notice[];
  onClose: () => void;
  onReadAll: () => void;
}) {
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        className="utility-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Notifikasi"
      >
        <button
          className="close-button"
          aria-label="Tutup notifikasi"
          onClick={onClose}
        >
          <X />
        </button>
        <span className="modal-kicker">NOTIFICATIONS</span>
        <h2>Aktivitas terbaru</h2>
        {items.length ? (
          <div className="notice-list">
            {items.map((item) => (
              <article key={item.id} className={item.read ? "" : "unread"}>
                <span>
                  <Bell />
                </span>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.message}</p>
                  <small>
                    {new Date(item.created_at).toLocaleString("id-ID")}
                  </small>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="utility-empty">
            <CheckCircle2 />
            <strong>Semua beres</strong>
            <span>Belum ada notifikasi baru.</span>
          </div>
        )}
        <div className="utility-actions">
          <button onClick={onClose}>Tutup</button>
          {items.some((item) => !item.read) && (
            <button className="primary" onClick={onReadAll}>
              <Check /> Tandai sudah dibaca
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

function Toggle({
  label,
  value,
  setValue,
}: {
  label: string;
  value: boolean;
  setValue: (v: boolean) => void;
}) {
  return (
    <button className="toggle-row" onClick={() => setValue(!value)}>
      <span>{label}</span>
      <i className={value ? "on" : ""}>
        <b />
      </i>
    </button>
  );
}
