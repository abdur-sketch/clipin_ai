import {
  bindings,
  currentUser,
  guardMutation,
  jsonError,
  syncD1Record,
} from "@/lib/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guarded = guardMutation(request, "clip-edit");
  if (guarded) return guarded;
  const user = await currentUser(),
    { id } = await params;
  const body = (await request.json()) as Record<string, unknown>;
  const owned = await bindings.DB.prepare(
    "SELECT clips.id FROM clips JOIN projects ON projects.id=clips.project_id WHERE clips.id=? AND projects.user_id=?",
  )
    .bind(id, user.id)
    .first();
  if (!owned) return jsonError("Clip tidak ditemukan", 404);
  const ratio = ["9:16", "1:1", "16:9"].includes(String(body.aspectRatio))
    ? String(body.aspectRatio)
    : "9:16";
  const fontSize = Math.min(80, Math.max(24, Number(body.fontSize ?? 48)));
  const fontFamily = [
    "system",
    "rounded",
    "condensed",
    "serif",
    "mono",
  ].includes(String(body.fontFamily))
    ? String(body.fontFamily)
    : "system";
  const fontEffect = [
    "none",
    "shadow",
    "outline",
    "background",
    "glow",
  ].includes(String(body.fontEffect))
    ? String(body.fontEffect)
    : "outline";
  const titleEffect = [
    "none",
    "shadow",
    "outline",
    "background",
    "glow",
  ].includes(String(body.titleEffect))
    ? String(body.titleEffect)
    : "background";
  const titleAnimation = ["none", "fade", "slide", "pop"].includes(
    String(body.titleAnimation),
  )
    ? String(body.titleAnimation)
    : "fade";
  const titlePosition = ["top", "center", "bottom"].includes(
    String(body.titlePosition),
  )
    ? String(body.titlePosition)
    : "top";
  const captionPosition = ["top", "center", "bottom"].includes(
    String(body.captionPosition),
  )
    ? String(body.captionPosition)
    : "bottom";
  const reframeMode = ["auto", "center", "left", "right", "manual"].includes(
    String(body.reframeMode),
  )
    ? String(body.reframeMode)
    : "auto";
  const transition = ["none", "fade", "white"].includes(
    String(body.transition),
  )
    ? String(body.transition)
    : "fade";
  const captionAnimation = ["none", "fade", "pop"].includes(
    String(body.captionAnimation),
  )
    ? String(body.captionAnimation)
    : "pop";
  const subtitles = Array.isArray(body.subtitles)
    ? body.subtitles
        .slice(0, 200)
        .map((item) => {
          const row = item as Record<string, unknown>;
          const words = Array.isArray(row.words)
            ? row.words
                .slice(0, 100)
                .map((entry) => {
                  const word = entry as Record<string, unknown>;
                  return {
                    start: Number(word.start || 0),
                    end: Number(word.end || 0),
                    word: String(word.word || "")
                      .trim()
                      .slice(0, 80),
                  };
                })
                .filter(
                  (word) =>
                    Number.isFinite(word.start) &&
                    Number.isFinite(word.end) &&
                    word.end > word.start &&
                    word.word,
                )
            : undefined;
          return {
            start: Math.max(0, Number(row.start || 0)),
            end: Math.max(0, Number(row.end || 0)),
            text: String(row.text || "")
              .trim()
              .slice(0, 500),
            speaker: String(row.speaker || "Speaker 1").slice(0, 40),
            removed: Boolean(row.removed),
            words,
          };
        })
        .filter(
          (item) =>
            Number.isFinite(item.start) &&
            Number.isFinite(item.end) &&
            item.end > item.start &&
            item.text,
        )
    : [];
  const fontColor = /^#[0-9a-f]{6}$/i.test(String(body.fontColor))
    ? String(body.fontColor).toUpperCase()
    : "#FFFFFF";
  const start = Math.max(0, Number(body.startTime ?? 0));
  const end = Number(body.endTime ?? 0);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start)
    return jsonError("Rentang trim tidak valid");
  const title = String(body.title ?? "").trim(),
    hook = String(body.hook ?? "").trim();
  if (!title || !hook) return jsonError("Judul dan hook wajib diisi");
  await bindings.DB.prepare(
    "UPDATE clips SET title=?,hook=?,caption=?,start_time=?,end_time=?,style=?,face_tracking=?,hook_overlay=?,captions_enabled=?,aspect_ratio=?,font_size=?,font_family=?,font_color=?,font_effect=?,title_effect=?,title_animation=?,title_position=?,caption_position=?,smart_cleanup=?,transcript_cut=?,audio_preset=?,noise_reduction=?,auto_level=?,speaker_colors=?,reframe_mode=?,crop_focus_x=?,transition=?,caption_animation=?,audio_gain=?,broll_start=?,subtitles=?,watermark=?,status='ready',rendered_key=NULL,updated_at=? WHERE id=?",
  )
    .bind(
      title,
      hook,
      String(body.caption ?? ""),
      start,
      end,
      String(body.style ?? "bold"),
      body.faceTracking ? 1 : 0,
      body.hookOverlay ? 1 : 0,
      body.captionsEnabled === false ? 0 : 1,
      ratio,
      fontSize,
      fontFamily,
      fontColor,
      fontEffect,
      titleEffect,
      titleAnimation,
      titlePosition,
      captionPosition,
      body.smartCleanup === false ? 0 : 1,
      body.transcriptCut ? 1 : 0,
      ["natural", "podcast", "studio"].includes(String(body.audioPreset))
        ? String(body.audioPreset)
        : "podcast",
      body.noiseReduction === false ? 0 : 1,
      body.autoLevel === false ? 0 : 1,
      body.speakerColors ? 1 : 0,
      reframeMode,
      Math.max(0.1, Math.min(0.9, Number(body.cropFocusX ?? 0.5))),
      transition,
      captionAnimation,
      Math.max(0.5, Math.min(1.5, Number(body.audioGain ?? 1))),
      Math.max(0, Number(body.brollStart || 2)),
      JSON.stringify(subtitles),
      body.watermark ? 1 : 0,
      Date.now(),
      id,
    )
    .run();
  await syncD1Record("clips", id);
  return Response.json({ ok: true });
}
