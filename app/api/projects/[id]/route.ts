import { bindings, currentUser, id as makeId, jsonError, syncD1Record } from "@/lib/server";
import {
  firebaseDelete,
  firebaseGet,
  firebaseList,
  firebasePatch,
  firebaseSet,
} from "@/lib/firebase";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await currentUser(),
    { id } = await params;
  const firebaseProject = await firebaseGet<Record<string, unknown>>(
    "projects",
    id,
  );
  if (firebaseProject && firebaseProject.user_id === user.id) {
    const firebaseClips =
      (await firebaseList<Record<string, unknown>>("clips", {
        field: "project_id",
        equals: id,
        limit: 100,
      })) || [];
    firebaseClips.sort((a, b) => Number(b.score || 0) - Number(a.score || 0));
    const firebaseTranscript = await firebaseGet<Record<string, unknown>>(
      "transcripts",
      id,
    );
    return Response.json({
      project: firebaseProject,
      clips: firebaseClips,
      transcript: firebaseTranscript,
    });
  }
  const project = await bindings.DB.prepare(
    "SELECT * FROM projects WHERE id=? AND user_id=?",
  )
    .bind(id, user.id)
    .first();
  if (!project) return jsonError("Project tidak ditemukan", 404);
  const { results: clips } = await bindings.DB.prepare(
    "SELECT * FROM clips WHERE project_id=? ORDER BY score DESC",
  )
    .bind(id)
    .all();
  const transcript = await bindings.DB.prepare(
    "SELECT * FROM transcripts WHERE project_id=?",
  )
    .bind(id)
    .first();
  await Promise.all([
    syncD1Record("projects", id),
    ...clips.map((clip) =>
      syncD1Record("clips", String((clip as { id: string }).id)),
    ),
    ...(transcript ? [syncD1Record("transcripts", id, "project_id")] : []),
  ]);
  return Response.json({ project, clips, transcript });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await currentUser(),
    { id } = await params;
  const body = (await request.json()) as {
    title?: string;
    duplicate?: boolean;
  };
  if (body.duplicate) {
    const project = await bindings.DB.prepare(
      "SELECT * FROM projects WHERE id=? AND user_id=?",
    )
      .bind(id, user.id)
      .first<Record<string, unknown>>();
    if (!project) return jsonError("Project tidak ditemukan", 404);
    const newId = makeId("prj"),
      now = Date.now();
    let storageKey = project.storage_key ? `uploads/${newId}/source` : null;
    if (project.storage_key) {
      const source = await bindings.MEDIA.get(String(project.storage_key));
      if (source)
        await bindings.MEDIA.put(storageKey!, source.body, {
          httpMetadata: source.httpMetadata,
        });
      else storageKey = null;
    }
    await bindings.DB.prepare(
      "INSERT INTO projects (id,user_id,title,filename,content_type,storage_key,source_url,source_type,duration,language,status,progress,error,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
    )
      .bind(
        newId,
        user.id,
        `${String(project.title)} Copy`,
        project.filename,
        project.content_type,
        storageKey,
        project.source_url,
        project.source_type,
        project.duration,
        project.language,
        project.status,
        project.progress,
        null,
        now,
        now,
      )
      .run();
    await firebaseSet("projects", newId, {
      ...project,
      id: newId,
      user_id: user.id,
      title: `${String(project.title)} Copy`,
      storage_key: storageKey,
      error: null,
      created_at: now,
      updated_at: now,
    });
    const clips = await bindings.DB.prepare(
      "SELECT * FROM clips WHERE project_id=?",
    )
      .bind(id)
      .all<Record<string, unknown>>();
    for (const clip of clips.results) {
      const newClipId = makeId("clip");
      await bindings.DB.prepare(
        "INSERT INTO clips (id,project_id,start_time,end_time,score,title,hook,caption,subtitles,reason,category,style,face_tracking,hook_overlay,aspect_ratio,captions_enabled,font_size,font_family,font_color,font_effect,title_effect,title_animation,title_position,caption_position,smart_cleanup,watermark,status,post_hashtags,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'[]',?,?)",
      )
        .bind(
          newClipId,
          newId,
          clip.start_time,
          clip.end_time,
          clip.score,
          clip.title,
          clip.hook,
          clip.caption,
          clip.subtitles,
          clip.reason,
          clip.category,
          clip.style,
          clip.face_tracking,
          clip.hook_overlay,
          clip.aspect_ratio,
          clip.captions_enabled,
          clip.font_size,
          clip.font_family,
          clip.font_color,
          clip.font_effect,
          clip.title_effect,
          clip.title_animation,
          clip.title_position,
          clip.caption_position,
          clip.smart_cleanup,
          clip.watermark,
          "ready",
          now,
          now,
        )
        .run();
      await firebaseSet("clips", newClipId, {
        ...clip,
        id: newClipId,
        project_id: newId,
        status: "ready",
        rendered_key: null,
        created_at: now,
        updated_at: now,
      });
    }
    const transcript = await bindings.DB.prepare(
      "SELECT * FROM transcripts WHERE project_id=?",
    )
      .bind(id)
      .first<Record<string, unknown>>();
    if (transcript)
      await bindings.DB.prepare(
        "INSERT INTO transcripts (project_id,text,segments,provider,created_at) VALUES (?,?,?,?,?)",
      )
        .bind(
          newId,
          transcript.text,
          transcript.segments,
          transcript.provider,
          now,
        )
        .run();
    if (transcript)
      await firebaseSet("transcripts", newId, {
        ...transcript,
        project_id: newId,
        created_at: now,
      });
    return Response.json({ ok: true, id: newId });
  }
  if (!body.title?.trim()) return jsonError("Judul wajib diisi");
  const result = await bindings.DB.prepare(
    "UPDATE projects SET title=?,updated_at=? WHERE id=? AND user_id=?",
  )
    .bind(body.title.trim(), Date.now(), id, user.id)
    .run();
  if (result.meta.changes)
    await firebasePatch("projects", id, {
      title: body.title.trim(),
      updated_at: Date.now(),
    });
  return result.meta.changes
    ? Response.json({ ok: true })
    : jsonError("Project tidak ditemukan", 404);
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await currentUser(),
    { id } = await params;
  const project = await bindings.DB.prepare(
    "SELECT storage_key,rendered_key FROM projects LEFT JOIN clips ON clips.project_id=projects.id WHERE projects.id=? AND user_id=?",
  )
    .bind(id, user.id)
    .first<{ storage_key?: string; rendered_key?: string }>();
  if (!project) return jsonError("Project tidak ditemukan", 404);
  const clipFiles = await bindings.DB.prepare(
    "SELECT rendered_key FROM clips WHERE project_id=? AND rendered_key IS NOT NULL",
  )
    .bind(id)
    .all<{ rendered_key: string }>();
  await bindings.DB.batch([
    bindings.DB.prepare("DELETE FROM clips WHERE project_id=?").bind(id),
    bindings.DB.prepare("DELETE FROM transcripts WHERE project_id=?").bind(id),
    bindings.DB.prepare("DELETE FROM projects WHERE id=? AND user_id=?").bind(
      id,
      user.id,
    ),
  ]);
  const keys = [
    project.storage_key,
    ...clipFiles.results.map((x) => x.rendered_key),
  ].filter(Boolean) as string[];
  if (keys.length) await bindings.MEDIA.delete(keys);
  const firebaseClips =
    (await firebaseList<Record<string, unknown>>("clips", {
      field: "project_id",
      equals: id,
      limit: 100,
    })) || [];
  await Promise.all([
    ...firebaseClips.map((clip) => firebaseDelete("clips", String(clip.id))),
    firebaseDelete("transcripts", id),
    firebaseDelete("projects", id),
  ]);
  return Response.json({ ok: true });
}
