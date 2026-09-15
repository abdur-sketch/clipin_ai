import {
  bindings,
  currentUser,
  guardMutation,
  id,
  jsonError,
} from "@/lib/server";

const platforms = ["instagram", "tiktok", "youtube", "facebook"];
const sources = ["platform", "affiliate", "digital_product", "client"];

export async function GET() {
  const user = await currentUser();
  const [published, clips, revenue] = await Promise.all([
    bindings.DB.prepare(
      "SELECT p.*,c.title,c.score,c.category,(c.end_time-c.start_time) duration FROM publications p JOIN clips c ON c.id=p.clip_id JOIN projects pr ON pr.id=c.project_id WHERE p.user_id=? AND pr.user_id=? ORDER BY p.published_at DESC",
    )
      .bind(user.id, user.id)
      .all(),
    bindings.DB.prepare(
      "SELECT c.id,c.title,c.status,c.score,c.category,c.start_time,c.end_time,pr.title project_title FROM clips c JOIN projects pr ON pr.id=c.project_id WHERE pr.user_id=? ORDER BY c.updated_at DESC",
    )
      .bind(user.id)
      .all(),
    bindings.DB.prepare(
      "SELECT * FROM revenue_entries WHERE user_id=? ORDER BY earned_at DESC",
    )
      .bind(user.id)
      .all(),
  ]);
  const publicationRows = published.results as Array<Record<string, unknown>>;
  const revenueRows = revenue.results as Array<Record<string, unknown>>;
  const now = new Date(),
    monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const monthPublications = publicationRows.filter(
    (row) => Number(row.published_at) >= monthStart,
  );
  const monthRevenue = revenueRows.filter(
    (row) => Number(row.earned_at) >= monthStart,
  );
  const group = <T extends Record<string, unknown>>(
    rows: T[],
    key: (row: T) => string,
    value: (row: T) => number,
  ) =>
    Object.entries(
      rows.reduce<Record<string, { count: number; total: number }>>(
        (out, row) => {
          const name = key(row) || "Lainnya";
          out[name] ||= { count: 0, total: 0 };
          out[name].count++;
          out[name].total += value(row);
          return out;
        },
        {},
      ),
    )
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total);
  const categoryStats = group(
    publicationRows,
    (row) => String(row.category || "Uncategorized"),
    (row) => Number(row.views || 0),
  );
  const durationStats = group(
    publicationRows,
    (row) => {
      const seconds = Number(row.duration || 0);
      return seconds <= 30
        ? "≤30 sec"
        : seconds <= 45
          ? "31–45 sec"
          : seconds <= 60
            ? "46–60 sec"
            : ">60 sec";
    },
    (row) => Number(row.views || 0),
  );
  const hourStats = group(
    publicationRows,
    (row) =>
      `${new Date(Number(row.published_at)).getHours().toString().padStart(2, "0")}:00`,
    (row) => Number(row.views || 0),
  );
  const revenueStats = group(
    revenueRows,
    (row) => String(row.source),
    (row) => Number(row.amount || 0),
  );
  return Response.json({
    publications: publicationRows,
    availableClips: clips.results,
    revenue: revenueRows,
    analytics: { categoryStats, durationStats, hourStats },
    revenueStats,
    summary: {
      projects: new Set(
        (clips.results as Array<Record<string, unknown>>).map(
          (row) => row.project_title,
        ),
      ).size,
      clips: clips.results.length,
      published: monthPublications.length,
      views: monthPublications.reduce(
        (sum, row) => sum + Number(row.views || 0),
        0,
      ),
      likes: monthPublications.reduce(
        (sum, row) => sum + Number(row.likes || 0),
        0,
      ),
      followers: monthPublications.reduce(
        (sum, row) => sum + Number(row.followers_gained || 0),
        0,
      ),
      revenue: monthRevenue.reduce(
        (sum, row) => sum + Number(row.amount || 0),
        0,
      ),
    },
  });
}

export async function POST(request: Request) {
  const guarded = guardMutation(request, "content");
  if (guarded) return guarded;
  const user = await currentUser(),
    body = (await request.json()) as Record<string, unknown>,
    action = String(body.action || "");
  if (action === "directPublish") {
    if (!bindings.PUBLISH_SERVICE_URL)
      return jsonError(
        "Layanan publikasi belum dikonfigurasi. Tambahkan PUBLISH_SERVICE_URL dan token OAuth platform.",
        503,
      );
    const clipId = String(body.clipId || ""),
      platform = String(body.platform || "").toLowerCase();
    if (!platforms.includes(platform)) return jsonError("Platform tidak valid");
    const clip = await bindings.DB.prepare(
      "SELECT c.id,c.title,c.rendered_key,c.post_caption,c.post_cta,c.post_hashtags FROM clips c JOIN projects p ON p.id=c.project_id WHERE c.id=? AND p.user_id=? AND c.status='rendered'",
    )
      .bind(clipId, user.id)
      .first<Record<string, unknown>>();
    if (!clip?.rendered_key)
      return jsonError("Render MP4 clip terlebih dahulu", 409);
    const video = await bindings.MEDIA.get(String(clip.rendered_key));
    if (!video) return jsonError("File MP4 hasil render tidak ditemukan", 404);
    const form = new FormData();
    form.append(
      "video",
      new File([await video.arrayBuffer()], `${String(clip.title)}.mp4`, {
        type: "video/mp4",
      }),
    );
    form.append("platform", platform);
    form.append(
      "caption",
      [
        clip.post_caption,
        clip.post_cta,
        JSON.parse(String(clip.post_hashtags || "[]")).join(" "),
      ]
        .filter(Boolean)
        .join("\n\n"),
    );
    const published = await fetch(
      `${bindings.PUBLISH_SERVICE_URL.replace(/\/$/, "")}/publish`,
      {
        method: "POST",
        headers: {
          ...(bindings.PUBLISH_SERVICE_TOKEN
            ? { authorization: `Bearer ${bindings.PUBLISH_SERVICE_TOKEN}` }
            : {}),
        },
        body: form,
      },
    );
    if (!published.ok)
      return jsonError(`Layanan publikasi gagal (${published.status})`, 502);
    const result = (await published.json()) as {
      url?: string;
      externalUrl?: string;
    };
    const externalUrl = result.externalUrl || result.url;
    if (!externalUrl)
      return jsonError("Layanan publikasi tidak mengembalikan URL", 502);
    const now = Date.now(),
      publicationId = id("pub");
    await bindings.DB.prepare(
      "INSERT INTO publications (id,user_id,clip_id,platform,status,scheduled_at,published_at,external_url,views,likes,comments,shares,followers_gained,created_at,updated_at) VALUES (?,?,?,?,'published',?,?,?,0,0,0,0,0,?,?)",
    )
      .bind(
        publicationId,
        user.id,
        clipId,
        platform,
        now,
        now,
        externalUrl,
        now,
        now,
      )
      .run();
    return Response.json(
      { ok: true, id: publicationId, url: externalUrl },
      { status: 201 },
    );
  }
  if (action === "publish") {
    const clipId = String(body.clipId || ""),
      platform = String(body.platform || "").toLowerCase();
    if (!platforms.includes(platform)) return jsonError("Platform tidak valid");
    let externalUrl: string;
    try {
      const url = new URL(String(body.url || ""));
      if (url.protocol !== "https:") throw new Error();
      externalUrl = url.toString();
    } catch {
      return jsonError("URL publikasi harus berupa HTTPS yang valid");
    }
    const clip = await bindings.DB.prepare(
      "SELECT c.id FROM clips c JOIN projects p ON p.id=c.project_id WHERE c.id=? AND p.user_id=?",
    )
      .bind(clipId, user.id)
      .first();
    if (!clip) return jsonError("Clip tidak ditemukan", 404);
    const now = Date.now(),
      publishedAt = body.publishedAt
        ? new Date(String(body.publishedAt)).getTime()
        : now;
    if (!Number.isFinite(publishedAt))
      return jsonError("Tanggal publikasi tidak valid");
    const publicationId = id("pub");
    await bindings.DB.prepare(
      "INSERT INTO publications (id,user_id,clip_id,platform,status,scheduled_at,published_at,external_url,views,likes,comments,shares,followers_gained,created_at,updated_at) VALUES (?,?,?,?,'published',?,?,?,0,0,0,0,0,?,?)",
    )
      .bind(
        publicationId,
        user.id,
        clipId,
        platform,
        publishedAt,
        publishedAt,
        externalUrl,
        now,
        now,
      )
      .run();
    return Response.json({ ok: true, id: publicationId }, { status: 201 });
  }
  if (action === "metrics") {
    const values = [
      "views",
      "likes",
      "comments",
      "shares",
      "followersGained",
    ].map((key) => Math.max(0, Math.round(Number(body[key] || 0))));
    const result = await bindings.DB.prepare(
      "UPDATE publications SET views=?,likes=?,comments=?,shares=?,followers_gained=?,updated_at=? WHERE id=? AND user_id=?",
    )
      .bind(...values, Date.now(), String(body.id || ""), user.id)
      .run();
    return result.meta.changes
      ? Response.json({ ok: true })
      : jsonError("Publikasi tidak ditemukan", 404);
  }
  if (action === "revenue") {
    const source = String(body.source || "");
    if (!sources.includes(source))
      return jsonError("Sumber pendapatan tidak valid");
    const amount = Math.round(Number(body.amount));
    if (!Number.isFinite(amount) || amount <= 0)
      return jsonError("Nominal harus lebih dari nol");
    const description = String(body.description || "").trim();
    if (!description) return jsonError("Keterangan wajib diisi");
    const earnedAt = body.earnedAt
      ? new Date(String(body.earnedAt)).getTime()
      : Date.now();
    if (!Number.isFinite(earnedAt)) return jsonError("Tanggal tidak valid");
    const revenueId = id("rev");
    await bindings.DB.prepare(
      "INSERT INTO revenue_entries (id,user_id,source,platform,description,amount,earned_at,created_at) VALUES (?,?,?,?,?,?,?,?)",
    )
      .bind(
        revenueId,
        user.id,
        source,
        body.platform ? String(body.platform) : null,
        description,
        amount,
        earnedAt,
        Date.now(),
      )
      .run();
    return Response.json({ ok: true, id: revenueId }, { status: 201 });
  }
  return jsonError("Action tidak dikenali");
}

export async function DELETE(request: Request) {
  const user = await currentUser(),
    url = new URL(request.url),
    kind = url.searchParams.get("kind"),
    recordId = url.searchParams.get("id");
  if (!recordId || !["publication", "revenue"].includes(String(kind)))
    return jsonError("Target tidak valid");
  const table = kind === "publication" ? "publications" : "revenue_entries";
  const result = await bindings.DB.prepare(
    `DELETE FROM ${table} WHERE id=? AND user_id=?`,
  )
    .bind(recordId, user.id)
    .run();
  return result.meta.changes
    ? Response.json({ ok: true })
    : jsonError("Data tidak ditemukan", 404);
}
