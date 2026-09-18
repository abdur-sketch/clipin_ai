import { bindings, currentUser, guardMutation, jsonError, syncD1Record } from "@/lib/server";
const maximumRenderBytes = 2 * 1024 * 1024 * 1024;

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await currentUser(),
    { id } = await params;
  const clip = await bindings.DB.prepare(
    "SELECT clips.status,clips.title,clips.rendered_key,clips.render_job_id,clips.render_progress,clips.render_error FROM clips JOIN projects ON projects.id=clips.project_id WHERE clips.id=? AND projects.user_id=?",
  )
    .bind(id, user.id)
    .first<Record<string, unknown>>();
  if (!clip) return jsonError("Clip tidak ditemukan", 404);
  if(clip.status==="rendering"&&clip.render_job_id&&bindings.RENDER_SERVICE_URL){
    const statusResponse=await fetch(`${bindings.RENDER_SERVICE_URL.replace(/\/$/,"")}/jobs/${encodeURIComponent(String(clip.render_job_id))}`,{headers:bindings.RENDER_SERVICE_TOKEN?{authorization:`Bearer ${bindings.RENDER_SERVICE_TOKEN}`}:{}}).catch(()=>null);
    if(statusResponse?.ok){
      const job=await statusResponse.json() as {status?:string;progress?:number;downloadUrl?:string;error?:string};
      if(job.status==="failed"){
        clip.status="ready";clip.render_progress=0;clip.render_error=String(job.error||"Cloud render gagal").slice(0,1000);
        await bindings.DB.prepare("UPDATE clips SET status='ready',render_job_id=NULL,render_error=?,render_progress=0,updated_at=? WHERE id=?").bind(clip.render_error,Date.now(),id).run();
        await syncD1Record("clips",id);
      }
      else if(job.status==="completed"&&job.downloadUrl){
        const rendered=await fetch(job.downloadUrl,{signal:AbortSignal.timeout(30_000)});if(rendered.ok&&rendered.body&&(rendered.headers.get("content-type")||"").startsWith("video/")){const key=`exports/${user.id}/${id}.mp4`;await bindings.MEDIA.put(key,rendered.body,{httpMetadata:{contentType:rendered.headers.get("content-type")||"video/mp4"}});await bindings.DB.prepare("UPDATE clips SET status='rendered',rendered_key=?,render_progress=100,render_error=NULL,updated_at=? WHERE id=?").bind(key,Date.now(),id).run();await syncD1Record("clips",id);clip.status="rendered";clip.render_progress=100}
      } else if(job.progress!==undefined){const progress=Math.max(1,Math.min(99,Number(job.progress)));await bindings.DB.prepare("UPDATE clips SET render_progress=?,updated_at=? WHERE id=?").bind(progress,Date.now(),id).run();clip.render_progress=progress}
    }
  }
  return Response.json({
    status: clip.status,
    progress: Number(clip.render_progress || 0),
    error: clip.render_error,
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guarded = guardMutation(request, "render-cancel");
  if (guarded) return guarded;
  const user = await currentUser(),
    { id } = await params;
  const owned = await bindings.DB.prepare(
    "SELECT clips.id,clips.render_job_id FROM clips JOIN projects ON projects.id=clips.project_id WHERE clips.id=? AND projects.user_id=?",
  )
    .bind(id, user.id)
    .first<{id:string;render_job_id?:string}>();
  if (!owned) return jsonError("Clip tidak ditemukan", 404);
  if (owned.render_job_id && bindings.RENDER_SERVICE_URL) {
    await fetch(`${bindings.RENDER_SERVICE_URL.replace(/\/$/, "")}/jobs/${encodeURIComponent(owned.render_job_id)}`, {
      method: "DELETE",
      headers: bindings.RENDER_SERVICE_TOKEN ? { authorization: `Bearer ${bindings.RENDER_SERVICE_TOKEN}` } : {},
      signal: AbortSignal.timeout(8_000),
    }).catch(() => null);
  }
  await bindings.DB.prepare(
    "UPDATE clips SET status='ready',render_job_id=NULL,render_progress=0,updated_at=? WHERE id=?",
  )
    .bind(Date.now(), id)
    .run();
  await syncD1Record("clips", id);
  return Response.json({ ok: true, status: "ready" });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guarded = guardMutation(request, "browser-render-upload");
  if (guarded) return guarded;
  const user = await currentUser(),
    { id } = await params;
  const owned = await bindings.DB.prepare(
    "SELECT clips.id,clips.title FROM clips JOIN projects ON projects.id=clips.project_id WHERE clips.id=? AND projects.user_id=?",
  )
    .bind(id, user.id)
    .first<{ id: string; title: string }>();
  if (!owned) return jsonError("Clip tidak ditemukan", 404);
  const contentType = request.headers.get("content-type") || "";
  if (!/^video\/(mp4|webm)(?:;|$)/.test(contentType))
    return jsonError("Format hasil browser harus MP4 atau WebM", 415);
  if (!request.body) return jsonError("File hasil render kosong");
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (!Number.isFinite(contentLength) || contentLength <= 0)
    return jsonError("Ukuran file hasil render tidak valid", 411);
  if (contentLength > maximumRenderBytes)
    return jsonError("Hasil render maksimum 2 GB", 413);
  const extension = contentType.startsWith("video/mp4") ? "mp4" : "webm";
  const key = `exports/${user.id}/${id}.${extension}`;
  await bindings.MEDIA.put(key, request.body, { httpMetadata: { contentType } });
  await bindings.DB.prepare(
    "UPDATE clips SET status='rendered',rendered_key=?,render_job_id=NULL,render_progress=100,render_error=NULL,updated_at=? WHERE id=?",
  )
    .bind(key, Date.now(), id)
    .run();
  await syncD1Record("clips", id);
  await bindings.DB.prepare(
    "INSERT INTO notifications (id,user_id,type,title,message,read,created_at) VALUES (?,?,?,?,?,0,?)",
  )
    .bind(
      `note_${crypto.randomUUID()}`,
      user.id,
      "export",
      "Export browser selesai",
      `${owned.title} siap diunduh.`,
      Date.now(),
    )
    .run();
  return Response.json({ ok: true, status: "rendered", downloadUrl: `/api/clips/${id}/download` });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guarded = guardMutation(request, "render");
  if (guarded) return guarded;
  const user = await currentUser(),
    { id } = await params;
  const clip = await bindings.DB.prepare(
    "SELECT clips.*,projects.storage_key FROM clips JOIN projects ON projects.id=clips.project_id WHERE clips.id=? AND projects.user_id=?",
  )
    .bind(id, user.id)
    .first();
  if (!clip) return jsonError("Clip tidak ditemukan", 404);
  if (!bindings.RENDER_SERVICE_URL)
    return jsonError(
      "Export MP4 cloud belum dikonfigurasi. Tambahkan RENDER_SERVICE_URL.",
      503,
    );
  const renderJobId = `render_${crypto.randomUUID()}`;
  await bindings.DB.prepare(
    "UPDATE clips SET status='rendering',render_job_id=?,render_progress=1,render_error=NULL,updated_at=? WHERE id=?",
  )
    .bind(renderJobId, Date.now(), id)
    .run();
  await syncD1Record("clips", id);
  const response = await fetch(`${bindings.RENDER_SERVICE_URL.replace(/\/$/, "")}/render`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(bindings.RENDER_SERVICE_TOKEN
        ? { authorization: `Bearer ${bindings.RENDER_SERVICE_TOKEN}` }
        : {}),
    },
    body: JSON.stringify(clip),
  });
  if (!response.ok) {
    const failure = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    const message =
      failure.error || `Render service gagal (${response.status})`;
    await bindings.DB.prepare(
      "UPDATE clips SET status='ready',render_job_id=NULL,render_error=?,updated_at=? WHERE id=?",
    )
      .bind(message.slice(0, 1000), Date.now(), id)
      .run();
    await syncD1Record("clips", id);
    return jsonError(message, 502);
  }
  const contentType = response.headers.get("content-type") || "";
  if (contentType.startsWith("video/")) {
    if (!response.body) {
      await bindings.DB.prepare(
        "UPDATE clips SET status='ready',updated_at=? WHERE id=?",
      )
        .bind(Date.now(), id)
        .run();
      await syncD1Record("clips", id);
      return jsonError("Layanan render tidak mengembalikan video", 502);
    }
    const key = `exports/${user.id}/${id}.mp4`;
    await bindings.MEDIA.put(key, response.body, {
      httpMetadata: { contentType },
    });
    await bindings.DB.prepare(
      "UPDATE clips SET status='rendered',rendered_key=?,render_job_id=NULL,render_progress=100,updated_at=? WHERE id=?",
    )
      .bind(key, Date.now(), id)
      .run();
    await syncD1Record("clips", id);
    await bindings.DB.prepare(
      "INSERT INTO notifications (id,user_id,type,title,message,read,created_at) VALUES (?,?,?,?,?,0,?)",
    )
      .bind(
        `note_${crypto.randomUUID()}`,
        user.id,
        "export",
        "Export MP4 selesai",
        `${String(clip.title)} siap diunduh.`,
        Date.now(),
      )
      .run();
    return Response.json({
      ok: true,
      status: "rendered",
      downloadUrl: `/api/clips/${id}/download`,
    });
  }
  const result = (await response.json().catch(() => ({}))) as { downloadUrl?: string;jobId?:string;status?:string };
  if(result.jobId){await bindings.DB.prepare("UPDATE clips SET status='rendering',render_job_id=?,render_progress=2,updated_at=? WHERE id=?").bind(String(result.jobId).slice(0,500),Date.now(),id).run();await syncD1Record("clips",id);return Response.json({ok:true,status:"rendering",jobId:result.jobId},{status:202})}
  if (!result.downloadUrl) {
    await bindings.DB.prepare(
      "UPDATE clips SET status='ready',updated_at=? WHERE id=?",
    )
      .bind(Date.now(), id)
      .run();
    await syncD1Record("clips", id);
    return jsonError("Layanan render tidak mengembalikan file MP4", 502);
  }
  let downloadUrl: URL;
  try {
    downloadUrl = new URL(result.downloadUrl);
    if (downloadUrl.protocol !== "https:") throw new Error();
  } catch {
    await bindings.DB.prepare("UPDATE clips SET status='ready',render_job_id=NULL,render_error=?,updated_at=? WHERE id=?").bind("URL hasil render tidak aman",Date.now(),id).run();
    await syncD1Record("clips",id);
    return jsonError("URL hasil render tidak aman",502);
  }
  const rendered = await fetch(downloadUrl, { signal: AbortSignal.timeout(30_000) });
  if (!rendered.ok || !rendered.body) {
    await bindings.DB.prepare(
      "UPDATE clips SET status='ready',updated_at=? WHERE id=?",
    )
      .bind(Date.now(), id)
      .run();
    await syncD1Record("clips", id);
    return jsonError("File hasil render tidak dapat diambil", 502);
  }
  const renderedType = rendered.headers.get("content-type") || "";
  if (!renderedType.startsWith("video/")) {
    await bindings.DB.prepare("UPDATE clips SET status='ready',render_job_id=NULL,render_error=?,updated_at=? WHERE id=?").bind("Respons hasil render bukan video",Date.now(),id).run();
    await syncD1Record("clips",id);
    return jsonError("Respons hasil render bukan video",502);
  }
  const key = `exports/${user.id}/${id}.mp4`;
  await bindings.MEDIA.put(key, rendered.body, {
    httpMetadata: {
      contentType: renderedType,
    },
  });
  await bindings.DB.prepare(
    "UPDATE clips SET status='rendered',rendered_key=?,render_job_id=NULL,render_progress=100,updated_at=? WHERE id=?",
  )
    .bind(key, Date.now(), id)
    .run();
  await syncD1Record("clips", id);
  await bindings.DB.prepare(
    "INSERT INTO notifications (id,user_id,type,title,message,read,created_at) VALUES (?,?,?,?,?,0,?)",
  )
    .bind(
      `note_${crypto.randomUUID()}`,
      user.id,
      "export",
      "Export MP4 selesai",
      `${String(clip.title)} siap diunduh.`,
      Date.now(),
    )
    .run();
  return Response.json({
    ok: true,
    status: "rendered",
    downloadUrl: `/api/clips/${id}/download`,
  });
}
