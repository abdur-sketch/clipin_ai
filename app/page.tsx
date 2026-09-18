"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  analyzeVideoInBrowser,
  browserAiReadiness,
  detectMomentsInBrowser,
  generateSocialCaptionInBrowser,
  translateRowsInBrowser,
  prepareBrowserAi,
  type AnalysisPreferences,
  type BrowserAnalysis,
} from "@/lib/browser-ai";
import {
  createThumbnailInBrowser,
  createThumbnailVariantsInBrowser,
  renderVideoInBrowser,
} from "@/lib/browser-media";
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
  RefreshCw,
  Search,
  Send,
  Settings,
  Share2,
  Sparkles,
  TrendingUp,
  Trash2,
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
  projectId?: string;
  hasSourceMedia?: boolean;
  sourceType?: string;
  score: number;
  duration: number;
  title: string;
  hook: string;
  caption: string;
  reason?: string;
  category?: string;
  status: "ready" | "rendering" | "rendered";
  accent: string;
  startTime?: number;
  endTime?: number;
  sourceUrl?: string;
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
  transcriptCut?: boolean;
  audioPreset?: string;
  noiseReduction?: boolean;
  autoLevel?: boolean;
  speakerColors?: boolean;
  reframeMode?: string;
  cropFocusX?: number;
  transition?: string;
  captionAnimation?: string;
  audioGain?: number;
  exportResolution?: string;
  exportFps?: number;
  exportBitrate?: number;
  musicName?: string;
  musicVolume?: number;
  audioDucking?: boolean;
  renderError?: string;
  brollName?: string;
  brollStart?: number;
  watermark?: boolean;
  captionsEnabled?: boolean;
  logoName?: string;
  postCaption?: string;
  postCta?: string;
  postHashtags?: string[];
  subtitles?: {
    start: number;
    end: number;
    text: string;
    speaker?: string;
    removed?: boolean;
    words?: { start: number; end: number; word: string }[];
  }[];
};

function youtubeVideoId(value?: string) {
  if (!value) return "";
  try {
    const url = new URL(value);
    if (url.hostname === "youtu.be") return url.pathname.slice(1).split("/")[0];
    if (url.hostname.endsWith("youtube.com")) {
      if (url.pathname.startsWith("/shorts/"))
        return url.pathname.split("/")[2] || "";
      return url.searchParams.get("v") || "";
    }
  } catch {
    return "";
  }
  return "";
}

function scoreBreakdown(clip: Clip) {
  const base = Math.max(45, Math.min(98, clip.score));
  const words = `${clip.title} ${clip.hook}`.trim().split(/\s+/).length;
  return [
    { label: "Hook", value: Math.min(99, base + (words <= 18 ? 4 : -2)) },
    { label: "Insight", value: Math.min(98, base + (clip.reason ? 2 : -5)) },
    { label: "Clarity", value: Math.min(97, base + (clip.title.length < 72 ? 3 : -3)) },
    { label: "Retention", value: Math.min(99, base + (clip.duration <= 45 ? 2 : -2)) },
  ];
}

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
  error?: string | null;
  target_duration?: number;
  content_style?: string;
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
  const [commandOpen,setCommandOpen]=useState(false);
  const [commandQuery,setCommandQuery]=useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(()=>{
    const handler=(event:KeyboardEvent)=>{
      if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==="k"){event.preventDefault();setCommandOpen((value)=>!value)}
      if(event.key==="Escape")setCommandOpen(false);
    };
    window.addEventListener("keydown",handler);return()=>window.removeEventListener("keydown",handler);
  },[]);

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
    if ("serviceWorker" in navigator)
      navigator.serviceWorker.register("/sw.js").catch(() => {});
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
      const sourceUrl = detail.project.source_url
        ? String(detail.project.source_url)
        : undefined;
      setProjectTitle(String(detail.project.title || "My Clips"));
      setClipItems(
        detail.clips.map((item, index) => ({
          id: String(item.id),
          projectId: String(item.project_id || projectId),
          hasSourceMedia: Boolean(detail.project.storage_key),
          sourceType: String(detail.project.source_type || "upload"),
          score: Number(item.score),
          duration: Math.max(
            1,
            Math.round(Number(item.end_time) - Number(item.start_time)),
          ),
          title: String(item.title),
          hook: String(item.hook),
          caption: String(item.caption),
          reason: String(item.reason || ""),
          category: String(item.category || "insight"),
          status: String(item.status) as Clip["status"],
          accent: accents[index % accents.length],
          startTime: Number(item.start_time),
          endTime: Number(item.end_time),
          sourceUrl,
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
          transcriptCut: Boolean(item.transcript_cut),
          audioPreset: String(item.audio_preset || "podcast"),
          noiseReduction:
            item.noise_reduction === undefined
              ? true
              : Boolean(item.noise_reduction),
          autoLevel:
            item.auto_level === undefined ? true : Boolean(item.auto_level),
          speakerColors: Boolean(item.speaker_colors),
          reframeMode: String(item.reframe_mode || "auto"),
          cropFocusX: Number(item.crop_focus_x ?? 0.5),
          transition: String(item.transition || "fade"),
          captionAnimation: String(item.caption_animation || "pop"),
          audioGain: Number(item.audio_gain ?? 1),
          exportResolution: String(item.export_resolution || "1080p"),
          exportFps: Number(item.export_fps || 30),
          exportBitrate: Number(item.export_bitrate || 5),
          musicName: item.music_key
            ? String(item.music_key).split("/").pop()
            : undefined,
          musicVolume: Number(item.music_volume ?? 0.18),
          audioDucking:
            item.audio_ducking === undefined ? true : Boolean(item.audio_ducking),
          renderError: item.render_error ? String(item.render_error) : undefined,
          brollName: item.broll_key
            ? String(item.broll_key).split("/").pop()
            : undefined,
          brollStart: Number(item.broll_start || 2),
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

  async function retryProject(project: ProjectSummary) {
    setToast(`Browser AI memproses ulang “${project.title}”…`);
    setProcessing(true);
    setProgress(12);
    try {
      const browserAnalysis = await analyzeProjectInBrowser(project.id);
      const response = await fetch(`/api/projects/${project.id}/process`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ browserAnalysis }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) throw new Error(result.error || "Pemrosesan ulang gagal");
      await loadProjects();
      setProgress(100);
      setToast("Analisis Browser AI selesai. Klip berhasil dibuat.");
      await openProject(project.id);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Pemrosesan ulang gagal");
    } finally {
      setProcessing(false);
    }
  }

  async function analyzeProjectInBrowser(
    projectId: string,
    originalFile?: File,
    requestedPreferences?: AnalysisPreferences,
  ): Promise<BrowserAnalysis> {
    const detailResponse = await fetch(`/api/projects/${projectId}`);
    if (!detailResponse.ok) throw new Error("Project tidak dapat dibaca");
    const detail = (await detailResponse.json()) as {
      project: {
        source_type?: string;
        filename?: string;
        content_type?: string;
        target_duration?: number;
        content_style?: AnalysisPreferences["contentStyle"];
      };
    };
    const preferences: AnalysisPreferences = requestedPreferences || {
      targetDuration: ([15, 30, 60].includes(Number(detail.project.target_duration))
        ? Number(detail.project.target_duration)
        : 30) as 15 | 30 | 60,
      contentStyle: detail.project.content_style || "viral",
    };
    if (originalFile)
      return analyzeVideoInBrowser(
        originalFile,
        (value) => setProgress(value),
        preferences,
      );
    if (detail.project.source_type === "youtube") {
      setProgress(34);
      const captionResponse = await fetch(`/api/projects/${projectId}/captions`);
      const captions = (await captionResponse.json()) as {
        transcript?: string;
        segments?: BrowserAnalysis["segments"];
        provider?: BrowserAnalysis["provider"];
        error?: string;
      };
      if (!captionResponse.ok || !captions.transcript || !captions.segments)
        throw new Error(captions.error || "Caption YouTube tidak tersedia");
      const moments = await detectMomentsInBrowser(
        captions.transcript,
        captions.segments,
        (value) => setProgress(value),
        preferences,
      );
      return {
        transcript: captions.transcript,
        segments: captions.segments,
        moments,
        provider: "source-captions",
      };
    }
    if (
      detail.project.source_type &&
      detail.project.source_type !== "upload"
    ) {
      setProgress(18);
      const imported = await fetch(`/api/projects/${projectId}/import`, {
        method: "POST",
      });
      if (!imported.ok) {
        const result = (await imported.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(result.error || "Video dari link cloud gagal diimpor");
      }
      setProgress(28);
    }
    setProgress(32);
    const mediaResponse = await fetch(`/api/projects/${projectId}/media`);
    if (!mediaResponse.ok)
      throw new Error(
        "Video asli tidak ditemukan. Buat project baru dan pilih file video kembali.",
      );
    const blob = await mediaResponse.blob();
    const file = new File([blob], detail.project.filename || "video.mp4", {
      type: detail.project.content_type || blob.type || "video/mp4",
    });
    return analyzeVideoInBrowser(
      file,
      (value) => setProgress(value),
      preferences,
    );
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

  async function uploadResumable(projectId: string, file: File) {
    const started = await fetch(`/api/projects/${projectId}/resumable`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ filename: file.name, contentType: file.type || "video/mp4", size: file.size }),
    });
    if (!started.ok) throw new Error((await started.json()).error || "Sesi upload gagal dibuat");
    const { sessionId, chunkSize } = await started.json() as { sessionId:string; chunkSize:number };
    const parts: Array<{partNumber:number;etag:string}> = [];
    try {
      for (let offset=0, partNumber=1; offset<file.size; offset+=chunkSize, partNumber++) {
        const response = await fetch(`/api/projects/${projectId}/resumable?sessionId=${encodeURIComponent(sessionId)}&partNumber=${partNumber}`, { method:"PUT", headers:{"content-type":"application/octet-stream"}, body:file.slice(offset,Math.min(file.size,offset+chunkSize)) });
        if(!response.ok) throw new Error((await response.json()).error || `Upload bagian ${partNumber} gagal`);
        parts.push(await response.json());
        setProgress(22 + Math.round(Math.min(file.size,offset+chunkSize)/file.size*28));
      }
      const completed=await fetch(`/api/projects/${projectId}/resumable`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"complete",sessionId,parts})});
      if(!completed.ok) throw new Error((await completed.json()).error || "Upload gagal diselesaikan");
    } catch(error) {
      await fetch(`/api/projects/${projectId}/resumable?sessionId=${encodeURIComponent(sessionId)}`,{method:"DELETE"}).catch(()=>{});
      throw error;
    }
  }

  async function startUpload(
    source?: File | string,
    projectName?: string,
    preferences: AnalysisPreferences = {},
    deferNavigation = false,
  ) {
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
          targetDuration: preferences.targetDuration || 30,
          contentStyle: preferences.contentStyle || "viral",
        }),
      });
      if (!created.ok)
        throw new Error(
          (await created.json()).error || "Gagal membuat project",
        );
      const { project } = (await created.json()) as { project: { id: string } };
      setProgress(22);
      if (file) {
        if (file.size > 12 * 1024 * 1024) await uploadResumable(project.id, file);
        else {
          const uploaded = await fetch(`/api/projects/${project.id}/upload`, {
            method: "PUT", headers: { "content-type": file.type || "video/mp4" }, body: file,
          });
          if (!uploaded.ok) throw new Error((await uploaded.json()).error || "Upload gagal");
        }
        setProgress(52);
      }
      const browserAnalysis = await analyzeProjectInBrowser(
        project.id,
        file,
        preferences,
      );
      const processed = await fetch(`/api/projects/${project.id}/process`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ browserAnalysis }),
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
        const sourceUrl = detail.project.source_url
          ? String(detail.project.source_url)
          : undefined;
        setProjectTitle(String(detail.project.title || title));
        setClipItems(
          detail.clips.map((item, index) => ({
            id: String(item.id),
            projectId: String(item.project_id || project.id),
            hasSourceMedia: Boolean(detail.project.storage_key),
            sourceType: String(detail.project.source_type || "upload"),
            score: Number(item.score),
            duration: Math.max(
              1,
              Math.round(Number(item.end_time) - Number(item.start_time)),
            ),
            title: String(item.title),
            hook: String(item.hook),
            caption: String(item.caption),
            reason: String(item.reason || ""),
            category: String(item.category || "insight"),
            status: String(item.status) as Clip["status"],
            accent: accents[index % accents.length],
            startTime: Number(item.start_time),
            endTime: Number(item.end_time),
            sourceUrl,
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
            transcriptCut: Boolean(item.transcript_cut),
            audioPreset: String(item.audio_preset || "podcast"),
            noiseReduction:
              item.noise_reduction === undefined
                ? true
                : Boolean(item.noise_reduction),
            autoLevel:
              item.auto_level === undefined ? true : Boolean(item.auto_level),
            speakerColors: Boolean(item.speaker_colors),
            reframeMode: String(item.reframe_mode || "auto"),
            cropFocusX: Number(item.crop_focus_x ?? 0.5),
            transition: String(item.transition || "fade"),
            captionAnimation: String(item.caption_animation || "pop"),
            audioGain: Number(item.audio_gain ?? 1),
            exportResolution: String(item.export_resolution || "1080p"),
            exportFps: Number(item.export_fps || 30),
            exportBitrate: Number(item.export_bitrate || 5),
            musicName: item.music_key
              ? String(item.music_key).split("/").pop()
              : undefined,
            musicVolume: Number(item.music_volume ?? 0.18),
            audioDucking:
              item.audio_ducking === undefined
                ? true
                : Boolean(item.audio_ducking),
            renderError: item.render_error
              ? String(item.render_error)
              : undefined,
            brollName: item.broll_key
              ? String(item.broll_key).split("/").pop()
              : undefined,
            brollStart: Number(item.broll_start || 2),
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
      if (deferNavigation) return;
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
      if (deferNavigation) throw error;
    }
  }
  async function startBatchUpload(files: File[],preferences: AnalysisPreferences){
    setProcessing(true);setUploadError("");
    try{
      for(let index=0;index<files.length;index++){
        setToast(`Memproses video ${index+1} dari ${files.length}`);
        await startUpload(files[index],files[index].name.replace(/\.[^.]+$/, ""),preferences,true);
      }
      await loadProjects();setProcessing(false);setUploadOpen(false);setView("projects");setToast(`${files.length} project berhasil dibuat`);
    }catch{setProcessing(false)}
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
    setClipItems((items) =>
      items.map((item) =>
        item.id === clip.id ? { ...item, status: "rendering" } : item,
      ),
    );
    try {
      if (typeof clip.id === "string") {
        if (youtubeVideoId(clip.sourceUrl) && !clip.hasSourceMedia)
          throw new Error(
            "Untuk export video YouTube, unggah file video asli agar browser dapat mengakses frame dan audio.",
          );
        const blob = await renderVideoInBrowser(
          {
            ...clip,
            id: clip.id,
            startTime: clip.startTime || 0,
            endTime: clip.endTime || clip.duration,
          },
          (value) =>
            setRenderProgress((items) => ({ ...items, [renderId]: value })),
          controller.signal,
        );
        const response = await fetch(`/api/clips/${clip.id}/render`, {
          method: "PUT",
          headers: {
            "content-type": blob.type || "video/webm",
            "content-length": String(blob.size),
          },
          body: blob,
          signal: controller.signal,
        });
        if (!response.ok)
          throw new Error((await response.json()).error || "Render gagal");
      } else await new Promise((resolve) => window.setTimeout(resolve, 450));
      setClipItems((items) =>
        items.map((item) =>
          item.id === clip.id
            ? { ...item, status: "rendered", renderError: undefined }
            : item,
        ),
      );
      setToast(
        `CLIP #${String(clip.id).slice(-2).padStart(2, "0")} selesai dirender`,
      );
      setRenderProgress((items) => ({ ...items, [renderId]: 100 }));
    } catch (error) {
      const message =
        error instanceof DOMException && error.name === "AbortError"
          ? "Render dibatalkan"
          : error instanceof Error
            ? error.message
            : "Render gagal";
      setClipItems((items) =>
        items.map((item) =>
          item.id === clip.id
            ? { ...item, status: "ready", renderError: message }
            : item,
        ),
      );
      setToast(message);
    } finally {
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
    setToast(`${pending.length} klip masuk antrean batch render (2 sekaligus)`);
    for (let index = 0; index < pending.length; index += 2)
      await Promise.all(pending.slice(index, index + 2).map(renderClip));
  }
  function exportClip(clip: Clip) {
    if (typeof clip.id !== "string" || clip.status !== "rendered") {
      setToast("Render klip terlebih dahulu sebelum mengunduh video");
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
            transcriptCut: updated.transcriptCut ?? false,
            audioPreset: updated.audioPreset ?? "podcast",
            noiseReduction: updated.noiseReduction ?? true,
            autoLevel: updated.autoLevel ?? true,
            speakerColors: updated.speakerColors ?? false,
            reframeMode: updated.reframeMode ?? "auto",
            cropFocusX: updated.cropFocusX ?? 0.5,
            transition: updated.transition ?? "fade",
            captionAnimation: updated.captionAnimation ?? "pop",
            audioGain: updated.audioGain ?? 1,
            exportResolution: updated.exportResolution ?? "1080p",
            exportFps: updated.exportFps ?? 30,
            exportBitrate: updated.exportBitrate ?? 5,
            musicVolume: updated.musicVolume ?? 0.18,
            audioDucking: updated.audioDucking ?? true,
            brollStart: updated.brollStart ?? 2,
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
            <button className="command-trigger" onClick={()=>setCommandOpen(true)}><Search/> Cari <kbd>⌘K</kbd></button>
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
            onChanged={loadProjects}
            onNotice={setToast}
            onRetry={retryProject}
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
          onBatchStart={startBatchUpload}
          inputRef={inputRef}
        />
      )}
      {commandOpen && (
        <CommandPalette
          query={commandQuery}
          setQuery={setCommandQuery}
          onClose={() => setCommandOpen(false)}
          commands={[
            { label: "Buat project baru", hint: "Upload atau link", action: () => setUploadOpen(true) },
            { label: "Buka semua project", hint: "Library", action: () => go("projects") },
            { label: "Buka AI Clips", hint: `${clipItems.length} klip`, action: () => go("clips") },
            { label: "Buka Studio", hint: "Edit klip terbaik", action: () => clipItems[0] ? setEditor(clipItems[0]) : setToast("Belum ada klip") },
            { label: "Lihat Analytics", hint: "Performa konten", action: () => go("analytics") },
            { label: "Pengaturan workspace", hint: "Backup, storage, akses", action: () => go("settings") },
          ]}
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
      <section className="launchpad">
        <div><span className="modal-kicker">CREATOR LAUNCHPAD</span><h2>{projects.length&&clips.length?"Workspace siap berkembang":"Selesaikan setup pertama Anda"}</h2><p>{[projects.length>0,clips.length>0,business.published>0].filter(Boolean).length} dari 3 tahap selesai</p></div>
        <div className="launchpad-steps">
          <button className={projects.length?"done":""} onClick={onUpload}><i>{projects.length?<Check/>:"1"}</i><span><b>Masukkan video</b><small>Upload satu atau batch</small></span></button>
          <button className={clips.length?"done":""} onClick={onClips}><i>{clips.length?<Check/>:"2"}</i><span><b>Pilih klip terbaik</b><small>Review skor dan duplikat</small></span></button>
          <button className={business.published?"done":""} onClick={onClips}><i>{business.published?<Check/>:"3"}</i><span><b>Render & publikasikan</b><small>Siapkan file final</small></span></button>
        </div>
      </section>
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
        <small>MP4, MOV · Browser AI tanpa API key</small>
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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [hiddenDuplicateIds,setHiddenDuplicateIds]=useState<string[]>([]);
  const hotCount = items.filter((clip) => clip.score >= 85).length;
  const renderedCount = items.filter(
    (clip) => clip.status === "rendered",
  ).length;
  const readyCount = items.filter((clip) => clip.status === "ready").length;
  const topScore = Math.max(0, ...items.map((clip) => clip.score));
  const selectedClips = items.filter((clip) =>
    selectedIds.includes(String(clip.id)),
  );
  const duplicatePairs=useMemo(()=>{
    const words=(value:string)=>new Set(value.toLowerCase().replace(/[^a-z0-9\s]/g," ").split(/\s+/).filter((word)=>word.length>2));
    const pairs:Array<{a:Clip;b:Clip;similarity:number}>=[];
    for(let a=0;a<items.length;a++)for(let b=a+1;b<items.length;b++){
      const left=words(`${items[a].title} ${items[a].hook}`),right=words(`${items[b].title} ${items[b].hook}`);
      const intersection=[...left].filter((word)=>right.has(word)).length,union=new Set([...left,...right]).size;
      const similarity=union?intersection/union:0;
      if(similarity>=.55)pairs.push({a:items[a],b:items[b],similarity});
    }
    return pairs.sort((x,y)=>y.similarity-x.similarity);
  },[items]);
  const visibleFiltered=filtered.filter((clip)=>!hiddenDuplicateIds.includes(String(clip.id)));
  function toggleSelected(clip: Clip) {
    const id = String(clip.id);
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }
  async function renderSelected() {
    const pending = selectedClips.filter((clip) => clip.status !== "rendered");
    if (!pending.length)
      return onNotice("Pilih klip yang belum dirender terlebih dahulu");
    onNotice(`${pending.length} klip terpilih masuk antrean render`);
    for (let index = 0; index < pending.length; index += 2)
      await Promise.all(pending.slice(index, index + 2).map(onRender));
  }
  function exportSelected() {
    const ready = selectedClips.filter(
      (clip) => clip.status === "rendered" && typeof clip.id === "string",
    );
    if (!ready.length)
      return onNotice("Belum ada klip terpilih yang siap diekspor");
    ready.forEach((clip, index) => {
      window.setTimeout(() => {
        const anchor = document.createElement("a");
        anchor.href = `/api/clips/${clip.id}/download`;
        anchor.download = "";
        anchor.click();
      }, index * 180);
    });
    onNotice(`${ready.length} video terpilih mulai diunduh`);
  }
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
      {(renderingIds.length > 0 || items.some((clip) => clip.renderError)) && (
        <section className="render-queue-panel">
          <div>
            <span>RENDER QUEUE</span>
            <b>{renderingIds.length ? `${renderingIds.length} sedang diproses` : "Perlu perhatian"}</b>
          </div>
          {items
            .filter((clip) => renderingIds.includes(String(clip.id)) || clip.renderError)
            .map((clip) => (
              <div className="queue-row" key={clip.id}>
                <span className={clip.renderError ? "failed" : "running"} />
                <div>
                  <b>{clip.title}</b>
                  <small>
                    {clip.renderError || `${renderProgress[String(clip.id)] || 0}% · render browser berjalan`}
                  </small>
                </div>
                {clip.renderError ? (
                  <button onClick={() => onRender(clip)}>
                    <RefreshCw /> Retry
                  </button>
                ) : (
                  <button onClick={() => onCancelRender(clip)}>
                    <X /> Batalkan
                  </button>
                )}
              </div>
            ))}
        </section>
      )}
      {duplicatePairs.length>0&&<section className="duplicate-panel"><div><Copy/><span><b>{duplicatePairs.length} kemiripan terdeteksi</b><small>KLIYU membandingkan judul dan hook agar feed tidak berulang.</small></span></div><button onClick={()=>{setHiddenDuplicateIds(duplicatePairs.map(({a,b})=>String(a.score>=b.score?b.id:a.id)));onNotice("Klip duplikat dengan skor lebih rendah disembunyikan")}}>Tampilkan versi terbaik</button></section>}
      {selectedIds.length > 0 && (
        <div className="batch-action-bar" role="toolbar" aria-label="Aksi klip terpilih">
          <div>
            <CheckCircle2 />
            <b>{selectedIds.length} klip dipilih</b>
            <button onClick={() => setSelectedIds([])}>Hapus pilihan</button>
          </div>
          <div>
            <button onClick={renderSelected} disabled={renderingIds.length > 0}>
              <Sparkles /> Render selected
            </button>
            <button onClick={exportSelected}>
              <Download /> Export selected
            </button>
          </div>
        </div>
      )}
      {visibleFiltered.length ? (
        <div className="clips-grid">
          {visibleFiltered.map((clip) => (
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
              selected={selectedIds.includes(String(clip.id))}
              onSelect={() => toggleSelected(clip)}
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
  selected,
  onSelect,
}: {
  clip: Clip;
  onEdit: () => void;
  onPreview: () => void;
  onRender: () => void;
  onExport: () => void;
  rendering: boolean;
  progress: number;
  onCancel: () => void;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <article className={`clip-card ${selected ? "selected" : ""}`}>
      <div className={`clip-preview ${clip.accent}`}>
        <button
          className="clip-select"
          aria-label={`${selected ? "Batalkan pilihan" : "Pilih"} ${clip.title}`}
          aria-pressed={selected}
          onClick={onSelect}
        >
          {selected ? <Check /> : <Plus />}
        </button>
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
            <b>{progress}% · proses render</b>
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
                <Download /> Export video
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
  const [failed, setFailed] = useState(false);
  const youtubeId = youtubeVideoId(clip.sourceUrl);
  if (youtubeId && !clip.hasSourceMedia)
    return (
      <div
        className="clip-card-video"
        role="img"
        aria-label={`Thumbnail ${clip.title}`}
        style={{
          backgroundImage: `url(https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg)`,
          backgroundPosition: "center",
          backgroundSize: "cover",
        }}
      />
    );
  const source =
    clip.status === "rendered"
      ? `/api/clips/${clip.id}/media`
      : `/api/clips/${clip.id}/media?source=1`;
  return failed ? (
    <div className="clip-media-missing">
      <FileVideo2 />
      <span>Video sumber perlu dipasang</span>
    </div>
  ) : (
    <video
      ref={ref}
      className="clip-card-video"
      src={source}
      muted
      playsInline
      preload="metadata"
      onError={() => setFailed(true)}
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
  const [mediaFailed, setMediaFailed] = useState(false);
  const rendered = clip.status === "rendered";
  const breakdown = scoreBreakdown(clip);
  const youtubeId = youtubeVideoId(clip.sourceUrl);
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
          {youtubeId && !clip.hasSourceMedia && !rendered ? (
            <iframe
              className={`real-clip-video ratio-${(clip.aspectRatio || "9:16").replace(":", "-")}`}
              src={`https://www.youtube-nocookie.com/embed/${youtubeId}?start=${Math.floor(clip.startTime || 0)}&end=${Math.ceil(clip.endTime || 0)}&rel=0`}
              title={`Preview ${clip.title}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <video
              ref={videoRef}
              className={`real-clip-video ratio-${(clip.aspectRatio || "9:16").replace(":", "-")}`}
              src={`/api/clips/${clip.id}/media`}
              controls
              playsInline
              preload="metadata"
              onError={() => setMediaFailed(true)}
              onLoadedMetadata={positionPreview}
              onTimeUpdate={stopAtClipEnd}
            >
              Browser Anda tidak mendukung pemutar video.
            </video>
          )}
          {mediaFailed && (
            <div className="preview-media-error" role="alert">
              <FileVideo2 />
              <b>Video sumber tidak ditemukan</b>
              <small>
                Buka Studio lalu pilih video asli untuk mengaktifkan preview dan
                render.
              </small>
            </div>
          )}
        </div>
        <div className="preview-details">
          <span className="modal-kicker">
            {rendered ? "FINAL CLIP PREVIEW" : "SOURCE CLIP PREVIEW"}
          </span>
          <h2>{clip.title}</h2>
          <p>{clip.caption}</p>
          {clip.reason && (
            <p className="preview-note">
              <strong>Mengapa dipilih:</strong> {clip.reason}
            </p>
          )}
          <div className="score-breakdown">
            <div>
              <span>VIRAL SCORE BREAKDOWN</span>
              <b>Kenapa klip ini kuat</b>
            </div>
            {breakdown.map((item) => (
              <div key={item.label}>
                <span>{item.label}</span>
                <i><b style={{ width: `${item.value}%` }} /></i>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
          {!rendered && (
            <p className="preview-note">
              Ini masih video sumber, belum hasil final. Buka Studio Lengkap
              untuk mengatur font, efek, subtitle, audio, B-roll, dan thumbnail;
              kemudian Render.
            </p>
          )}
          {!rendered && (
            <div className="preview-feature-list" aria-label="Fitur Studio">
              <span>Font & efek</span>
              <span>Cut transkrip</span>
              <span>Audio AI</span>
              <span>B-roll</span>
              <span>Translate</span>
              <span>Thumbnail</span>
            </div>
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
              <Pencil /> Buka Studio
            </button>
            {rendered ? (
              <a className="primary" href={`/api/clips/${clip.id}/download`}>
                <Download /> Export video
              </a>
            ) : (
              <button className="primary" onClick={onEdit}>
                <WandSparkles /> Studio Lengkap
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
  onChanged,
  onNotice,
  onRetry,
}: {
  projects: ProjectSummary[];
  onOpen: (id: string) => void;
  onUpload: () => void;
  onChanged: () => Promise<void>;
  onNotice: (message: string) => void;
  onRetry: (project: ProjectSummary) => Promise<void>;
}) {
  const [searchQuery,setSearchQuery]=useState("");
  const [searchResults,setSearchResults]=useState<Array<{project_id:string;project_title:string;clip_id?:string;title:string;hook:string;score:number;kind:string}>>([]);
  const [searching,setSearching]=useState(false);
  const [collection,setCollection]=useState<"all"|"complete"|"attention"|"recent">("all");
  const failedProjects = projects.filter((project) => project.status === "failed");
  const emptyProjects = projects.filter(
    (project) => project.status === "complete" && !project.clip_count,
  );
  const processingProjects = projects.filter(
    (project) => project.status === "processing" || project.status === "draft",
  );
  const healthScore = projects.length
    ? Math.max(
        0,
        Math.round(
          100 -
            ((failedProjects.length * 2 + emptyProjects.length + processingProjects.length * 0.5) /
              projects.length) *
              35,
        ),
      )
    : 100;
  const displayedProjects=useMemo(()=>{
    const selected=collection==="complete"?projects.filter((project)=>project.status==="complete"&&Boolean(project.clip_count)):collection==="attention"?projects.filter((project)=>project.status==="failed"||!project.clip_count):[...projects];
    return collection==="recent"?selected.sort((a,b)=>Number(b.updated_at||0)-Number(a.updated_at||0)).slice(0,5):selected;
  },[collection,projects]);
  async function renameProject(project: ProjectSummary) {
    const title = window.prompt("Nama project baru", project.title)?.trim();
    if (!title || title === project.title) return;
    const response = await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title }),
    });
    if (!response.ok)
      return onNotice((await response.json()).error || "Rename gagal");
    await onChanged();
    onNotice("Nama project diperbarui");
  }
  async function duplicateProject(project: ProjectSummary) {
    const response = await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ duplicate: true }),
    });
    if (!response.ok)
      return onNotice((await response.json()).error || "Duplikasi gagal");
    await onChanged();
    onNotice("Project berhasil diduplikasi");
  }
  async function deleteProject(project: ProjectSummary) {
    if (
      !window.confirm(`Hapus project “${project.title}” beserta semua klipnya?`)
    )
      return;
    const response = await fetch(`/api/projects/${project.id}`, {
      method: "DELETE",
    });
    if (!response.ok)
      return onNotice((await response.json()).error || "Hapus gagal");
    await onChanged();
    onNotice("Project berhasil dihapus");
  }
  useEffect(()=>{
    if(searchQuery.trim().length<2)return;
    const timer=window.setTimeout(async()=>{setSearching(true);try{const response=await fetch(`/api/search?q=${encodeURIComponent(searchQuery.trim())}`);const data=await response.json();setSearchResults(data.results||[])}finally{setSearching(false)}},280);
    return()=>window.clearTimeout(timer);
  },[searchQuery]);
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
      <section className="semantic-search">
        <label><Search/><input value={searchQuery} onChange={(e)=>setSearchQuery(e.target.value)} placeholder="Cari judul, hook, caption, atau isi transkrip…"/><span>{searching?"Mencari…":"AI SEARCH"}</span></label>
        {searchQuery.trim().length>=2&&searchResults.length>0&&<div>{searchResults.map((result,index)=><button key={`${result.kind}-${result.clip_id||result.project_id}-${index}`} onClick={()=>onOpen(result.project_id)}><span><b>{result.title}</b><small>{result.project_title} · {result.kind==="transcript"?"Transkrip":"Klip"}</small></span>{result.score>0&&<strong>{result.score}</strong>}</button>)}</div>}
      </section>
      <div className="smart-collections" aria-label="Koleksi pintar"><span>SMART COLLECTIONS</span>{([['all','Semua',projects.length],['complete','Siap pakai',projects.filter((p)=>p.status==='complete'&&p.clip_count).length],['attention','Perlu perhatian',failedProjects.length+emptyProjects.length],['recent','Terbaru',Math.min(5,projects.length)]] as const).map(([id,label,count])=><button key={id} className={collection===id?'active':''} onClick={()=>setCollection(id)}>{label} <b>{count}</b></button>)}</div>
      <section className={`project-health-center ${healthScore >= 90 ? "healthy" : "attention"}`}>
        <div className="health-score">
          <strong>{healthScore}</strong>
          <span>PROJECT HEALTH</span>
        </div>
        <div>
          <span className="modal-kicker">WORKSPACE DIAGNOSTICS</span>
          <h2>{healthScore >= 90 ? "Semua sistem sehat" : "Ada project yang perlu diperbaiki"}</h2>
          <p>
            {failedProjects.length} gagal · {emptyProjects.length} tanpa klip · {processingProjects.length} belum selesai
          </p>
        </div>
        <div className="health-actions">
          {failedProjects[0] && (
            <button onClick={() => void onRetry(failedProjects[0])}>
              <RefreshCw /> Perbaiki project gagal
            </button>
          )}
          {emptyProjects[0] && (
            <button onClick={() => void onRetry(emptyProjects[0])}>
              <WandSparkles /> Analisis ulang project kosong
            </button>
          )}
          {!failedProjects.length && !emptyProjects.length && (
            <span><CheckCircle2 /> Tidak ada masalah kritis</span>
          )}
        </div>
      </section>
      {projects.length ? (
        <div className="table-card">
          <div className="table-row table-head">
            <span>PROJECT</span>
            <span>STATUS</span>
            <span>CLIPS</span>
            <span>PROGRESS</span>
            <span />
          </div>
          {displayedProjects.map((project, index) => (
            <div
              className="table-row"
              key={project.id}
              onClick={() => onOpen(project.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => event.key === "Enter" && onOpen(project.id)}
            >
              <span className="project-cell">
                <i className={`table-thumb thumb-${(index % 3) + 1}`} />
                <span>
                  <strong>{project.title}</strong>
                  <small>
                    {project.status === "failed" && project.error
                      ? project.error
                      : `${Math.round(project.duration || 0)} sec · Indonesian`}
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
              <span
                className="project-row-actions"
                onClick={(event) => event.stopPropagation()}
              >
                {(project.status !== "complete" || !project.clip_count) && (
                  <button
                    aria-label="Proses ulang project"
                    title="Proses ulang"
                    onClick={() => void onRetry(project)}
                  >
                    <RefreshCw />
                  </button>
                )}
                <button
                  aria-label="Rename project"
                  onClick={() => renameProject(project)}
                >
                  <Pencil />
                </button>
                <button
                  aria-label="Duplicate project"
                  onClick={() => duplicateProject(project)}
                >
                  <Copy />
                </button>
                <button
                  className="danger"
                  aria-label="Delete project"
                  onClick={() => deleteProject(project)}
                >
                  <Trash2 />
                </button>
              </span>
            </div>
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
    [retentionDays, setRetentionDays] = useState(30),
    [highContrast, setHighContrast] = useState(false),
    [reducedMotion, setReducedMotion] = useState(false),
    [automaticBackup, setAutomaticBackup] = useState(true),
    [saving, setSaving] = useState(false);
  const [active, setActive] = useState("account");
  const [capabilities, setCapabilities] = useState<Record<string, boolean>>({});
  const [deviceAi] = useState(() => browserAiReadiness());
  const [modelProgress, setModelProgress] = useState<number | null>(null);
  const [storage, setStorage] = useState<{
    groups: Array<{ name: string; files: number; bytes: number }>;
    assets: Array<{ key:string; name:string; category:string; bytes:number; uploaded:string }>;
    totalFiles: number;
    totalBytes: number;
  }>({ groups: [], assets: [], totalFiles: 0, totalBytes: 0 });
  const [activities,setActivities]=useState<Array<{id:string;title:string;message:string;status:string;created_at:number}>>([]);
  const [backups,setBackups]=useState<Array<{id:string;created_at:number;bytes:number}>>([]);
  const [deviceStorage,setDeviceStorage]=useState<{usage:number;quota:number}>({usage:0,quota:0});
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
          retentionDays,
          highContrast,
          reducedMotion,
          automaticBackup,
        }),
      });
      if (!response.ok) throw new Error("Gagal menyimpan");
      if (automaticBackup) {
        const backupResponse = await fetch("/api/backup", { method: "POST" });
        if (backupResponse.ok) {
          const data = await fetch("/api/backup").then((item) => item.json());
          setBackups(data.backups || []);
        }
      }
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
        setRetentionDays(Number(s.retention_days || 30));
        setHighContrast(Boolean(s.high_contrast));
        setReducedMotion(Boolean(s.reduced_motion));
        setAutomaticBackup(s.automatic_backup === undefined ? true : Boolean(s.automatic_backup));
      })
      .catch(() => {});
    fetch("/api/capabilities")
      .then((r) => (r.ok ? r.json() : {}))
      .then(setCapabilities)
      .catch(() => {});
    fetch("/api/storage")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setStorage(data))
      .catch(() => {});
    fetch("/api/activity").then((r)=>r.ok?r.json():null).then((data)=>data&&setActivities(data.activities||[])).catch(()=>{});
    fetch("/api/backup").then((r)=>r.ok?r.json():null).then((data)=>data&&setBackups(data.backups||[])).catch(()=>{});
    navigator.storage?.estimate().then((estimate)=>setDeviceStorage({usage:Number(estimate.usage||0),quota:Number(estimate.quota||0)})).catch(()=>{});
  }, []);
  useEffect(()=>{
    document.documentElement.classList.toggle("high-contrast",highContrast);
    document.documentElement.classList.toggle("reduced-motion",reducedMotion);
    return ()=>{document.documentElement.classList.remove("high-contrast","reduced-motion")};
  },[highContrast,reducedMotion]);
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
            ["storage", "Storage"],
            ["privacy", "Privacy & access"],
            ["activity", "Activity"],
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
                ["firebase", "Firebase Firestore"],
                ["storage", "Media Storage R2"],
                ["transcription", "Browser AI Transcription"],
                ["momentDetection", "Browser AI Moment Detection"],
                ["mp4Export", "Browser Video Export"],
                ["cloudRender", "Cloud Render Worker"],
                ["socialPublishing", "OAuth Social Publisher"],
                ["youtubeWatch", "YouTube Channel Watch"],
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
            <div>
              <small>BROWSER DEVICE CHECK</small>
              <h2>Kesiapan AI perangkat</h2>
            </div>
            <div className="integration-list">
              {[
                ["gpu", "WebGPU acceleration"],
                ["mediaRecorder", "Browser video renderer"],
                ["languageModel", "Built-in language model"],
                ["translator", "Built-in translator"],
              ].map(([key, label]) => {
                const ready = Boolean(deviceAi[key as keyof typeof deviceAi]);
                return (
                  <div key={key}>
                    <span><b>{label}</b><small>{ready ? "Tersedia di browser ini" : "Fallback digunakan"}</small></span>
                    <em className={ready ? "connected" : "missing"}>{ready ? "READY" : "FALLBACK"}</em>
                  </div>
                );
              })}
            </div>
            <button
              className="outline-button browser-model-button"
              disabled={modelProgress !== null}
              onClick={async () => {
                setModelProgress(1);
                try {
                  await prepareBrowserAi((value) => setModelProgress(value));
                  setModelProgress(100);
                  notify("Model Browser AI siap digunakan");
                  window.setTimeout(() => setModelProgress(null), 1200);
                } catch (error) {
                  setModelProgress(null);
                  notify(error instanceof Error ? error.message : "Model Browser AI gagal disiapkan");
                }
              }}
            >
              <Download /> {modelProgress === null ? "Siapkan model sekarang" : `Menyiapkan ${modelProgress}%`}
            </button>
          </section>
          <section id="settings-storage" className="settings-panel">
            <div>
              <small>STORAGE MANAGER</small>
              <h2>Media dan hasil render</h2>
            </div>
            <div className="storage-overview">
              <strong>
                {(storage.totalBytes / 1024 / 1024).toFixed(1)} MB
              </strong>
              <span>{storage.totalFiles} file tersimpan</span>
            </div>
            {deviceStorage.quota>0&&<div className="device-capacity"><span><b>Kapasitas kerja browser</b><small>{(deviceStorage.usage/1024/1024).toFixed(0)} MB dari {(deviceStorage.quota/1024/1024/1024).toFixed(1)} GB digunakan</small></span><i><b style={{width:`${Math.min(100,deviceStorage.usage/deviceStorage.quota*100)}%`}}/></i></div>}
            <div className="storage-groups">
              {storage.groups.map((group) => (
                <div key={group.name}>
                  <span><b>{group.name}</b><small>{group.files} file</small></span>
                  <strong>{(group.bytes / 1024 / 1024).toFixed(1)} MB</strong>
                </div>
              ))}
            </div>
            <button
              className="outline-button storage-cleanup-button"
              onClick={async () => {
                if (!window.confirm("Hapus semua hasil render? Video sumber, musik, dan B-roll tetap aman.")) return;
                const response = await fetch("/api/storage", { method: "DELETE" });
                const result = await response.json();
                if (!response.ok) return notify(result.error || "Pembersihan gagal");
                const refreshed = await fetch("/api/storage").then((item) => item.json());
                setStorage(refreshed);
                notify(`${result.removed} hasil render dihapus. Video sumber tetap aman.`);
              }}
            >
              <Trash2 /> Bersihkan hasil render
            </button>
            <div className="media-library">
              <div><small>MEDIA LIBRARY</small><h2>File terbaru</h2></div>
              {storage.assets.length ? storage.assets.slice(0,8).map((asset)=>(
                <a key={asset.key} href={`/api/storage?key=${encodeURIComponent(asset.key)}`} target="_blank" rel="noreferrer">
                  <span><b>{asset.name}</b><small>{asset.category}</small></span><strong>{(asset.bytes/1024/1024).toFixed(1)} MB</strong>
                </a>
              )):<p className="settings-empty">Belum ada media tersimpan.</p>}
            </div>
          </section>
          <section id="settings-privacy" className="settings-panel">
            <div><small>PRIVACY & ACCESSIBILITY</small><h2>Kontrol data dan tampilan</h2></div>
            <div className="settings-fields">
              <label>Retensi hasil render<select value={retentionDays} onChange={(e)=>setRetentionDays(Number(e.target.value))}><option value={7}>7 hari</option><option value={30}>30 hari</option><option value={90}>90 hari</option><option value={365}>1 tahun</option></select></label>
            </div>
            <Toggle label="Kontras tinggi" value={highContrast} setValue={setHighContrast}/>
            <Toggle label="Kurangi animasi" value={reducedMotion} setValue={setReducedMotion}/>
            <Toggle label="Backup otomatis" value={automaticBackup} setValue={setAutomaticBackup}/>
            <div className="backup-actions">
              <button className="primary" onClick={async()=>{const r=await fetch("/api/backup",{method:"POST"});if(!r.ok)return notify("Backup gagal dibuat");const data=await fetch("/api/backup").then(x=>x.json());setBackups(data.backups||[]);notify("Backup workspace berhasil dibuat")}}>Buat backup sekarang</button>
              <a className="outline-button" href="/api/backup?download=1"><Download/> Unduh data saya</a>
              <button className="outline-button" onClick={async()=>{const response=await fetch("/api/storage?mode=retention",{method:"DELETE"});const result=await response.json();if(!response.ok)return notify(result.error||"Retensi gagal");const refreshed=await fetch("/api/storage").then((item)=>item.json());setStorage(refreshed);notify(`${result.removed} file melewati masa retensi dihapus`)}}><Trash2/> Jalankan retensi</button>
            </div>
            {backups[0]&&<p className="backup-note">Backup terakhir {new Date(backups[0].created_at).toLocaleString("id-ID")} · {(backups[0].bytes/1024).toFixed(1)} KB</p>}
          </section>
          <section id="settings-activity" className="settings-panel">
            <div><small>ACTIVITY CENTER</small><h2>Aktivitas dan status sistem</h2></div>
            <div className="activity-list">
              {activities.length?activities.map((item)=><article key={item.id} className={item.status}><i/><span><b>{item.title}</b><small>{item.message}</small></span><time>{new Date(item.created_at).toLocaleString("id-ID")}</time></article>):<p className="settings-empty">Aktivitas baru akan muncul setelah upload, backup, dan render.</p>}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function CommandPalette({query,setQuery,onClose,commands}:{query:string;setQuery:(value:string)=>void;onClose:()=>void;commands:Array<{label:string;hint:string;action:()=>void}>}){
  const visible=commands.filter((command)=>`${command.label} ${command.hint}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="modal-backdrop command-backdrop" onMouseDown={(event)=>event.target===event.currentTarget&&onClose()}><section className="command-palette" role="dialog" aria-modal="true" aria-label="Command palette"><label><Search/><input autoFocus value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Cari tindakan…"/><kbd>ESC</kbd></label><div>{visible.map((command)=><button key={command.label} onClick={()=>{command.action();onClose();setQuery("")}}><b>{command.label}</b><span>{command.hint}</span><kbd>↵</kbd></button>)}{!visible.length&&<p>Tindakan tidak ditemukan.</p>}</div><small>Tip: tekan ⌘K atau Ctrl+K dari halaman mana pun.</small></section></div>
}

function UploadModal({
  processing,
  progress,
  error,
  onClose,
  onStart,
  onBatchStart,
  inputRef,
}: {
  processing: boolean;
  progress: number;
  error: string;
  onClose: () => void;
  onStart: (
    source?: File | string,
    projectName?: string,
    preferences?: AnalysisPreferences,
  ) => void;
  onBatchStart: (files:File[],preferences:AnalysisPreferences)=>Promise<void>;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const [sourceMode, setSourceMode] = useState<"file" | "link">("file");
  const [videoLink, setVideoLink] = useState("");
  const [linkError, setLinkError] = useState("");
  const [projectName, setProjectName] = useState("");
  const [targetDuration, setTargetDuration] = useState<15 | 30 | 60>(30);
  const [contentStyle, setContentStyle] = useState<
    "viral" | "education" | "sales" | "story"
  >("viral");
  const steps = [
    sourceMode === "link" ? "Mengambil sumber video" : "Mengunggah video",
    "Menyiapkan model di browser",
    "Membuat transkrip privat",
    "Browser AI memilih momen",
  ];
  const activeStep = Math.min(Math.floor(progress / 26), 3);

  function submitLink() {
    const value = videoLink.trim();
    try {
      const parsed = new URL(value);
      if (!/^https?:$/.test(parsed.protocol)) throw new Error();
      const supported =
        /(^|\.)youtube\.com$/i.test(parsed.hostname) ||
        /(^|\.)youtu\.be$/i.test(parsed.hostname) ||
        /(^|\.)drive\.google\.com$/i.test(parsed.hostname) ||
        /(^|\.)dropbox\.com$/i.test(parsed.hostname) ||
        /(^|\.)storage\.googleapis\.com$/i.test(parsed.hostname) ||
        /(^|\.)firebasestorage\.googleapis\.com$/i.test(parsed.hostname) ||
        /\.(mp4|mov|webm|m4v)$/i.test(parsed.pathname);
      if (!supported) {
        setLinkError(
          "Gunakan YouTube, Google Drive, Dropbox, Firebase Storage, R2, atau link MP4/WebM langsung.",
        );
        return;
      }
      setLinkError("");
      onStart(value, projectName, { targetDuration, contentStyle });
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
              AI berjalan langsung di browser. Pilih video asli, YouTube
              bercaption, atau link file dari penyimpanan cloud.
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
            <div className="new-project-options">
              <label>
                Target durasi klip
                <select
                  value={targetDuration}
                  onChange={(event) =>
                    setTargetDuration(Number(event.target.value) as 15 | 30 | 60)
                  }
                >
                  <option value={15}>15 detik</option>
                  <option value={30}>30 detik</option>
                  <option value={60}>60 detik</option>
                </select>
              </label>
              <label>
                Tujuan konten
                <select
                  value={contentStyle}
                  onChange={(event) =>
                    setContentStyle(event.target.value as typeof contentStyle)
                  }
                >
                  <option value="viral">Viral / engagement</option>
                  <option value="education">Edukasi</option>
                  <option value="sales">Penjualan</option>
                  <option value="story">Storytelling</option>
                </select>
              </label>
            </div>
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
                    const files = Array.from(event.dataTransfer.files).filter((file)=>file.type.startsWith("video/"));
                    if (files.length>1) void onBatchStart(files,{targetDuration,contentStyle});
                    else if (files[0])
                      onStart(files[0], projectName, {
                        targetDuration,
                        contentStyle,
                      });
                  }}
                >
                  <span>
                    <UploadCloud />
                  </span>
                  <strong>Pilih satu atau beberapa video</strong>
                  <small>Batch MP4/MOV · setiap file menjadi satu project</small>
                </button>
                <input
                  ref={inputRef}
                  type="file"
                  accept="video/mp4,video/quicktime"
                  multiple
                  hidden
                  onChange={(event) => {
                    const files = Array.from(event.target.files||[]);
                    if(files.length>1) void onBatchStart(files,{targetDuration,contentStyle});
                    else if (files[0])
                      onStart(files[0], projectName, {
                        targetDuration,
                        contentStyle,
                      });
                  }}
                />
              </>
            ) : (
              <div className="link-source-panel">
                <label htmlFor="new-project-video-link">
                  Link video atau penyimpanan cloud
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
                    placeholder="YouTube, Google Drive, Dropbox, atau https://.../video.mp4"
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
                    Drive dan Dropbox harus dapat diakses oleh siapa saja yang
                    memiliki link. Gunakan hanya video yang boleh Anda proses.
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
  const youtubeId = youtubeVideoId(clip.sourceUrl);
  const [title, setTitle] = useState(clip.title);
  const [hookText, setHookText] = useState(clip.hook);
  const [subtitle, setSubtitle] = useState(clip.captionsEnabled ?? true);
  const [tracking, setTracking] = useState(clip.faceTracking ?? true);
  const [hook, setHook] = useState(clip.hookOverlay ?? true);
  const [style, setStyle] = useState(
    clip.style ? clip.style[0].toUpperCase() + clip.style.slice(1) : "Bold",
  );
  const [playing, setPlaying] = useState(false);
  const [studioTime, setStudioTime] = useState(clip.startTime ?? 0);
  const [safeArea, setSafeArea] = useState(true);
  const [timelineZoom, setTimelineZoom] = useState(1);
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
  const [transcriptCut, setTranscriptCut] = useState(
    clip.transcriptCut ?? false,
  );
  const [audioPreset, setAudioPreset] = useState(clip.audioPreset || "podcast");
  const [noiseReduction, setNoiseReduction] = useState(
    clip.noiseReduction ?? true,
  );
  const [autoLevel, setAutoLevel] = useState(clip.autoLevel ?? true);
  const [speakerColors, setSpeakerColors] = useState(
    clip.speakerColors ?? false,
  );
  const [reframeMode, setReframeMode] = useState(clip.reframeMode || "auto");
  const [cropFocusX, setCropFocusX] = useState(clip.cropFocusX ?? 0.5);
  const [transition, setTransition] = useState(clip.transition || "fade");
  const [captionAnimation, setCaptionAnimation] = useState(
    clip.captionAnimation || "pop",
  );
  const [audioGain, setAudioGain] = useState(clip.audioGain ?? 1);
  const [exportResolution, setExportResolution] = useState(
    clip.exportResolution || "1080p",
  );
  const [exportFps, setExportFps] = useState(clip.exportFps || 30);
  const [exportBitrate, setExportBitrate] = useState(clip.exportBitrate || 5);
  const [musicName, setMusicName] = useState(clip.musicName || "");
  const [musicVolume, setMusicVolume] = useState(clip.musicVolume ?? 0.18);
  const [audioDucking, setAudioDucking] = useState(clip.audioDucking ?? true);
  const [watermark, setWatermark] = useState(clip.watermark ?? true);
  const [logoName, setLogoName] = useState(clip.logoName || "");
  const [brollName, setBrollName] = useState(clip.brollName || "");
  const [brollStart, setBrollStart] = useState(clip.brollStart ?? 2);
  const [brollSuggestion, setBrollSuggestion] = useState("");
  const [thumbnailBusy, setThumbnailBusy] = useState(false);
  const [translationLanguage, setTranslationLanguage] = useState("en");
  const [translationBusy, setTranslationBusy] = useState(false);
  const [sourceAttached, setSourceAttached] = useState(
    clip.hasSourceMedia ?? false,
  );
  const [mediaState, setMediaState] = useState<
    "loading" | "ready" | "missing"
  >(youtubeId && !clip.hasSourceMedia ? "ready" : "loading");
  const [mediaVersion, setMediaVersion] = useState(0);
  const [sourceUploadBusy, setSourceUploadBusy] = useState(false);
  const [cloudDraftReady, setCloudDraftReady] = useState(false);
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
  const [hookVariants, setHookVariants] = useState<string[]>([]);
  const [templateName, setTemplateName] = useState("");
  const [savedTemplates, setSavedTemplates] = useState<
    Array<{ name: string; settings: Record<string, unknown> }>
  >([]);
  const [brandVoice, setBrandVoice] = useState({
    tone: "Berani, ringkas, dan edukatif",
    audience: "Kreator dan pemilik bisnis Indonesia",
    cta: "Simpan dan bagikan video ini",
    bannedWords: "",
    customTerms: "",
  });
  const [sceneMarkers, setSceneMarkers] = useState<number[]>([]);
  const [brollSuggestions, setBrollSuggestions] = useState<
    Array<{ keyword: string; time: number }>
  >([]);
  const [repurposeItems, setRepurposeItems] = useState<
    Array<{ format: string; content: string }>
  >([]);
  const [thumbnailScores, setThumbnailScores] = useState<number[]>([]);
  const [qualityIssues, setQualityIssues] = useState<
    Array<{ label: string; fix: string; ok: boolean }>
  >([]);
  const [versions, setVersions] = useState<
    Array<{ id: string; label: string; created_at: number }>
  >([]);
  const [reviews, setReviews] = useState<
    Array<{ id: string; author: string; message: string; timestamp: number; status: string; created_at: number }>
  >([]);
  const [reviewMessage, setReviewMessage] = useState("");
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
    {
      name: "Documentary",
      fontFamily: "serif",
      fontColor: "#FFFFFF",
      fontEffect: "shadow",
      titleEffect: "background",
      titleAnimation: "fade",
      style: "Clean",
    },
    {
      name: "Gaming Punch",
      fontFamily: "condensed",
      fontColor: "#C9FF45",
      fontEffect: "outline",
      titleEffect: "glow",
      titleAnimation: "pop",
      style: "Karaoke",
    },
    {
      name: "Newsroom",
      fontFamily: "system",
      fontColor: "#FFFFFF",
      fontEffect: "background",
      titleEffect: "background",
      titleAnimation: "slide",
      style: "Bold",
    },
  ];
  const platformPresets = [
    {
      name: "TikTok",
      detail: "9:16 · punchy",
      ratio: "9:16",
      captionPosition: "bottom",
      titlePosition: "top",
      fontSize: 48,
      style: "Karaoke",
    },
    {
      name: "Instagram Reels",
      detail: "9:16 · clean",
      ratio: "9:16",
      captionPosition: "center",
      titlePosition: "top",
      fontSize: 46,
      style: "Bold",
    },
    {
      name: "YouTube Shorts",
      detail: "9:16 · safe UI",
      ratio: "9:16",
      captionPosition: "bottom",
      titlePosition: "top",
      fontSize: 44,
      style: "Bold",
    },
    {
      name: "Square Feed",
      detail: "1:1 · compact",
      ratio: "1:1",
      captionPosition: "bottom",
      titlePosition: "top",
      fontSize: 40,
      style: "Clean",
    },
  ];
  const activeSubtitle = subtitleRows.find(
    (item) =>
      !item.removed && item.start <= studioTime && item.end >= studioTime,
  );
  const activeWordIndex =
    activeSubtitle?.words?.findIndex(
      (word) => word.start <= studioTime && word.end >= studioTime,
    ) ?? -1;
  const activeSpeakerColor = speakerColors
    ? ["#C9FF45", "#69E8FF", "#FFE066", "#FF6B9B"][
        [...(activeSubtitle?.speaker || "Speaker 1")].reduce(
          (total, char) => total + char.charCodeAt(0),
          0,
        ) % 4
      ]
    : fontColor;
  const renderChecks = [
    {
      label: "Video sumber tersedia",
      ready: sourceAttached || (!youtubeId && mediaState === "ready"),
    },
    {
      label: "Durasi klip valid (1–90 detik)",
      ready: endTime > startTime && endTime - startTime <= 90,
    },
    {
      label: "Judul dan hook terisi",
      ready: Boolean(title.trim() && hookText.trim()),
    },
    {
      label: "Subtitle siap",
      ready:
        !subtitle ||
        subtitleRows.some(
          (row) =>
            !row.removed &&
            row.text.trim() &&
            row.end >= startTime &&
            row.start <= endTime,
        ),
    },
    {
      label: "Format platform dipilih",
      ready: Boolean(ratio && captionPosition),
    },
    {
      label: "Audio sudah dioptimalkan",
      ready: Boolean(audioPreset && autoLevel),
    },
  ];
  const readinessScore = Math.round(
    (renderChecks.filter((item) => item.ready).length / renderChecks.length) *
      100,
  );
  const historyRef = useRef<string[]>([]),
    futureRef = useRef<string[]>([]),
    restoringRef = useRef(false);
  const studioSnapshot = JSON.stringify({
    title,
    hookText,
    subtitle,
    tracking,
    hook,
    style,
    ratio,
    fontSize,
    fontFamily,
    fontColor,
    fontEffect,
    titleEffect,
    titleAnimation,
    titlePosition,
    captionPosition,
    smartCleanup,
    transcriptCut,
    audioPreset,
    noiseReduction,
    autoLevel,
    speakerColors,
    reframeMode,
    cropFocusX,
    transition,
    captionAnimation,
    audioGain,
    exportResolution,
    exportFps,
    exportBitrate,
    musicVolume,
    audioDucking,
    brollStart,
    watermark,
    startTime,
    endTime,
    subtitleRows,
  });
  useEffect(() => {
    if (restoringRef.current) {
      restoringRef.current = false;
      return;
    }
    const timer = window.setTimeout(() => {
      if (historyRef.current.at(-1) !== studioSnapshot)
        historyRef.current.push(studioSnapshot);
      if (historyRef.current.length > 40) historyRef.current.shift();
      futureRef.current = [];
      localStorage.setItem(`kliyu-editor-draft-${clip.id}`, studioSnapshot);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [studioSnapshot, clip.id]);
  useEffect(() => {
    let active = true;
    fetch(`/api/studio?clipId=${clip.id}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((result) => {
        if (!active) return;
        if (Array.isArray(result?.templates)) setSavedTemplates(result.templates);
        if (result?.brandVoice && Object.keys(result.brandVoice).length)
          setBrandVoice((current) => ({ ...current, ...result.brandVoice }));
        if (result?.draft) restoreStudio(JSON.stringify(result.draft));
      })
      .catch(() => {})
      .finally(() => active && setCloudDraftReady(true));
    return () => {
      active = false;
    };
  }, [clip.id]);
  useEffect(() => {
    if (!cloudDraftReady) return;
    const timer = window.setTimeout(() => {
      void fetch("/api/studio", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "draft",
          clipId: String(clip.id),
          value: JSON.parse(studioSnapshot),
        }),
      });
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [studioSnapshot, clip.id, cloudDraftReady]);
  useEffect(() => {
    if (typeof clip.id !== "string") return;
    Promise.all([
      fetch(`/api/clips/${clip.id}/versions`).then((response) =>
        response.ok ? response.json() : { versions: [] },
      ),
      fetch(`/api/clips/${clip.id}/review`).then((response) =>
        response.ok ? response.json() : { reviews: [] },
      ),
    ])
      .then(([versionData, reviewData]) => {
        setVersions(versionData.versions || []);
        setReviews(reviewData.reviews || []);
      })
      .catch(() => {});
  }, [clip.id]);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redoStudio();
        else undoStudio();
        return;
      }
      if (event.code === "Space") {
        event.preventDefault();
        toggleStudioPlayback();
      }
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        const direction = event.key === "ArrowLeft" ? -1 : 1;
        const next = Math.max(startTime, Math.min(endTime, studioTime + direction));
        setStudioTime(next);
        if (studioVideoRef.current) studioVideoRef.current.currentTime = next;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // Keyboard handlers intentionally bind to the latest timeline state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startTime, endTime, studioTime]);
  function restoreStudio(value: string) {
    const state = JSON.parse(value);
    restoringRef.current = true;
    setTitle(state.title);
    setHookText(state.hookText);
    setSubtitle(state.subtitle);
    setTracking(state.tracking);
    setHook(state.hook);
    setStyle(state.style);
    setRatio(state.ratio);
    setFontSize(state.fontSize);
    setFontFamily(state.fontFamily);
    setFontColor(state.fontColor);
    setFontEffect(state.fontEffect);
    setTitleEffect(state.titleEffect);
    setTitleAnimation(state.titleAnimation);
    setTitlePosition(state.titlePosition);
    setCaptionPosition(state.captionPosition);
    setSmartCleanup(state.smartCleanup);
    setTranscriptCut(state.transcriptCut);
    setAudioPreset(state.audioPreset);
    setNoiseReduction(state.noiseReduction ?? true);
    setAutoLevel(state.autoLevel ?? true);
    setSpeakerColors(state.speakerColors);
    setReframeMode(state.reframeMode || "auto");
    setCropFocusX(state.cropFocusX ?? 0.5);
    setTransition(state.transition || "fade");
    setCaptionAnimation(state.captionAnimation || "pop");
    setAudioGain(state.audioGain ?? 1);
    setExportResolution(state.exportResolution || "1080p");
    setExportFps(state.exportFps || 30);
    setExportBitrate(state.exportBitrate || 5);
    setMusicVolume(state.musicVolume ?? 0.18);
    setAudioDucking(state.audioDucking ?? true);
    setBrollStart(state.brollStart);
    setWatermark(state.watermark);
    setStartTime(state.startTime);
    setEndTime(state.endTime);
    setSubtitleRows(state.subtitleRows);
  }
  function undoStudio() {
    if (historyRef.current.length < 2)
      return onNotice("Belum ada perubahan untuk dibatalkan");
    const current = historyRef.current.pop();
    if (current) futureRef.current.push(current);
    restoreStudio(historyRef.current.at(-1)!);
  }
  function redoStudio() {
    const next = futureRef.current.pop();
    if (!next) return onNotice("Belum ada perubahan untuk diulangi");
    historyRef.current.push(next);
    restoreStudio(next);
  }
  async function restoreAutosave() {
    let draft = localStorage.getItem(`kliyu-editor-draft-${clip.id}`);
    try {
      if (!draft) {
        const response = await fetch(`/api/studio?clipId=${clip.id}`);
        const result = (await response.json()) as { draft?: unknown };
        if (result.draft) draft = JSON.stringify(result.draft);
      }
      if (!draft) return onNotice("Belum ada autosave untuk klip ini");
      restoreStudio(draft);
      onNotice("Autosave cloud berhasil dipulihkan");
    } catch {
      onNotice("Autosave tidak dapat dibaca");
    }
  }
  function applyPreset(preset: (typeof builtInPresets)[number]) {
    setFontFamily(preset.fontFamily);
    setFontColor(preset.fontColor);
    setFontEffect(preset.fontEffect);
    setTitleEffect(preset.titleEffect);
    setTitleAnimation(preset.titleAnimation);
    setStyle(preset.style);
    onNotice(`Preset ${preset.name} diterapkan`);
  }
  function applyPlatformPreset(preset: (typeof platformPresets)[number]) {
    setRatio(preset.ratio);
    setCaptionPosition(preset.captionPosition);
    setTitlePosition(preset.titlePosition);
    setFontSize(preset.fontSize);
    setStyle(preset.style);
    setSafeArea(true);
    onNotice(`Preset ${preset.name} siap digunakan`);
  }
  function generateHookVariants() {
    const core = (hookText || title).replace(/[.!?]+$/, "").trim();
    const subject = title.replace(/[.!?]+$/, "").trim();
    setHookVariants([
      `Jangan lewatkan ini: ${core}`.slice(0, 160),
      `Kesalahan terbesar tentang ${subject.toLowerCase()}`.slice(0, 160),
      `Ini alasan ${subject.toLowerCase()} penting untuk kamu`.slice(0, 160),
    ]);
    onNotice("3 variasi hook dibuat di browser");
  }
  function currentTemplateSettings() {
    return {
      ratio,
      fontSize,
      fontFamily,
      fontColor,
      fontEffect,
      titleEffect,
      titleAnimation,
      titlePosition,
      captionPosition,
      captionAnimation,
      style,
      reframeMode,
      cropFocusX,
      transition,
      audioPreset,
      audioGain,
      exportResolution,
      exportFps,
      exportBitrate,
      musicVolume,
      audioDucking,
      noiseReduction,
      autoLevel,
      watermark,
    };
  }
  async function persistTemplates(
    templates: Array<{ name: string; settings: Record<string, unknown> }>,
  ) {
    setSavedTemplates(templates);
    const response = await fetch("/api/studio", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "templates", value: templates }),
    });
    if (!response.ok) throw new Error("Template gagal disimpan");
  }
  async function saveCreatorTemplate() {
    const name = templateName.trim();
    if (!name) return onNotice("Masukkan nama template terlebih dahulu");
    try {
      const next = [
        { name: name.slice(0, 50), settings: currentTemplateSettings() },
        ...savedTemplates.filter((item) => item.name !== name),
      ].slice(0, 20);
      await persistTemplates(next);
      setTemplateName("");
      onNotice(`Template ${name} tersimpan di cloud`);
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "Template gagal disimpan");
    }
  }
  function applyCreatorTemplate(template: (typeof savedTemplates)[number]) {
    const value = template.settings;
    setRatio(String(value.ratio || "9:16"));
    setFontSize(Number(value.fontSize || 48));
    setFontFamily(String(value.fontFamily || "system"));
    setFontColor(String(value.fontColor || "#FFFFFF"));
    setFontEffect(String(value.fontEffect || "outline"));
    setTitleEffect(String(value.titleEffect || "background"));
    setTitleAnimation(String(value.titleAnimation || "fade"));
    setTitlePosition(String(value.titlePosition || "top"));
    setCaptionPosition(String(value.captionPosition || "bottom"));
    setCaptionAnimation(String(value.captionAnimation || "pop"));
    setStyle(String(value.style || "Bold"));
    setReframeMode(String(value.reframeMode || "auto"));
    setCropFocusX(Number(value.cropFocusX ?? 0.5));
    setTransition(String(value.transition || "fade"));
    setAudioPreset(String(value.audioPreset || "podcast"));
    setAudioGain(Number(value.audioGain ?? 1));
    setExportResolution(String(value.exportResolution || "1080p"));
    setExportFps(Number(value.exportFps || 30));
    setExportBitrate(Number(value.exportBitrate || 5));
    setMusicVolume(Number(value.musicVolume ?? 0.18));
    setAudioDucking(value.audioDucking !== false);
    setNoiseReduction(value.noiseReduction !== false);
    setAutoLevel(value.autoLevel !== false);
    setWatermark(value.watermark !== false);
    onNotice(`Template ${template.name} diterapkan`);
  }
  async function deleteCreatorTemplate(name: string) {
    try {
      await persistTemplates(savedTemplates.filter((item) => item.name !== name));
      onNotice(`Template ${name} dihapus`);
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "Template gagal dihapus");
    }
  }
  async function saveBrandVoice() {
    const response = await fetch("/api/studio", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "brandVoice", value: brandVoice }),
    });
    onNotice(
      response.ok
        ? "Brand Voice tersimpan di cloud"
        : "Brand Voice gagal disimpan",
    );
  }
  function detectScenes() {
    const rows = subtitleRows
      .filter((row) => !row.removed && row.end >= startTime && row.start <= endTime)
      .slice()
      .sort((a, b) => a.start - b.start);
    const markers = rows
      .filter((row, index) => {
        const previous = rows[index - 1];
        return (
          index > 0 &&
          (row.start - previous.end > 0.55 || /[.!?]$/.test(previous.text.trim()))
        );
      })
      .map((row) => row.start)
      .filter((value, index, all) =>
        index === 0 || value - all[index - 1] >= 2.5,
      )
      .slice(0, 12);
    setSceneMarkers(markers);
    onNotice(
      markers.length
        ? `${markers.length} batas adegan ditemukan`
        : "Belum ditemukan pergantian adegan yang kuat",
    );
  }
  function generateBrollPlan() {
    const stopWords = new Set([
      "yang", "dengan", "untuk", "dari", "pada", "adalah", "karena",
      "dalam", "tidak", "akan", "bisa", "kita", "mereka", "sebuah",
    ]);
    const suggestions = subtitleRows
      .filter((row) => !row.removed && row.start >= startTime && row.end <= endTime)
      .map((row) => ({
        time: Math.max(0, row.start - startTime),
        keyword:
          row.text
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, " ")
            .split(/\s+/)
            .filter((word) => word.length > 4 && !stopWords.has(word))
            .slice(0, 3)
            .join(" ") || row.text.slice(0, 32),
      }))
      .filter(
        (item, index, all) =>
          item.keyword && all.findIndex((value) => value.keyword === item.keyword) === index,
      )
      .slice(0, 5);
    setBrollSuggestions(suggestions);
    onNotice(`${suggestions.length} ide B-roll dibuat dari transkrip`);
  }
  function generateRepurposePack() {
    const text = subtitleRows
      .filter((row) => !row.removed)
      .map((row) => row.text)
      .join(" ")
      .trim();
    const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
    const points = (sentences.length ? sentences : [hookText]).slice(0, 6);
    setRepurposeItems([
      {
        format: "Reels 30s",
        content: `${hookText}\n\n${points.slice(0, 2).join(" ")}\n\n${brandVoice.cta}`,
      },
      {
        format: "YouTube Shorts",
        content: `${title}\n${points.slice(0, 3).join(" ")}`,
      },
      {
        format: "Carousel 6 slides",
        content: points.map((point, index) => `${index + 1}. ${point}`).join("\n"),
      },
      {
        format: "Thread",
        content: points.map((point, index) => `${index + 1}/${points.length} ${point}`).join("\n\n"),
      },
      {
        format: "YouTube description",
        content: `${hookText}\n\n${text.slice(0, 700)}\n\n${brandVoice.cta}`,
      },
    ]);
    onNotice("Paket repurposing untuk 5 format selesai dibuat");
  }
  async function saveBrandKit() {
    const kit = {
      fontFamily,
      fontColor,
      fontEffect,
      titleEffect,
      titleAnimation,
      titlePosition,
      captionPosition,
      style,
      watermark,
    };
    localStorage.setItem("kliyu-brand-kit", JSON.stringify(kit));
    const response = await fetch("/api/studio", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "brandKit", value: kit }),
    });
    onNotice(
      response.ok
        ? "Brand Kit tersimpan di cloud"
        : "Brand Kit tersimpan di perangkat",
    );
  }
  async function applyBrandKit() {
    let raw = localStorage.getItem("kliyu-brand-kit");
    try {
      const response = await fetch("/api/studio");
      if (response.ok) {
        const result = (await response.json()) as {
          brandKit?: Record<string, unknown>;
        };
        if (result.brandKit && Object.keys(result.brandKit).length)
          raw = JSON.stringify(result.brandKit);
      }
      if (!raw) return onNotice("Simpan Brand Kit terlebih dahulu");
      const kit = JSON.parse(raw);
      setFontFamily(kit.fontFamily || "system");
      setFontColor(kit.fontColor || "#FFFFFF");
      setFontEffect(kit.fontEffect || "outline");
      setTitleEffect(kit.titleEffect || "background");
      setTitleAnimation(kit.titleAnimation || "fade");
      setTitlePosition(kit.titlePosition || "top");
      setCaptionPosition(kit.captionPosition || "bottom");
      setStyle(kit.style || "Bold");
      setWatermark(kit.watermark ?? true);
      onNotice("Brand Kit cloud diterapkan");
    } catch {
      onNotice("Brand Kit tidak valid");
    }
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
  const onSave = (updated: Clip) => {
    localStorage.removeItem(`kliyu-editor-draft-${clip.id}`);
    void fetch(`/api/studio?clipId=${clip.id}`, { method: "DELETE" });
    persistClip({ ...updated, captionsEnabled: subtitle });
  };
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
  async function uploadBroll(file?: File) {
    if (!file || typeof clip.id !== "string") return;
    setBrollName(file.name);
    try {
      const response = await fetch(`/api/clips/${clip.id}/broll`, {
        method: "PUT",
        headers: {
          "content-type": file.type,
          "content-length": String(file.size),
        },
        body: file,
      });
      if (!response.ok)
        throw new Error((await response.json()).error || "Upload B-roll gagal");
      onNotice("B-roll berhasil ditambahkan");
    } catch (error) {
      setBrollName("");
      onNotice(error instanceof Error ? error.message : "Upload B-roll gagal");
    }
  }
  async function uploadMusic(file?: File) {
    if (!file || typeof clip.id !== "string") return;
    setMusicName(file.name);
    try {
      const response = await fetch(`/api/clips/${clip.id}/music`, {
        method: "PUT",
        headers: {
          "content-type": file.type || "audio/mpeg",
          "content-length": String(file.size),
        },
        body: file,
      });
      if (!response.ok)
        throw new Error((await response.json()).error || "Upload musik gagal");
      onNotice("Musik siap dengan auto-ducking");
    } catch (error) {
      setMusicName("");
      onNotice(error instanceof Error ? error.message : "Upload musik gagal");
    }
  }
  function runQualityControl() {
    const activeRows = subtitleRows.filter(
      (row) => !row.removed && row.end >= startTime && row.start <= endTime,
    );
    const issues = [
      {
        label: "Video sumber dapat dirender",
        ok: sourceAttached || (!youtubeId && mediaState === "ready"),
        fix: "Pasang video asli",
      },
      {
        label: "Durasi optimal untuk short video",
        ok: endTime - startTime >= 8 && endTime - startTime <= 60,
        fix: "Trim menjadi 8–60 detik",
      },
      {
        label: "Subtitle tidak terlalu panjang",
        ok: activeRows.every((row) => row.text.length <= 84),
        fix: "Pecah subtitle panjang",
      },
      {
        label: "Teks berada di safe area",
        ok: safeArea && titlePosition !== captionPosition,
        fix: "Aktifkan safe area dan pisahkan posisi teks",
      },
      {
        label: "Audio telah dinormalisasi",
        ok: autoLevel && audioGain >= 0.8 && audioGain <= 1.25,
        fix: "Aktifkan auto level",
      },
      {
        label: "Hak penggunaan dikonfirmasi",
        ok: Boolean(sourceAttached || clip.sourceType === "upload"),
        fix: "Gunakan media yang Anda miliki izinnya",
      },
    ];
    setQualityIssues(issues);
    onNotice(`${issues.filter((item) => !item.ok).length} masalah kualitas ditemukan`);
  }
  function autoFixQuality() {
    setSafeArea(true);
    setAutoLevel(true);
    setNoiseReduction(true);
    setAudioGain(1);
    if (titlePosition === captionPosition) setCaptionPosition("bottom");
    if (endTime - startTime > 60) setEndTime(startTime + 60);
    setSubtitleRows((rows) =>
      rows.map((row) => ({ ...row, text: row.text.slice(0, 84) })),
    );
    window.setTimeout(runQualityControl, 0);
    onNotice("Perbaikan aman diterapkan. Masalah sumber tetap memerlukan file asli.");
  }
  async function saveVersion() {
    if (typeof clip.id !== "string") return;
    const response = await fetch(`/api/clips/${clip.id}/versions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ label: `Studio ${new Date().toLocaleString("id-ID")}` }),
    });
    if (!response.ok) return onNotice("Versi gagal disimpan");
    const list = await fetch(`/api/clips/${clip.id}/versions`).then((item) => item.json());
    setVersions(list.versions || []);
    onNotice("Snapshot versi berhasil disimpan");
  }
  async function restoreVersion(versionId: string) {
    if (typeof clip.id !== "string") return;
    const response = await fetch(`/api/clips/${clip.id}/versions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "restore", versionId }),
    });
    if (!response.ok) return onNotice("Versi gagal dipulihkan");
    onNotice("Versi lama dipulihkan. Buka ulang Studio untuk melihat hasilnya.");
  }
  async function submitReview(status = "comment") {
    if (typeof clip.id !== "string") return;
    const response = await fetch(`/api/clips/${clip.id}/review`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        message: reviewMessage,
        timestamp: studioTime,
        status,
      }),
    });
    if (!response.ok) return onNotice("Review gagal disimpan");
    setReviewMessage("");
    const list = await fetch(`/api/clips/${clip.id}/review`).then((item) => item.json());
    setReviews(list.reviews || []);
    onNotice(status === "approved" ? "Klip disetujui" : "Review tersimpan");
  }
  async function attachSourceVideo(file?: File) {
    if (!file) return;
    if (!clip.projectId) {
      onNotice("Project sumber tidak ditemukan. Buat project baru dari video asli.");
      return;
    }
    setSourceUploadBusy(true);
    try {
      const response = await fetch(`/api/projects/${clip.projectId}/upload`, {
        method: "PUT",
        headers: {
          "content-type": file.type || "video/mp4",
          "content-length": String(file.size),
        },
        body: file,
      });
      if (!response.ok)
        throw new Error(
          (await response.json()).error || "Video sumber gagal dipasang",
        );
      setSourceAttached(true);
      setMediaState("loading");
      setMediaVersion((value) => value + 1);
      onNotice("Video sumber terpasang. Preview dan render sekarang aktif.");
    } catch (error) {
      setMediaState("missing");
      onNotice(
        error instanceof Error ? error.message : "Video sumber gagal dipasang",
      );
    } finally {
      setSourceUploadBusy(false);
    }
  }
  async function generateThumbnail() {
    if (typeof clip.id !== "string") return;
    setThumbnailBusy(true);
    try {
      if (youtubeId)
        throw new Error("Smart Thumbnail memerlukan video asli. Unggah file video untuk menangkap frame.");
      const thumbnail = await createThumbnailInBrowser({
        ...clip,
        id: clip.id,
        title,
        hook: hookText,
        startTime,
        endTime,
        aspectRatio: ratio,
        fontSize,
        fontFamily,
        fontColor,
        fontEffect,
        titlePosition,
        captionPosition,
        reframeMode,
        cropFocusX,
        transition,
        captionAnimation,
        titleAnimation,
        audioGain,
        exportResolution,
        exportFps,
        exportBitrate,
        musicName,
        musicVolume,
        audioDucking,
        hookOverlay: hook,
        captionsEnabled: subtitle,
        watermark,
        subtitles: subtitleRows,
      });
      const response = await fetch(`/api/clips/${clip.id}/thumbnail`, {
        method: "POST",
        headers: {
          "content-type": thumbnail.type,
          "content-length": String(thumbnail.size),
        },
        body: thumbnail,
      });
      if (!response.ok)
        throw new Error(
          (await response.json()).error || "Thumbnail gagal dibuat",
        );
      window.location.assign(`/api/clips/${clip.id}/thumbnail`);
      onNotice("Smart thumbnail berhasil dibuat dan diunduh");
    } catch (error) {
      onNotice(
        error instanceof Error ? error.message : "Thumbnail gagal dibuat",
      );
    } finally {
      setThumbnailBusy(false);
    }
  }
  async function generateThumbnailVariants() {
    if (typeof clip.id !== "string") return;
    setThumbnailBusy(true);
    try {
      if (youtubeId && !sourceAttached)
        throw new Error("Pasang video asli sebelum membuat thumbnail.");
      const variants = await createThumbnailVariantsInBrowser({
        ...clip,
        id: clip.id,
        title,
        hook: hookText,
        startTime,
        endTime,
        aspectRatio: ratio,
        fontSize,
        fontFamily,
        fontColor,
        fontEffect,
        titlePosition,
        captionPosition,
        reframeMode,
        cropFocusX,
        transition,
        captionAnimation,
        titleAnimation,
        audioGain,
        exportResolution,
        exportFps,
        exportBitrate,
        musicName,
        musicVolume,
        audioDucking,
        hookOverlay: hook,
        captionsEnabled: subtitle,
        watermark,
        subtitles: subtitleRows,
      });
      variants.forEach((blob, index) => {
        const anchor = document.createElement("a");
        anchor.href = URL.createObjectURL(blob);
        anchor.download = `kliyu-thumbnail-${index + 1}.jpg`;
        anchor.click();
        window.setTimeout(() => URL.revokeObjectURL(anchor.href), 1000);
      });
      const titleFit = Math.max(0, 12 - Math.abs(42 - title.length) / 4);
      setThumbnailScores(
        variants.map((_, index) =>
          Math.min(98, Math.round(78 + titleFit + [5, 2, 7][index])),
        ),
      );
      onNotice("3 alternatif thumbnail berhasil dibuat");
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "Thumbnail gagal dibuat");
    } finally {
      setThumbnailBusy(false);
    }
  }
  async function translateSubtitles() {
    if (typeof clip.id !== "string") return;
    setTranslationBusy(true);
    try {
      const translations = await translateRowsInBrowser(
        subtitleRows.map((row) => ({ text: row.text })),
        "id",
        translationLanguage,
      );
      const response = await fetch(`/api/clips/${clip.id}/translate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          language: translationLanguage,
          translations,
        }),
      });
      const result = (await response.json()) as {
        error?: string;
        subtitles?: Clip["subtitles"];
        language?: string;
      };
      if (!response.ok)
        throw new Error(result.error || "Terjemahan gagal dibuat");
      setSubtitleRows((result.subtitles || []).map((row) => ({ ...row })));
      onNotice(`Subtitle diterjemahkan ke ${result.language}`);
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "Terjemahan gagal");
    } finally {
      setTranslationBusy(false);
    }
  }
  async function generateCaption() {
    if (typeof clip.id !== "string") {
      onNotice("Buka clip hasil analisis untuk membuat caption");
      return;
    }
    setCaptionBusy(true);
    try {
      const generated = await generateSocialCaptionInBrowser({
        title,
        hook: hookText,
        transcript: subtitleRows.map((row) => row.text).join(" "),
        brandVoice,
      });
      const response = await fetch(`/api/clips/${clip.id}/caption`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(generated),
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
    setStudioTime(video.currentTime);
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
    setStudioTime(video.currentTime);
    setCurrentSubtitle(
      subtitleRows.find(
        (item) =>
          !item.removed &&
          item.start <= video.currentTime &&
          item.end >= video.currentTime,
      )?.text || "",
    );
    if (video.currentTime >= endTime) {
      video.pause();
      video.currentTime = startTime;
      setPlaying(false);
    }
  }
  function cleanTranscriptFillers() {
    const filler = /\b(?:eee+|eh+|em+|anu|hmm+|apa namanya|maksudnya)\b[,.!? ]*/gi;
    setSubtitleRows((rows) =>
      rows.map((row) => {
        const text = row.text.replace(filler, " ").replace(/\s+/g, " ").trim();
        return { ...row, text: text || row.text, removed: text ? row.removed : true };
      }),
    );
    onNotice("Kata filler dibersihkan dari transkrip");
  }
  function markSilentGaps() {
    const sorted = subtitleRows
      .filter((row) => !row.removed)
      .slice()
      .sort((a, b) => a.start - b.start);
    const gaps: typeof subtitleRows = [];
    for (let index = 1; index < sorted.length; index++) {
      const start = sorted[index - 1].end;
      const end = sorted[index].start;
      if (end - start >= 0.65)
        gaps.push({ start, end, text: "[Hening]", removed: true });
    }
    if (!gaps.length) return onNotice("Tidak ditemukan jeda panjang");
    setSubtitleRows((rows) => [...rows, ...gaps].sort((a, b) => a.start - b.start));
    setTranscriptCut(true);
    onNotice(`${gaps.length} jeda panjang ditandai untuk dipotong`);
  }
  function cutAtPlayhead() {
    const start = Math.max(startTime, studioTime - 0.5);
    const end = Math.min(endTime, studioTime + 0.5);
    if (end <= start) return;
    setSubtitleRows((rows) => [
      ...rows,
      { start, end, text: "[Potongan manual]", removed: true },
    ].sort((a, b) => a.start - b.start));
    setTranscriptCut(true);
    onNotice("Potongan 1 detik ditambahkan di posisi playhead");
  }
  function suggestBroll() {
    const row = subtitleRows.find(
      (item) => !item.removed && item.start >= startTime + 1,
    );
    if (!row) return onNotice("Transkrip belum cukup untuk saran B-roll");
    const stopWords = new Set([
      "yang", "dan", "atau", "dari", "untuk", "dengan", "pada", "ini",
      "itu", "saya", "kita", "adalah", "akan", "tidak", "bisa",
    ]);
    const keywords = row.text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 4 && !stopWords.has(word))
      .slice(0, 3)
      .join(" · ");
    setBrollStart(Math.max(0, row.start - startTime));
    setBrollSuggestion(keywords || row.text.slice(0, 45));
    onNotice("Waktu dan kata kunci B-roll sudah disarankan");
  }
  function mergeShortSubtitles() {
    setSubtitleRows((rows) => {
      const merged: typeof rows = [];
      for (const row of rows) {
        const previous = merged.at(-1);
        if (
          previous &&
          !previous.removed &&
          !row.removed &&
          row.start - previous.end < 0.35 &&
          (previous.text.length < 28 || previous.end - previous.start < 1.25)
        ) {
          previous.end = row.end;
          previous.text = `${previous.text} ${row.text}`.trim();
          previous.words = [...(previous.words || []), ...(row.words || [])];
        } else merged.push({ ...row, words: row.words ? [...row.words] : undefined });
      }
      return merged;
    });
    onNotice("Subtitle pendek berhasil digabung");
  }
  function resetTranscriptCuts() {
    setSubtitleRows((rows) => rows.map((row) => ({ ...row, removed: false })));
    onNotice("Semua potongan transkrip dipulihkan");
  }
  function downloadSubtitles(format: "srt" | "vtt") {
    const rows = subtitleRows.filter(
      (row) => !row.removed && row.end >= startTime && row.start <= endTime,
    );
    const stamp = (seconds: number, separator: string) => {
      const value = Math.max(0, seconds - startTime);
      const hours = Math.floor(value / 3600);
      const minutes = Math.floor((value % 3600) / 60);
      const whole = Math.floor(value % 60);
      const milliseconds = Math.round((value % 1) * 1000);
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(whole).padStart(2, "0")}${separator}${String(milliseconds).padStart(3, "0")}`;
    };
    const body = rows
      .map((row, index) => {
        const timing = `${stamp(row.start, format === "srt" ? "," : ".")} --> ${stamp(row.end, format === "srt" ? "," : ".")}`;
        return format === "srt" ? `${index + 1}\n${timing}\n${row.text}` : `${timing}\n${row.text}`;
      })
      .join("\n\n");
    const blob = new Blob([format === "vtt" ? `WEBVTT\n\n${body}` : body], {
      type: format === "vtt" ? "text/vtt" : "application/x-subrip",
    });
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(blob);
    anchor.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "kliyu-subtitle"}.${format}`;
    anchor.click();
    URL.revokeObjectURL(anchor.href);
    onNotice(`Subtitle ${format.toUpperCase()} berhasil diunduh`);
  }
  const retentionScores=Array.from({length:12},(_,index)=>{
    const from=startTime+((endTime-startTime)/12)*index,to=startTime+((endTime-startTime)/12)*(index+1);
    const text=subtitleRows.filter((row)=>!row.removed&&row.end>=from&&row.start<=to).map((row)=>row.text).join(" ");
    const density=text.split(/\s+/).filter(Boolean).length;
    const hookBoost=index<2?12:0, sceneBoost=sceneMarkers.some((time)=>time>=from&&time<=to)?8:0;
    return Math.max(28,Math.min(96,52+density*2+hookBoost+sceneBoost-index*2));
  });
  const retentionAverage=Math.round(retentionScores.reduce((sum,value)=>sum+value,0)/retentionScores.length);
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
              {safeArea && (
                <span className="platform-safe-area" aria-hidden="true" />
              )}
              {youtubeId && !sourceAttached ? (
                <iframe
                  className="studio-source-video"
                  src={`https://www.youtube-nocookie.com/embed/${youtubeId}?start=${Math.floor(startTime)}&end=${Math.ceil(endTime)}&rel=0`}
                  title={`Sumber ${clip.title}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video
                  ref={studioVideoRef}
                  className="studio-source-video"
                  src={`/api/clips/${clip.id}/media?source=1&v=${mediaVersion}`}
                  playsInline
                  preload="metadata"
                  style={{ objectPosition: `${cropFocusX * 100}% center` }}
                  onLoadedMetadata={() => {
                    if (studioVideoRef.current) {
                      setMediaState("ready");
                      setVideoDuration(
                        studioVideoRef.current.duration || endTime,
                      );
                      studioVideoRef.current.currentTime = startTime;
                    }
                  }}
                  onError={() => setMediaState("missing")}
                  onTimeUpdate={updateStudioPlayback}
                />
              )}
              {(!youtubeId || sourceAttached) && mediaState === "loading" && (
                <div className="source-media-state" role="status">
                  <RefreshCw className="spin" />
                  <b>Memuat video sumber…</b>
                </div>
              )}
              {(!youtubeId || sourceAttached) && mediaState === "missing" && (
                <div className="source-media-state source-media-missing" role="alert">
                  <FileVideo2 />
                  <b>Video sumber belum tersedia</b>
                  <small>
                    Pasang video asli project ini agar preview dan render bekerja.
                  </small>
                  {clip.projectId && (
                    <label>
                      <input
                        type="file"
                        accept="video/mp4,video/quicktime,video/webm"
                        onChange={(event) =>
                          attachSourceVideo(event.target.files?.[0])
                        }
                      />
                      {sourceUploadBusy ? "Mengunggah…" : "Pilih video asli"}
                    </label>
                  )}
                </div>
              )}
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
                    color: activeSpeakerColor,
                    fontSize: `${Math.round(fontSize / 3)}px`,
                  }}
                >
                  {style === "Karaoke" && activeSubtitle?.words?.length
                    ? activeSubtitle.words.map((word, index) => (
                        <span
                          key={`${word.start}-${index}`}
                          className={
                            index === activeWordIndex ? "active-word" : ""
                          }
                        >
                          {word.word}{" "}
                        </span>
                      ))
                    : currentSubtitle}
                </div>
              )}
              {watermark && <span className="studio-watermark">KLIYU.</span>}
              {logoName && (
                <span className="studio-logo">{logoName.slice(0, 12)}</span>
              )}
              {(!youtubeId || sourceAttached) && mediaState === "ready" && (
                <button
                  aria-label={playing ? "Pause preview" : "Play preview"}
                  onClick={toggleStudioPlayback}
                >
                  {playing ? <Pause /> : <Play />}
                </button>
              )}
            </div>
            <div className="timeline">
              <span>{Math.round(startTime)}s</span>
              <div
                style={{
                  transform: `scaleX(${timelineZoom})`,
                  transformOrigin: "center",
                }}
              >
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
            <div className="multi-track-timeline" aria-label="Multi-track timeline">
              <div className="track-ruler">
                <b>MULTI-TRACK</b>
                <span>{Math.round(studioTime - startTime)}s / {Math.round(endTime - startTime)}s</span>
              </div>
              {[
                { name: "VIDEO", className: "video-track" },
                { name: "CAPTION", className: "caption-track" },
                { name: "B-ROLL", className: "broll-track" },
                { name: "AUDIO", className: "audio-track" },
              ].map((track) => (
                <div className="timeline-track" key={track.name}>
                  <span>{track.name}</span>
                  <div className={track.className}>
                    {track.name === "VIDEO" && <i style={{ left: 0, width: "100%" }} />}
                    {track.name === "CAPTION" &&
                      subtitleRows
                        .filter((row) => !row.removed && row.end >= startTime && row.start <= endTime)
                        .map((row, index) => (
                          <button
                            key={`${row.start}-${index}`}
                            title={row.text}
                            style={{
                              left: `${Math.max(0, ((row.start - startTime) / Math.max(0.1, endTime - startTime)) * 100)}%`,
                              width: `${Math.max(1.5, ((row.end - row.start) / Math.max(0.1, endTime - startTime)) * 100)}%`,
                            }}
                            onClick={() => {
                              setStudioTime(row.start);
                              if (studioVideoRef.current)
                                studioVideoRef.current.currentTime = row.start;
                            }}
                          />
                        ))}
                    {track.name === "B-ROLL" && brollName && (
                      <i
                        style={{
                          left: `${(brollStart / Math.max(0.1, endTime - startTime)) * 100}%`,
                          width: `${Math.min(30, (3 / Math.max(0.1, endTime - startTime)) * 100)}%`,
                        }}
                      />
                    )}
                    {track.name === "AUDIO" &&
                      Array.from({ length: 24 }, (_, index) => (
                        <em key={index} style={{ height: `${25 + ((index * 29) % 65)}%` }} />
                      ))}
                    {sceneMarkers.map((marker) => (
                      <strong
                        key={`${track.name}-${marker}`}
                        style={{
                          left: `${((marker - startTime) / Math.max(0.1, endTime - startTime)) * 100}%`,
                        }}
                      />
                    ))}
                    <b
                      style={{
                        left: `${((studioTime - startTime) / Math.max(0.1, endTime - startTime)) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="studio-toolbar">
              <button onClick={undoStudio}>Undo</button>
              <button onClick={redoStudio}>Redo</button>
              <button onClick={restoreAutosave}>Pulihkan autosave</button>
              <button
                className={safeArea ? "active" : ""}
                onClick={() => setSafeArea(!safeArea)}
              >
                Safe area
              </button>
              <button onClick={detectScenes}>Detect scenes</button>
              <label>
                Zoom{" "}
                <input
                  type="range"
                  min="1"
                  max="2.5"
                  step=".1"
                  value={timelineZoom}
                  onChange={(event) =>
                    setTimelineZoom(Number(event.target.value))
                  }
                />
              </label>
            </div>
          </div>
          <div className="editor-controls">
            <section className={`render-readiness ${readinessScore === 100 ? "ready" : ""}`}>
              <div className="readiness-heading">
                <div>
                  <span>RENDER READINESS</span>
                  <b>{readinessScore === 100 ? "Siap dirender" : "Perlu dilengkapi"}</b>
                </div>
                <strong>{readinessScore}%</strong>
              </div>
              <div className="readiness-progress" aria-label={`Kesiapan render ${readinessScore}%`}>
                <span style={{ width: `${readinessScore}%` }} />
              </div>
              <div className="readiness-checks">
                {renderChecks.map((item) => (
                  <span className={item.ready ? "done" : "pending"} key={item.label}>
                    {item.ready ? <Check /> : <X />} {item.label}
                  </span>
                ))}
              </div>
            </section>
            <section className="retention-map-panel">
              <div><span>AI RETENTION MAP</span><b>{retentionAverage}% prediksi bertahan</b></div>
              <div className="retention-bars">{retentionScores.map((score,index)=><i key={index} style={{height:`${score}%`}} className={score<55?"risk":""}><small>{index*5}s</small></i>)}</div>
              <p>{Math.min(...retentionScores)<55?"Area merah berisiko kehilangan penonton. Perpendek jeda atau tambahkan perubahan visual.":"Alur cukup padat. Hook dan perubahan visual tersebar dengan baik."}</p>
            </section>
            <section className="quality-control-panel">
              <div>
                <span>AI QUALITY CONTROL</span>
                <button onClick={runQualityControl}>
                  <Gauge /> Jalankan pemeriksaan
                </button>
              </div>
              {qualityIssues.length ? (
                <>
                  <div className="quality-list">
                    {qualityIssues.map((item) => (
                      <div className={item.ok ? "ok" : "issue"} key={item.label}>
                        {item.ok ? <CheckCircle2 /> : <CircleHelp />}
                        <span><b>{item.label}</b><small>{item.ok ? "Lolos" : item.fix}</small></span>
                      </div>
                    ))}
                  </div>
                  {qualityIssues.some((item) => !item.ok) && (
                    <button className="auto-fix-button" onClick={autoFixQuality}>
                      <WandSparkles /> Perbaiki otomatis
                    </button>
                  )}
                </>
              ) : (
                <small>Periksa sumber, durasi, subtitle, safe area, audio, dan izin media.</small>
              )}
            </section>
            {youtubeId && !sourceAttached && (
              <section className="source-required-card">
                <FileVideo2 />
                <div>
                  <b>Pasang video asli untuk hasil final</b>
                  <small>
                    Link YouTube dipakai untuk analisis caption. Browser tidak dapat
                    mengekspor frame dan audio YouTube langsung.
                  </small>
                </div>
                {clip.projectId && (
                  <label>
                    <input
                      type="file"
                      accept="video/mp4,video/quicktime,video/webm"
                      onChange={(event) =>
                        attachSourceVideo(event.target.files?.[0])
                      }
                    />
                    {sourceUploadBusy ? "Mengunggah…" : "Pilih video asli"}
                  </label>
                )}
              </section>
            )}
            <section className="studio-quick-tools">
              <div>
                <span>FITUR CREATOR BARU</span>
                <b>Smart Studio</b>
              </div>
              <div className="quick-tool-grid">
                <Toggle
                  label="Cut transkrip"
                  value={transcriptCut}
                  setValue={setTranscriptCut}
                />
                <Toggle
                  label="Warna speaker"
                  value={speakerColors}
                  setValue={setSpeakerColors}
                />
                <Toggle
                  label="Noise reduction"
                  value={noiseReduction}
                  setValue={setNoiseReduction}
                />
                <Toggle
                  label="Auto level suara"
                  value={autoLevel}
                  setValue={setAutoLevel}
                />
              </div>
              <label>
                Audio AI
                <select
                  value={audioPreset}
                  onChange={(event) => setAudioPreset(event.target.value)}
                >
                  <option value="natural">Natural</option>
                  <option value="podcast">Podcast</option>
                  <option value="studio">Studio AI</option>
                </select>
              </label>
              <div className="quick-studio-actions">
                <label className="quick-upload">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(event) => uploadBroll(event.target.files?.[0])}
                  />
                  {brollName ? "✓ B-roll siap" : "+ Tambah B-roll"}
                </label>
                <button onClick={translateSubtitles} disabled={translationBusy}>
                  {translationBusy ? "Memproses..." : "Translate subtitle"}
                </button>
                <button onClick={generateThumbnail} disabled={thumbnailBusy}>
                  {thumbnailBusy ? "Memproses..." : "Smart thumbnail"}
                </button>
                <button
                  onClick={generateThumbnailVariants}
                  disabled={thumbnailBusy}
                >
                  3 thumbnail variants
                </button>
              </div>
              <small>
                Baris subtitle bertanda ✂ akan dihapus dari video saat opsi Cut
                transkrip aktif.
              </small>
            </section>
            <section className="platform-presets">
              <div>
                <span>PLATFORM PRESETS</span>
                <b>Satu klik, langsung sesuai platform</b>
              </div>
              <div>
                {platformPresets.map((preset) => (
                  <button
                    key={preset.name}
                    className={
                      ratio === preset.ratio &&
                      captionPosition === preset.captionPosition &&
                      style === preset.style
                        ? "active"
                        : ""
                    }
                    onClick={() => applyPlatformPreset(preset)}
                  >
                    <strong>{preset.name}</strong>
                    <small>{preset.detail}</small>
                  </button>
                ))}
              </div>
            </section>
            <section className="creator-pro-controls">
              <div className="creator-pro-heading">
                <div>
                  <span>SMART AUTO-REFRAME</span>
                  <b>Fokus subjek & finishing</b>
                </div>
                <Gauge />
              </div>
              <div className="reframe-options">
                {[
                  ["auto", "Auto Face"],
                  ["center", "Center"],
                  ["left", "Left"],
                  ["right", "Right"],
                  ["manual", "Manual"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    className={reframeMode === value ? "active" : ""}
                    onClick={() => {
                      setReframeMode(value);
                      if (value === "left") setCropFocusX(0.3);
                      if (value === "center") setCropFocusX(0.5);
                      if (value === "right") setCropFocusX(0.7);
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <label>
                Titik fokus <b>{Math.round(cropFocusX * 100)}%</b>
                <input
                  type="range"
                  min="0.1"
                  max="0.9"
                  step="0.01"
                  value={cropFocusX}
                  onChange={(event) => {
                    setCropFocusX(Number(event.target.value));
                    setReframeMode("manual");
                  }}
                />
              </label>
              <div className="advanced-grid">
                <label>
                  Transisi klip
                  <select
                    value={transition}
                    onChange={(event) => setTransition(event.target.value)}
                  >
                    <option value="none">Tanpa transisi</option>
                    <option value="fade">Fade black</option>
                    <option value="white">Flash white</option>
                  </select>
                </label>
                <label>
                  Animasi caption
                  <select
                    value={captionAnimation}
                    onChange={(event) => setCaptionAnimation(event.target.value)}
                  >
                    <option value="none">Static</option>
                    <option value="fade">Fade per baris</option>
                    <option value="pop">Pop per baris</option>
                  </select>
                </label>
              </div>
            </section>
            <section className="scene-assist-panel">
              <div>
                <span>SCENE DETECTION</span>
                <button onClick={detectScenes}>
                  <Sparkles /> Analisis adegan
                </button>
              </div>
              {sceneMarkers.length ? (
                <div>
                  {sceneMarkers.map((marker, index) => (
                    <button
                      key={marker}
                      onClick={() => {
                        setStudioTime(marker);
                        if (studioVideoRef.current)
                          studioVideoRef.current.currentTime = marker;
                      }}
                    >
                      Scene {index + 1} · {marker.toFixed(1)}s
                    </button>
                  ))}
                </div>
              ) : (
                <small>Temukan batas kalimat dan jeda yang aman untuk potongan.</small>
              )}
            </section>
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
            <section className="hook-variants">
              <div>
                <span>HOOK VARIANTS</span>
                <button onClick={generateHookVariants}>
                  <WandSparkles /> Buat 3 variasi
                </button>
              </div>
              {hookVariants.length ? (
                <div>
                  {hookVariants.map((variant, index) => (
                    <button
                      key={variant}
                      onClick={() => {
                        setHookText(variant);
                        onNotice(`Hook variasi ${index + 1} diterapkan`);
                      }}
                    >
                      <b>0{index + 1}</b>
                      <span>{variant}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <small>Buat beberapa pembuka agar Anda bisa memilih hook paling kuat.</small>
              )}
            </section>
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
            <label>
              Brand Kit
              <div className="style-options brand-kit-actions">
                <button onClick={saveBrandKit}>Simpan gaya</button>
                <button onClick={applyBrandKit}>Terapkan</button>
                <button
                  onClick={() => {
                    localStorage.removeItem("kliyu-brand-kit");
                    onNotice("Brand Kit direset");
                  }}
                >
                  Reset
                </button>
              </div>
            </label>
            <section className="creator-templates">
              <div>
                <span>CREATOR TEMPLATES</span>
                <b>Simpan seluruh pengaturan Studio</b>
              </div>
              <div className="template-save-row">
                <input
                  value={templateName}
                  maxLength={50}
                  placeholder="Nama template, contoh: Podcast Harian"
                  onChange={(event) => setTemplateName(event.target.value)}
                />
                <button onClick={saveCreatorTemplate}>Simpan</button>
              </div>
              {savedTemplates.length ? (
                <div className="saved-template-list">
                  {savedTemplates.map((template) => (
                    <div key={template.name}>
                      <button onClick={() => applyCreatorTemplate(template)}>
                        <Clapperboard /> {template.name}
                      </button>
                      <button
                        aria-label={`Hapus template ${template.name}`}
                        onClick={() => deleteCreatorTemplate(template.name)}
                      >
                        <Trash2 />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <small>Belum ada template tersimpan.</small>
              )}
            </section>
            <section className="brand-voice-panel">
              <div>
                <span>BRAND VOICE</span>
                <b>Gaya AI pribadi Anda</b>
              </div>
              <div className="advanced-grid">
                <label>
                  Nada bahasa
                  <input
                    value={brandVoice.tone}
                    onChange={(event) =>
                      setBrandVoice((value) => ({ ...value, tone: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Target audiens
                  <input
                    value={brandVoice.audience}
                    onChange={(event) =>
                      setBrandVoice((value) => ({ ...value, audience: event.target.value }))
                    }
                  />
                </label>
                <label>
                  CTA default
                  <input
                    value={brandVoice.cta}
                    onChange={(event) =>
                      setBrandVoice((value) => ({ ...value, cta: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Kata yang dihindari
                  <input
                    value={brandVoice.bannedWords}
                    placeholder="murah, clickbait..."
                    onChange={(event) =>
                      setBrandVoice((value) => ({
                        ...value,
                        bannedWords: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  Kamus nama & istilah
                  <input
                    value={brandVoice.customTerms}
                    placeholder="KLIYU, nama pembicara, istilah industri..."
                    onChange={(event) =>
                      setBrandVoice((value) => ({
                        ...value,
                        customTerms: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>
              <button onClick={saveBrandVoice}>Simpan Brand Voice</button>
            </section>
            <button
              className="studio-feature-button"
              onClick={generateThumbnail}
              disabled={thumbnailBusy}
            >
              <Sparkles />
              {thumbnailBusy
                ? "Membuat thumbnail..."
                : "Buat & unduh Smart Thumbnail"}
            </button>
            {thumbnailScores.length > 0 && (
              <section className="thumbnail-ab-panel">
                <div>
                  <span>THUMBNAIL A/B SCORE</span>
                  <b>Pilih skor tertinggi</b>
                </div>
                <div>
                  {thumbnailScores.map((score, index) => (
                    <article key={index} className={score === Math.max(...thumbnailScores) ? "winner" : ""}>
                      <span>Variant {String.fromCharCode(65 + index)}</span>
                      <strong>{score}</strong>
                      <small>{score >= 90 ? "Recommended" : "Good"}</small>
                    </article>
                  ))}
                </div>
              </section>
            )}
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
            <div className="advanced-grid">
              <label className="logo-upload">
                B-roll / gambar sisipan
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) => uploadBroll(event.target.files?.[0])}
                />
                <span>{brollName || "Pilih gambar B-roll"}</span>
              </label>
              <label>
                Muncul pada detik
                <input
                  type="number"
                  min="0"
                  max={Math.max(0, endTime - startTime - 1)}
                  step="0.1"
                  value={brollStart}
                  onChange={(event) =>
                    setBrollStart(Math.max(0, Number(event.target.value)))
                  }
                />
              </label>
            </div>
            <button className="broll-suggestion" onClick={suggestBroll}>
              <Sparkles /> Smart B-roll suggestion
              {brollSuggestion && <small>{brollSuggestion}</small>}
            </button>
            <section className="broll-plan-panel">
              <div>
                <span>AI B-ROLL PLAN</span>
                <button onClick={generateBrollPlan}>
                  <Sparkles /> Buat rencana
                </button>
              </div>
              {brollSuggestions.map((item) => (
                <button
                  key={`${item.time}-${item.keyword}`}
                  onClick={() => {
                    setBrollStart(item.time);
                    setBrollSuggestion(item.keyword);
                    onNotice(`B-roll “${item.keyword}” dipasang pada ${item.time.toFixed(1)}s`);
                  }}
                >
                  <b>{item.time.toFixed(1)}s</b>
                  <span>{item.keyword}</span>
                  <Plus />
                </button>
              ))}
            </section>
            <label>
              Peningkatan audio
              <div className="style-options">
                {[
                  ["natural", "Natural"],
                  ["podcast", "Podcast"],
                  ["studio", "Studio AI"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    className={audioPreset === value ? "active" : ""}
                    onClick={() => setAudioPreset(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </label>
            <label>
              Intensitas audio <b>{Math.round(audioGain * 100)}%</b>
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.05"
                value={audioGain}
                onChange={(event) => setAudioGain(Number(event.target.value))}
              />
            </label>
            <section className="music-design-panel">
              <div>
                <span>MUSIC & SOUND DESIGN</span>
                <b>{musicName ? "Track siap" : "Tambahkan musik berlisensi"}</b>
              </div>
              <label className="logo-upload">
                Musik latar
                <input
                  type="file"
                  accept="audio/mpeg,audio/mp4,audio/wav,audio/ogg,audio/webm"
                  onChange={(event) => uploadMusic(event.target.files?.[0])}
                />
                <span>{musicName || "Pilih MP3, M4A, WAV, OGG, atau WebM"}</span>
              </label>
              <label>
                Volume musik <b>{Math.round(musicVolume * 100)}%</b>
                <input
                  type="range"
                  min="0"
                  max="0.7"
                  step="0.01"
                  value={musicVolume}
                  onChange={(event) => setMusicVolume(Number(event.target.value))}
                />
              </label>
              <Toggle label="Auto-ducking saat bicara" value={audioDucking} setValue={setAudioDucking} />
            </section>
            <section className="export-preset-panel">
              <div>
                <span>EXPORT PRESETS</span>
                <b>
                  Perkiraan {Math.max(1, Math.round(((endTime - startTime) * exportBitrate) / 8))} MB
                </b>
              </div>
              <div className="export-preset-grid">
                <label>
                  Resolusi
                  <select value={exportResolution} onChange={(event) => setExportResolution(event.target.value)}>
                    <option value="720p">720p Fast</option>
                    <option value="1080p">1080p Full HD</option>
                  </select>
                </label>
                <label>
                  Frame rate
                  <select value={exportFps} onChange={(event) => setExportFps(Number(event.target.value))}>
                    <option value="24">24 FPS</option>
                    <option value="30">30 FPS</option>
                    <option value="60">60 FPS</option>
                  </select>
                </label>
                <label>
                  Bitrate
                  <select value={exportBitrate} onChange={(event) => setExportBitrate(Number(event.target.value))}>
                    <option value="3">3 Mbps · Small</option>
                    <option value="5">5 Mbps · Balanced</option>
                    <option value="8">8 Mbps · High</option>
                    <option value="12">12 Mbps · Ultra</option>
                  </select>
                </label>
              </div>
            </section>
            <div className="advanced-grid">
              <label>
                Terjemahan subtitle AI
                <select
                  value={translationLanguage}
                  onChange={(event) =>
                    setTranslationLanguage(event.target.value)
                  }
                >
                  <option value="en">English</option>
                  <option value="ms">Bahasa Melayu</option>
                  <option value="es">Spanish</option>
                  <option value="ja">Japanese</option>
                </select>
              </label>
              <button
                className="studio-feature-button translation-button"
                onClick={translateSubtitles}
                disabled={translationBusy}
              >
                {translationBusy ? "Menerjemahkan..." : "Terjemahkan"}
              </button>
            </div>
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
              <Toggle
                label="Transcript-based cuts"
                value={transcriptCut}
                setValue={setTranscriptCut}
              />
              <Toggle
                label="Warna subtitle per speaker"
                value={speakerColors}
                setValue={setSpeakerColors}
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
                        speaker: "Speaker 1",
                      },
                    ])
                  }
                >
                  <Plus /> Tambah
                </button>
              </div>
              <div className="subtitle-tools">
                <button onClick={cleanTranscriptFillers}>Bersihkan filler</button>
                <button onClick={markSilentGaps}>Potong jeda hening</button>
                <button onClick={cutAtPlayhead}>Cut di playhead</button>
                <button onClick={mergeShortSubtitles}>Gabungkan baris pendek</button>
                <button onClick={resetTranscriptCuts}>Reset potongan</button>
                <button onClick={() => downloadSubtitles("srt")}>Download SRT</button>
                <button onClick={() => downloadSubtitles("vtt")}>Download VTT</button>
              </div>
              {subtitleRows
                .filter((row) => row.end >= startTime && row.start <= endTime)
                .map((row, index) => {
                  const sourceIndex = subtitleRows.indexOf(row);
                  return (
                    <div
                      className={`subtitle-row ${row.removed ? "removed" : ""}`}
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
                      <input
                        value={row.speaker || "Speaker 1"}
                        aria-label={`Speaker subtitle ${index + 1}`}
                        onChange={(event) =>
                          setSubtitleRows((rows) =>
                            rows.map((item, i) =>
                              i === sourceIndex
                                ? { ...item, speaker: event.target.value }
                                : item,
                            ),
                          )
                        }
                      />
                      <button
                        aria-label={`${row.removed ? "Pulihkan" : "Potong"} subtitle ${index + 1}`}
                        title={
                          row.removed
                            ? "Pulihkan segmen"
                            : "Tandai segmen untuk dipotong"
                        }
                        onClick={() =>
                          setSubtitleRows((rows) =>
                            rows.map((item, i) =>
                              i === sourceIndex
                                ? { ...item, removed: !item.removed }
                                : item,
                            ),
                          )
                        }
                      >
                        {row.removed ? "↶" : "✂"}
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
            <section className="repurpose-panel">
              <div>
                <span>CONTENT REPURPOSING</span>
                <button onClick={generateRepurposePack}>
                  <WandSparkles /> Buat 5 format
                </button>
              </div>
              {repurposeItems.length ? (
                <div>
                  {repurposeItems.map((item) => (
                    <article key={item.format}>
                      <b>{item.format}</b>
                      <p>{item.content}</p>
                      <button
                        onClick={async () => {
                          await navigator.clipboard.writeText(item.content);
                          onNotice(`${item.format} berhasil disalin`);
                        }}
                      >
                        <Copy /> Copy
                      </button>
                    </article>
                  ))}
                </div>
              ) : (
                <small>Ubah satu klip menjadi Reels, Shorts, carousel, thread, dan deskripsi.</small>
              )}
            </section>
            <section className="version-history-panel">
              <div>
                <span>VERSION HISTORY</span>
                <button onClick={saveVersion}>
                  <Plus /> Simpan snapshot
                </button>
              </div>
              {versions.length ? (
                versions.slice(0, 5).map((version) => (
                  <div key={version.id}>
                    <span>
                      <b>{version.label}</b>
                      <small>{new Date(version.created_at).toLocaleString("id-ID")}</small>
                    </span>
                    <button onClick={() => restoreVersion(version.id)}>
                      <RefreshCw /> Restore
                    </button>
                  </div>
                ))
              ) : (
                <small>Belum ada snapshot. Simpan sebelum perubahan besar.</small>
              )}
            </section>
            <section className="review-workflow-panel">
              <div>
                <span>APPROVAL WORKFLOW</span>
                <b>Review pada {studioTime.toFixed(1)}s</b>
              </div>
              <div className="review-compose">
                <input
                  value={reviewMessage}
                  placeholder="Tulis catatan revisi pada timestamp ini..."
                  onChange={(event) => setReviewMessage(event.target.value)}
                />
                <button disabled={!reviewMessage.trim()} onClick={() => submitReview("comment")}>
                  Kirim
                </button>
              </div>
              <div className="approval-actions">
                <button onClick={() => submitReview("revision")}>Minta revisi</button>
                <button onClick={() => submitReview("approved")}><Check /> Setujui klip</button>
              </div>
              {reviews.slice(0, 4).map((review) => (
                <article key={review.id}>
                  <span>{review.status} · {review.timestamp.toFixed(1)}s</span>
                  <p>{review.message}</p>
                </article>
              ))}
            </section>
            <section className="copyright-checklist">
              <div><span>COPYRIGHT & SAFETY</span><b>Checklist sebelum publikasi</b></div>
              <p><CheckCircle2 /> Video sumber milik Anda atau digunakan dengan izin.</p>
              <p className={musicName ? "warning" : ""}>
                {musicName ? <CircleHelp /> : <CheckCircle2 />}
                {musicName ? "Pastikan musik memiliki lisensi publikasi." : "Tidak ada musik pihak ketiga."}
              </p>
              <p><CheckCircle2 /> Subtitle dan Brand Voice dapat diperiksa sebelum render.</p>
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
                    transcriptCut,
                    audioPreset,
                    noiseReduction,
                    autoLevel,
                    speakerColors,
                    reframeMode,
                    cropFocusX,
                    transition,
                    captionAnimation,
                    audioGain,
                    exportResolution,
                    exportFps,
                    exportBitrate,
                    musicName,
                    musicVolume,
                    audioDucking,
                    brollName,
                    brollStart,
                    watermark,
                    logoName,
                    postCaption,
                    postCta,
                    postHashtags,
                    hasSourceMedia: sourceAttached,
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
                Upload MP4/MOV atau gunakan link YouTube yang memiliki caption.
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
                Atur trim, rasio, caption, logo, lalu render menjadi video siap unggah.
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
