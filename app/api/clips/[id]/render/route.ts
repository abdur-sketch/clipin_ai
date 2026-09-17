import { bindings, currentUser, guardMutation, jsonError, syncD1Record } from "@/lib/server";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await currentUser(),
    { id } = await params;
  const clip = await bindings.DB.prepare(
    "SELECT clips.status,clips.render_job_id,clips.render_progress,clips.render_error FROM clips JOIN projects ON projects.id=clips.project_id WHERE clips.id=? AND projects.user_id=?",
  )
    .bind(id, user.id)
    .first<Record<string, unknown>>();
  if (!clip) return jsonError("Clip tidak ditemukan", 404);
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
    .first();
  if (!owned) return jsonError("Clip tidak ditemukan", 404);
  await bindings.DB.prepare(
    "UPDATE clips SET status='ready',render_job_id=NULL,render_progress=0,updated_at=? WHERE id=?",
  )
    .bind(Date.now(), id)
    .run();
  await syncD1Record("clips", id);
  return Response.json({ ok: true, status: "ready" });
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
  const response = await fetch(`${bindings.RENDER_SERVICE_URL}/render`, {
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
  const result = (await response.json()) as { downloadUrl?: string };
  if (!result.downloadUrl) {
    await bindings.DB.prepare(
      "UPDATE clips SET status='ready',updated_at=? WHERE id=?",
    )
      .bind(Date.now(), id)
      .run();
    await syncD1Record("clips", id);
    return jsonError("Layanan render tidak mengembalikan file MP4", 502);
  }
  const rendered = await fetch(result.downloadUrl);
  if (!rendered.ok || !rendered.body) {
    await bindings.DB.prepare(
      "UPDATE clips SET status='ready',updated_at=? WHERE id=?",
    )
      .bind(Date.now(), id)
      .run();
    await syncD1Record("clips", id);
    return jsonError("File hasil render tidak dapat diambil", 502);
  }
  const key = `exports/${user.id}/${id}.mp4`;
  await bindings.MEDIA.put(key, rendered.body, {
    httpMetadata: {
      contentType: rendered.headers.get("content-type") || "video/mp4",
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
