import { detectMoments, type TranscriptSegment } from "@/lib/kliyu-ai";
import { bindings, currentUser, id, jsonError } from "@/lib/server";

type ProjectSource = { storage_key?: string; source_url?: string; title: string; content_type?: string };
type TranscriptionResponse = { text?: string; segments?: Array<{ start?: number; end?: number; text?: string }> };

async function ensureStoredSource(projectId: string, project: ProjectSource) {
  if (project.storage_key) return project.storage_key;
  if (!project.source_url) return null;
  const source = await fetch(project.source_url, { redirect: "follow", headers: { "user-agent": "KLIYU/1.0 video importer" } });
  if (!source.ok || !source.body) throw new Error(`Video dari link tidak dapat diambil (${source.status})`);
  const contentType = source.headers.get("content-type") || "";
  if (!contentType.startsWith("video/")) throw new Error("Link tersebut bukan file video langsung. Gunakan link MP4/WebM publik atau unggah video asli.");
  const key = `imports/${projectId}/source`;
  await bindings.MEDIA.put(key, source.body, { httpMetadata: { contentType } });
  await bindings.DB.prepare("UPDATE projects SET storage_key=?,content_type=?,status='uploaded',progress=15,updated_at=? WHERE id=?").bind(key,contentType,Date.now(),projectId).run();
  return key;
}

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser(), { id: projectId } = await params;
  const project = await bindings.DB.prepare("SELECT storage_key,source_url,title,content_type FROM projects WHERE id=? AND user_id=?").bind(projectId,user.id).first<ProjectSource>();
  if (!project) return jsonError("Project tidak ditemukan",404);
  if (!bindings.OPENAI_API_KEY) return jsonError("KLIYU AI belum dikonfigurasi. Tambahkan OPENAI_API_KEY untuk mengaktifkan transkripsi dan deteksi momen nyata.",503);
  await bindings.DB.prepare("UPDATE projects SET status='processing',progress=20,error=NULL,updated_at=? WHERE id=?").bind(Date.now(),projectId).run();
  try {
    const storageKey = await ensureStoredSource(projectId, project);
    if (!storageKey) throw new Error("Video sumber belum tersedia");
    const object = await bindings.MEDIA.get(storageKey);
    if (!object) throw new Error("Video sumber tidak ditemukan di penyimpanan");
    if (object.size > 25 * 1024 * 1024) throw new Error("Transkripsi langsung saat ini mendukung file hingga 25 MB. Kompres video atau hubungkan pipeline media untuk file besar.");
    await bindings.DB.prepare("UPDATE projects SET progress=40,updated_at=? WHERE id=?").bind(Date.now(),projectId).run();
    const form = new FormData();
    form.append("file",new File([await object.arrayBuffer()],project.title.replace(/[^a-z0-9]+/gi,"-") + ".mp4",{type:object.httpMetadata?.contentType || project.content_type || "video/mp4"}));
    form.append("model","whisper-1"); form.append("response_format","verbose_json"); form.append("timestamp_granularities[]","segment");
    const transcription = await fetch("https://api.openai.com/v1/audio/transcriptions",{method:"POST",headers:{authorization:`Bearer ${bindings.OPENAI_API_KEY}`},body:form});
    if (!transcription.ok) throw new Error(`Transkripsi gagal (${transcription.status})`);
    const transcriptData = await transcription.json() as TranscriptionResponse;
    const transcript = transcriptData.text?.trim();
    if (!transcript) throw new Error("Transkripsi kosong");
    const segments: TranscriptSegment[] = (transcriptData.segments || []).map((segment) => ({ start: Number(segment.start || 0), end: Number(segment.end || 0), text: String(segment.text || "").trim() })).filter((segment) => segment.text && segment.end > segment.start);
    await bindings.DB.prepare("UPDATE projects SET progress=68,updated_at=? WHERE id=?").bind(Date.now(),projectId).run();
    const moments = await detectMoments({ apiKey: bindings.OPENAI_API_KEY, model: bindings.OPENAI_MODEL, transcript, segments, safetyIdentifier: user.id });
    const now = Date.now();
    const statements = [bindings.DB.prepare("DELETE FROM clips WHERE project_id=?").bind(projectId),bindings.DB.prepare("INSERT OR REPLACE INTO transcripts (project_id,text,segments,provider,created_at) VALUES (?,?,?,?,?)").bind(projectId,transcript,JSON.stringify(segments),"openai-whisper",now)];
    for (const moment of moments) statements.push(bindings.DB.prepare("INSERT INTO clips (id,project_id,start_time,end_time,score,title,hook,caption,subtitles,reason,category,style,face_tracking,hook_overlay,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,'bold',1,1,'ready',?,?)").bind(id("clip"),projectId,moment.start,moment.end,moment.score,moment.title,moment.hook,`${moment.hook} ${moment.reason}`,JSON.stringify(segments.filter((segment) => segment.end >= moment.start && segment.start <= moment.end)),moment.reason,moment.category,now,now));
    statements.push(bindings.DB.prepare("UPDATE projects SET status='complete',progress=100,updated_at=? WHERE id=?").bind(now,projectId));
    await bindings.DB.batch(statements);
    return Response.json({ok:true,provider:"openai",clips:moments.length});
  } catch (error) {
    const message=error instanceof Error?error.message:"Processing gagal";
    await bindings.DB.prepare("UPDATE projects SET status='failed',error=?,updated_at=? WHERE id=?").bind(message,Date.now(),projectId).run();
    return jsonError(message,500);
  }
}
