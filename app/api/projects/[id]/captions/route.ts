import { bindings, currentUser, jsonError } from "@/lib/server";

type CaptionTrack = {
  baseUrl?: string;
  languageCode?: string;
  kind?: string;
};

function jsonArrayAfter(source: string, marker: string) {
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) return null;
  const start = source.indexOf("[", markerIndex + marker.length);
  if (start < 0) return null;
  let depth = 0,
    inString = false,
    escaped = false;
  for (let index = start; index < source.length; index++) {
    const character = source[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === "\\" && inString) {
      escaped = true;
      continue;
    }
    if (character === '"') inString = !inString;
    if (inString) continue;
    if (character === "[") depth++;
    if (character === "]" && --depth === 0) return source.slice(start, index + 1);
  }
  return null;
}

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await currentUser();
  const { id } = await params;
  const project = await bindings.DB.prepare(
    "SELECT source_url,source_type,language FROM projects WHERE id=? AND user_id=?",
  )
    .bind(id, user.id)
    .first<{ source_url?: string; source_type?: string; language?: string }>();
  if (!project) return jsonError("Project tidak ditemukan", 404);
  if (project.source_type !== "youtube" || !project.source_url)
    return jsonError("Caption sumber hanya tersedia untuk link YouTube", 400);
  const watch = await fetch(project.source_url, {
    headers: {
      "accept-language": "id-ID,id;q=0.9,en;q=0.7",
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/131 Safari/537.36",
    },
  });
  if (!watch.ok) return jsonError("YouTube tidak dapat diakses", 502);
  const html = await watch.text();
  const rawTracks = jsonArrayAfter(html, '"captionTracks":');
  if (!rawTracks)
    return jsonError(
      "Video YouTube ini tidak menyediakan caption. Unggah video aslinya agar Browser AI dapat mentranskripsi.",
      422,
    );
  const tracks = JSON.parse(rawTracks) as CaptionTrack[];
  const preferred = String(project.language || "id");
  const track =
    tracks.find((item) => item.languageCode === preferred && item.kind !== "asr") ||
    tracks.find((item) => item.languageCode === preferred) ||
    tracks.find((item) => item.languageCode?.startsWith("id")) ||
    tracks.find((item) => item.languageCode?.startsWith("en")) ||
    tracks[0];
  if (!track?.baseUrl) return jsonError("Track caption tidak ditemukan", 422);
  const captions = await fetch(`${track.baseUrl}&fmt=json3`);
  if (!captions.ok) return jsonError("Caption YouTube tidak dapat diambil", 502);
  const payload = (await captions.json()) as {
    events?: Array<{
      tStartMs?: number;
      dDurationMs?: number;
      segs?: Array<{ utf8?: string }>;
    }>;
  };
  const segments = (payload.events || [])
    .filter((event) => Array.isArray(event.segs))
    .map((event) => {
      const start = Number(event.tStartMs || 0) / 1000;
      return {
        start,
        end: start + Number(event.dDurationMs || 0) / 1000,
        text: (event.segs || [])
          .map((segment) => String(segment.utf8 || ""))
          .join("")
          .replace(/\s+/g, " ")
          .trim(),
      };
    })
    .filter((segment) => segment.text && segment.end > segment.start);
  if (!segments.length) return jsonError("Caption YouTube kosong", 422);
  return Response.json({
    transcript: segments.map((segment) => segment.text).join(" "),
    segments,
    provider: "source-captions",
  });
}
