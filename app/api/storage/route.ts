import { bindings, currentUser, guardMutation } from "@/lib/server";

export async function GET() {
  const user = await currentUser();
  const [uploads, exports, music, broll] = await Promise.all([
    bindings.MEDIA.list({ prefix: `uploads/${user.id}/` }),
    bindings.MEDIA.list({ prefix: `exports/${user.id}/` }),
    bindings.MEDIA.list({ prefix: `music/${user.id}/` }),
    bindings.MEDIA.list({ prefix: `broll/${user.id}/` }),
  ]);
  const groups = [
    { name: "Video sumber", objects: uploads.objects },
    { name: "Hasil render", objects: exports.objects },
    { name: "Musik", objects: music.objects },
    { name: "B-roll", objects: broll.objects },
  ].map((group) => ({
    name: group.name,
    files: group.objects.length,
    bytes: group.objects.reduce((total, item) => total + item.size, 0),
  }));
  return Response.json({
    groups,
    totalFiles: groups.reduce((total, group) => total + group.files, 0),
    totalBytes: groups.reduce((total, group) => total + group.bytes, 0),
  });
}

export async function DELETE(request: Request) {
  const guarded = guardMutation(request, "storage-cleanup");
  if (guarded) return guarded;
  const user = await currentUser();
  const exports = await bindings.MEDIA.list({ prefix: `exports/${user.id}/` });
  if (exports.objects.length)
    await bindings.MEDIA.delete(exports.objects.map((item) => item.key));
  await bindings.DB.prepare(
    "UPDATE clips SET rendered_key=NULL,status='ready',render_progress=0 WHERE id IN (SELECT clips.id FROM clips JOIN projects ON projects.id=clips.project_id WHERE projects.user_id=?)",
  )
    .bind(user.id)
    .run();
  return Response.json({ ok: true, removed: exports.objects.length });
}
