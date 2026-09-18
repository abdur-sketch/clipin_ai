"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  ExternalLink,
  Plus,
  RefreshCw,
  Trash2,
  TrendingUp,
  WalletCards,
} from "lucide-react";

type Mode = "published" | "analytics" | "monetization";
type Publication = {
  id: string;
  clip_id: string;
  title: string;
  platform: string;
  external_url: string;
  published_at?: number;
  scheduled_at: number;
  status: "scheduled" | "published" | "failed";
  views: number;
  likes: number;
  comments: number;
  shares: number;
  followers_gained: number;
  score: number;
  category?: string;
  duration: number;
};
type AvailableClip = {
  id: string;
  title: string;
  status: string;
  score: number;
  project_title: string;
};
type Revenue = {
  id: string;
  source: string;
  platform?: string;
  description: string;
  amount: number;
  earned_at: number;
};
type Group = { name: string; count: number; total: number };
type Data = {
  publications: Publication[];
  availableClips: AvailableClip[];
  revenue: Revenue[];
  analytics: {
    categoryStats: Group[];
    durationStats: Group[];
    hourStats: Group[];
  };
  revenueStats: Group[];
  summary: {
    projects: number;
    clips: number;
    published: number;
    views: number;
    likes: number;
    followers: number;
    revenue: number;
  };
};
const empty: Data = {
  publications: [],
  availableClips: [],
  revenue: [],
  analytics: { categoryStats: [], durationStats: [], hourStats: [] },
  revenueStats: [],
  summary: {
    projects: 0,
    clips: 0,
    published: 0,
    views: 0,
    likes: 0,
    followers: 0,
    revenue: 0,
  },
};
const money = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value || 0);
const compact = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value || 0);
const today = () => new Date().toISOString().slice(0, 10);
const nextHour = () => {
  const date = new Date(Date.now() + 60 * 60 * 1000);
  date.setMinutes(0, 0, 0);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

export function ContentOS({
  mode,
  notify,
}: {
  mode: Mode;
  notify: (message: string) => void;
}) {
  const [data, setData] = useState<Data>(empty),
    [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/content");
      if (!response.ok) throw new Error();
      setData(await response.json());
    } catch {
      notify("Data content business tidak dapat dimuat");
    } finally {
      setLoading(false);
    }
  }, [notify]);
  useEffect(() => {
    let active = true;
    fetch("/api/content")
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((result) => {
        if (active) setData(result);
      })
      .catch(() => notify("Data content business tidak dapat dimuat"))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [notify]);
  if (loading)
    return (
      <div className="page content-os-page">
        <div className="content-loading">
          <RefreshCw /> Memuat data workspace...
        </div>
      </div>
    );
  if (mode === "published")
    return <Published data={data} reload={load} notify={notify} />;
  if (mode === "analytics") return <Analytics data={data} />;
  return <Monetization data={data} reload={load} notify={notify} />;
}

function PageHead({
  kicker,
  title,
  copy,
  action,
}: {
  kicker: string;
  title: string;
  copy: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="content-head">
      <div>
        <span className="eyebrow">
          <i /> {kicker}
        </span>
        <h1>{title}</h1>
        <p>{copy}</p>
      </div>
      {action}
    </div>
  );
}

function Published({
  data,
  reload,
  notify,
}: {
  data: Data;
  reload: () => Promise<void>;
  notify: (m: string) => void;
}) {
  const [show, setShow] = useState(false),
    [clipId, setClipId] = useState(data.availableClips[0]?.id || ""),
    [platform, setPlatform] = useState("instagram"),
    [url, setUrl] = useState(""),
    [date, setDate] = useState(today()),
    [scheduleAt, setScheduleAt] = useState(nextHour()),
    [editing, setEditing] = useState<Publication | null>(null),
    [metrics, setMetrics] = useState({
      views: "",
      likes: "",
      comments: "",
      shares: "",
      followersGained: "",
    });
  async function publish() {
    const response = await fetch("/api/content", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "publish",
        clipId,
        platform,
        url,
        publishedAt: date,
      }),
    });
    if (!response.ok) {
      notify((await response.json()).error || "Gagal menyimpan publikasi");
      return;
    }
    setShow(false);
    setUrl("");
    await reload();
    notify("Clip ditandai sebagai published");
  }
  async function directPublish() {
    const response = await fetch("/api/content", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "directPublish", clipId, platform }),
    });
    const result = await response.json();
    if (!response.ok) {
      notify(result.error || "Publikasi langsung gagal");
      return;
    }
    setShow(false);
    await reload();
    notify("Clip berhasil dipublikasikan langsung");
  }
  async function schedule() {
    const response = await fetch("/api/content", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "schedule",
        clipId,
        platform,
        scheduledAt: new Date(scheduleAt).toISOString(),
      }),
    });
    const result = await response.json();
    if (!response.ok) {
      notify(result.error || "Jadwal gagal dibuat");
      return;
    }
    setShow(false);
    await reload();
    notify("Clip masuk kalender publikasi");
  }
  function edit(item: Publication) {
    setEditing(item);
    setMetrics({
      views: String(item.views),
      likes: String(item.likes),
      comments: String(item.comments),
      shares: String(item.shares),
      followersGained: String(item.followers_gained),
    });
  }
  async function saveMetrics() {
    if (!editing) return;
    const response = await fetch("/api/content", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "metrics",
        id: editing.id,
        ...Object.fromEntries(
          Object.entries(metrics).map(([key, value]) => [key, Number(value)]),
        ),
      }),
    });
    if (!response.ok) {
      notify("Metrik gagal disimpan");
      return;
    }
    setEditing(null);
    await reload();
    notify("Performa konten diperbarui");
  }
  async function remove(id: string) {
    await fetch(`/api/content?kind=publication&id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    await reload();
    notify("Catatan publikasi dihapus");
  }
  const calendarDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + index);
    const next = date.getTime() + 86400000;
    return {
      date,
      items: data.publications.filter((item) => {
        const value = item.published_at || item.scheduled_at;
        return value >= date.getTime() && value < next;
      }),
    };
  });
  return (
    <div className="page content-os-page">
      <PageHead
        kicker="CONTENT TRACKER"
        title="Published"
        copy="Catat konten yang sudah tayang dan perbarui performanya dari waktu ke waktu."
        action={
          <button className="primary" onClick={() => setShow(true)}>
            <Plus /> Mark as Published
          </button>
        }
      />
      <div className="content-summary">
        <article>
          <span>Published bulan ini</span>
          <strong>{data.summary.published}</strong>
        </article>
        <article>
          <span>Total views</span>
          <strong>{compact(data.summary.views)}</strong>
        </article>
        <article>
          <span>Likes</span>
          <strong>{compact(data.summary.likes)}</strong>
        </article>
        <article>
          <span>Followers gained</span>
          <strong>+{compact(data.summary.followers)}</strong>
        </article>
      </div>
      <section className="visual-content-calendar">
        <div>
          <span className="modal-kicker">7-DAY CONTENT CALENDAR</span>
          <h2>Jadwal publikasi</h2>
        </div>
        <div>
          {calendarDays.map((day) => (
            <article key={day.date.toISOString()} className={day.items.length ? "has-content" : ""}>
              <span>{day.date.toLocaleDateString("id-ID", { weekday: "short" })}</span>
              <strong>{day.date.getDate()}</strong>
              {day.items.length ? (
                day.items.slice(0, 2).map((item) => (
                  <small key={item.id}>{item.platform} · {item.title.slice(0, 24)}</small>
                ))
              ) : (
                <small>Slot kosong</small>
              )}
            </article>
          ))}
        </div>
      </section>
      <div className="published-list">
        {data.publications.map((item) => (
          <article key={item.id}>
            <div className="published-rank">{item.score}</div>
            <div>
              <strong>{item.title}</strong>
              <span>
                {item.platform} · {item.status === "scheduled" ? "Terjadwal" : "Published"} ·{" "}
                {new Date(item.published_at || item.scheduled_at).toLocaleString("id-ID")}
              </span>
            </div>
            <div className="published-metrics">
              <span>
                <b>{compact(item.views)}</b> Views
              </span>
              <span>
                <b>{compact(item.likes)}</b> Likes
              </span>
              <span>
                <b>{compact(item.shares)}</b> Shares
              </span>
            </div>
            <div className="published-actions">
              {item.external_url && (
                <a
                  href={item.external_url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Buka konten"
                >
                  <ExternalLink />
                </a>
              )}
              <button onClick={() => edit(item)}>Update</button>
              <button aria-label="Hapus" onClick={() => remove(item.id)}>
                <Trash2 />
              </button>
            </div>
          </article>
        ))}
        {!data.publications.length && (
          <Empty
            icon={<CalendarDays />}
            title="Belum ada konten published"
            copy="Setelah upload ke platform, catat URL dan performanya di sini."
          />
        )}
      </div>
      {show && (
        <div className="modal-backdrop">
          <section className="content-form-modal">
            <h2>Mark as Published</h2>
            <label>
              Clip
              <select
                value={clipId}
                onChange={(e) => setClipId(e.target.value)}
              >
                {data.availableClips.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title} · {item.project_title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Platform
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
              >
                {["instagram", "tiktok", "youtube", "facebook"].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label>
              URL publikasi
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
              />
            </label>
            <label>
              Tanggal
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
            <label>
              Jadwalkan publikasi
              <input
                type="datetime-local"
                value={scheduleAt}
                onChange={(e) => setScheduleAt(e.target.value)}
              />
            </label>
            <div>
              <button onClick={() => setShow(false)}>Cancel</button>
              <button disabled={!clipId || !scheduleAt} onClick={schedule}>
                Schedule
              </button>
              <button disabled={!clipId} onClick={directPublish}>
                Publish directly
              </button>
              <button
                className="primary"
                disabled={!clipId || !url}
                onClick={publish}
              >
                Save Published
              </button>
            </div>
          </section>
        </div>
      )}
      {editing && (
        <div className="modal-backdrop">
          <section className="content-form-modal">
            <h2>Update Performance</h2>
            {Object.entries(metrics).map(([key, value]) => (
              <label key={key}>
                {key.replace("followersGained", "Followers gained")}
                <input
                  type="number"
                  min="0"
                  value={value}
                  onChange={(e) =>
                    setMetrics((current) => ({
                      ...current,
                      [key]: e.target.value,
                    }))
                  }
                />
              </label>
            ))}
            <div>
              <button onClick={() => setEditing(null)}>Cancel</button>
              <button className="primary" onClick={saveMetrics}>
                Save Metrics
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function Analytics({ data }: { data: Data }) {
  const bestCategory = data.analytics.categoryStats[0],
    bestDuration = data.analytics.durationStats[0],
    bestHour = data.analytics.hourStats[0],
    max = Math.max(
      1,
      ...data.analytics.categoryStats.map((item) => item.total),
    );
  const recommendations = [
    bestCategory
      ? `Prioritaskan kategori ${bestCategory.name}; kategori ini menghasilkan views tertinggi.`
      : "Isi metrik views agar AI dapat menemukan kategori terbaik.",
    bestDuration
      ? `Gunakan durasi ${bestDuration.name} sebagai baseline klip berikutnya.`
      : "Publikasikan beberapa durasi berbeda untuk menemukan retention terbaik.",
    bestHour
      ? `Jadwalkan konten utama mendekati ${bestHour.name}.`
      : "Tambahkan waktu publikasi untuk menemukan jam terbaik.",
  ];
  return (
    <div className="page content-os-page">
      <PageHead
        kicker="PERFORMANCE INTELLIGENCE"
        title="Content Analytics"
        copy="Pelajari pola konten terbaik dari data publikasi Anda sendiri."
      />
      <div className="insight-grid">
        <article>
          <BarChart3 />
          <span>Best category</span>
          <strong>{bestCategory?.name || "Belum ada data"}</strong>
          <small>
            {bestCategory
              ? `${compact(Math.round(bestCategory.total / bestCategory.count))} average views`
              : "Tambahkan metrik konten"}
          </small>
        </article>
        <article>
          <TrendingUp />
          <span>Best duration</span>
          <strong>{bestDuration?.name || "Belum ada data"}</strong>
          <small>
            {bestDuration
              ? `${compact(Math.round(bestDuration.total / bestDuration.count))} average views`
              : "Tambahkan metrik konten"}
          </small>
        </article>
        <article>
          <CalendarDays />
          <span>Best posting time</span>
          <strong>{bestHour?.name || "Belum ada data"}</strong>
          <small>
            {bestHour
              ? `${compact(Math.round(bestHour.total / bestHour.count))} average views`
              : "Tambahkan metrik konten"}
          </small>
        </article>
      </div>
      <section className="feedback-loop-panel">
        <div>
          <TrendingUp />
          <span>
            <b>Analytics Feedback Loop</b>
            <small>Rekomendasi berikut memakai performa konten Anda sendiri.</small>
          </span>
        </div>
        {recommendations.map((item, index) => (
          <p key={item}>
            <b>0{index + 1}</b> {item}
          </p>
        ))}
      </section>
      <section className="analytics-board">
        <div>
          <span className="modal-kicker">VIEWS BY CATEGORY</span>
          <h2>Konten yang paling bekerja</h2>
        </div>
        {data.analytics.categoryStats.map((item) => (
          <div className="analytics-line" key={item.name}>
            <span>{item.name}</span>
            <div>
              <i
                style={{ width: `${Math.max(4, (item.total / max) * 100)}%` }}
              />
            </div>
            <b>{compact(item.total)}</b>
          </div>
        ))}
        {!data.analytics.categoryStats.length && (
          <Empty
            icon={<BarChart3 />}
            title="Analytics menunggu data"
            copy="Tambahkan views pada konten published untuk melihat pola terbaik."
          />
        )}
      </section>
    </div>
  );
}

function Monetization({
  data,
  reload,
  notify,
}: {
  data: Data;
  reload: () => Promise<void>;
  notify: (m: string) => void;
}) {
  const [show, setShow] = useState(false),
    [form, setForm] = useState({
      source: "platform",
      platform: "youtube",
      description: "",
      amount: "",
      earnedAt: today(),
    });
  async function save() {
    const response = await fetch("/api/content", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "revenue",
        ...form,
        amount: Number(form.amount),
      }),
    });
    if (!response.ok) {
      notify((await response.json()).error || "Pendapatan gagal disimpan");
      return;
    }
    setShow(false);
    setForm((current) => ({ ...current, description: "", amount: "" }));
    await reload();
    notify("Pendapatan berhasil dicatat");
  }
  async function remove(id: string) {
    await fetch(`/api/content?kind=revenue&id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    await reload();
    notify("Catatan pendapatan dihapus");
  }
  return (
    <div className="page content-os-page">
      <PageHead
        kicker="MONEY"
        title="Monetization"
        copy="Satukan pendapatan platform, affiliate, produk digital, dan client dalam satu dashboard."
        action={
          <button className="primary" onClick={() => setShow(true)}>
            <Plus /> Add Revenue
          </button>
        }
      />
      <div className="money-total">
        <span>Revenue bulan ini</span>
        <strong>{money(data.summary.revenue)}</strong>
        <small>
          Dari{" "}
          {
            data.revenue.filter(
              (item) =>
                new Date(item.earned_at).getMonth() === new Date().getMonth(),
            ).length
          }{" "}
          transaksi tercatat
        </small>
      </div>
      <div className="revenue-grid">
        {["platform", "affiliate", "digital_product", "client"].map(
          (source) => {
            const total =
              data.revenueStats.find((item) => item.name === source)?.total ||
              0;
            return (
              <article key={source}>
                <WalletCards />
                <span>{source.replace("_", " ")}</span>
                <strong>{money(total)}</strong>
              </article>
            );
          },
        )}
      </div>
      <section className="revenue-history">
        <h2>Revenue history</h2>
        {data.revenue.map((item) => (
          <div key={item.id}>
            <span>
              <b>{item.description}</b>
              <small>
                {item.source.replace("_", " ")}{" "}
                {item.platform ? `· ${item.platform}` : ""} ·{" "}
                {new Date(item.earned_at).toLocaleDateString("id-ID")}
              </small>
            </span>
            <strong>{money(item.amount)}</strong>
            <button
              aria-label="Hapus pendapatan"
              onClick={() => remove(item.id)}
            >
              <Trash2 />
            </button>
          </div>
        ))}
        {!data.revenue.length && <p>Belum ada pendapatan tercatat.</p>}
      </section>
      {show && (
        <div className="modal-backdrop">
          <section className="content-form-modal">
            <h2>Add Revenue</h2>
            <label>
              Sumber
              <select
                value={form.source}
                onChange={(e) =>
                  setForm((current) => ({ ...current, source: e.target.value }))
                }
              >
                {[
                  ["platform", "Platform Revenue"],
                  ["affiliate", "Affiliate"],
                  ["digital_product", "Digital Product"],
                  ["client", "Client Service"],
                ].map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Platform
              <select
                value={form.platform}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    platform: e.target.value,
                  }))
                }
              >
                {[
                  "youtube",
                  "facebook",
                  "tiktok",
                  "instagram",
                  "website",
                  "other",
                ].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label>
              Keterangan
              <input
                value={form.description}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    description: e.target.value,
                  }))
                }
                placeholder="Contoh: AdSense September"
              />
            </label>
            <label>
              Nominal (Rp)
              <input
                type="number"
                min="1"
                value={form.amount}
                onChange={(e) =>
                  setForm((current) => ({ ...current, amount: e.target.value }))
                }
              />
            </label>
            <label>
              Tanggal
              <input
                type="date"
                value={form.earnedAt}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    earnedAt: e.target.value,
                  }))
                }
              />
            </label>
            <div>
              <button onClick={() => setShow(false)}>Cancel</button>
              <button
                className="primary"
                disabled={!form.description || !form.amount}
                onClick={save}
              >
                Save Revenue
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function Empty({
  icon,
  title,
  copy,
}: {
  icon: React.ReactNode;
  title: string;
  copy: string;
}) {
  return (
    <div className="content-empty">
      {icon}
      <strong>{title}</strong>
      <span>{copy}</span>
    </div>
  );
}
