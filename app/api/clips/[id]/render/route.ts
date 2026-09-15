import { bindings, currentUser, guardMutation, jsonError } from "@/lib/server";

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
  if (
    clip.status === "rendering" &&
    clip.render_job_id &&
    bindings.LOCAL_RENDER_BASE_URL
  ) {
    const response = await fetch(
      `${bindings.LOCAL_RENDER_BASE_URL.replace(/\/$/, "")}/progress/${clip.render_job_id}`,
    );
    if (response.ok) {
      const live = (await response.json()) as {
        progress?: number;
        status?: string;
        error?: string;
      };
      const progress = Math.max(
        0,
        Math.min(100, Math.round(Number(live.progress || 0))),
      );
      await bindings.DB.prepare(
        "UPDATE clips SET render_progress=?,render_error=? WHERE id=?",
      )
        .bind(progress, live.error || null, id)
        .run();
      return Response.json({
        status: live.status || clip.status,
        progress,
        error: live.error,
      });
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
    .first();
  if (!owned) return jsonError("Clip tidak ditemukan", 404);
  if (owned.render_job_id && bindings.LOCAL_RENDER_BASE_URL)
    await fetch(
      `${bindings.LOCAL_RENDER_BASE_URL.replace(/\/$/, "")}/progress/${owned.render_job_id}`,
      { method: "DELETE" },
    );
  await bindings.DB.prepare(
    "UPDATE clips SET status='ready',render_job_id=NULL,render_progress=0,updated_at=? WHERE id=?",
  )
    .bind(Date.now(), id)
    .run();
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
  if (!bindings.LOCAL_RENDER_BASE_URL && !bindings.RENDER_SERVICE_URL)
    return jsonError(
      "Export MP4 belum dikonfigurasi. Aktifkan layanan render lokal atau tambahkan RENDER_SERVICE_URL.",
      503,
    );
  const renderJobId = `render_${crypto.randomUUID()}`;
  await bindings.DB.prepare(
    "UPDATE clips SET status='rendering',render_job_id=?,render_progress=1,render_error=NULL,updated_at=? WHERE id=?",
  )
    .bind(renderJobId, Date.now(), id)
    .run();
  let response: Response;
  if (bindings.LOCAL_RENDER_BASE_URL) {
    const source = clip.storage_key
      ? await bindings.MEDIA.get(String(clip.storage_key))
      : null;
    if (!source) {
      await bindings.DB.prepare(
        "UPDATE clips SET status='ready',updated_at=? WHERE id=?",
      )
        .bind(Date.now(), id)
        .run();
      return jsonError("Video sumber tidak ditemukan", 404);
    }
    const form = new FormData();
    form.append(
      "video",
      new File([await source.arrayBuffer()], "source-video", {
        type: source.httpMetadata?.contentType || "application/octet-stream",
      }),
    );
    if (clip.logo_key) {
      const logo = await bindings.MEDIA.get(String(clip.logo_key));
      if (logo)
        form.append(
          "logo",
          new File([await logo.arrayBuffer()], "brand-logo", {
            type: logo.httpMetadata?.contentType || "image/png",
          }),
        );
    }
    if (clip.broll_key) {
      const broll = await bindings.MEDIA.get(String(clip.broll_key));
      if (broll)
        form.append(
          "broll",
          new File([await broll.arrayBuffer()], "broll-image", {
            type: broll.httpMetadata?.contentType || "image/jpeg",
          }),
        );
    }
    form.append(
      "config",
      JSON.stringify({
        start: clip.start_time,
        end: clip.end_time,
        aspectRatio: clip.aspect_ratio || "9:16",
        fontSize: clip.font_size || 48,
        fontFamily: clip.font_family || "system",
        fontColor: clip.font_color || "#FFFFFF",
        fontEffect: clip.font_effect || "outline",
        titleEffect: clip.title_effect || "background",
        titleAnimation: clip.title_animation || "fade",
        titlePosition: clip.title_position || "top",
        captionPosition: clip.caption_position || "bottom",
        smartCleanup: Boolean(clip.smart_cleanup),
        transcriptCut: Boolean(clip.transcript_cut),
        audioPreset: clip.audio_preset || "podcast",
        speakerColors: Boolean(clip.speaker_colors),
        brollStart: Number(clip.broll_start || 2),
        faceTracking: Boolean(clip.face_tracking),
        style: clip.style || "bold",
        hook: clip.hook || "",
        hookOverlay: Boolean(clip.hook_overlay),
        captionsEnabled: Boolean(clip.captions_enabled),
        watermark: Boolean(clip.watermark),
        subtitles: JSON.parse(String(clip.subtitles || "[]")),
        renderJobId,
      }),
    );
    response = await fetch(
      `${bindings.LOCAL_RENDER_BASE_URL.replace(/\/$/, "")}/render`,
      {
        method: "POST",
        body: form,
      },
    );
  } else {
    response = await fetch(`${bindings.RENDER_SERVICE_URL}/render`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(bindings.RENDER_SERVICE_TOKEN
          ? { authorization: `Bearer ${bindings.RENDER_SERVICE_TOKEN}` }
          : {}),
      },
      body: JSON.stringify(clip),
    });
  }
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
    return jsonError("Layanan render tidak mengembalikan file MP4", 502);
  }
  const rendered = await fetch(result.downloadUrl);
  if (!rendered.ok || !rendered.body) {
    await bindings.DB.prepare(
      "UPDATE clips SET status='ready',updated_at=? WHERE id=?",
    )
      .bind(Date.now(), id)
      .run();
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
