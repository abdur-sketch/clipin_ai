import { bindings, currentUser, guardMutation, jsonError } from "@/lib/server";

type StudioPreferences = { brand_kit?: string; drafts?: string; templates?: string };

async function currentPreferences(userId: string) {
  await bindings.DB.prepare(
    "INSERT OR IGNORE INTO studio_preferences (user_id,brand_kit,drafts,templates,updated_at) VALUES (?,'{}','{}','[]',?)",
  )
    .bind(userId, Date.now())
    .run();
  return bindings.DB.prepare(
    "SELECT brand_kit,drafts,templates FROM studio_preferences WHERE user_id=?",
  )
    .bind(userId)
    .first<StudioPreferences>();
}

function objectValue(value?: string) {
  try {
    return JSON.parse(value || "{}");
  } catch {
    return {};
  }
}

export async function GET(request: Request) {
  const user = await currentUser();
  const row = await currentPreferences(user.id);
  const clipId = new URL(request.url).searchParams.get("clipId") || "";
  const drafts = objectValue(row?.drafts) as Record<string, unknown>;
  return Response.json({
    brandKit: objectValue(row?.brand_kit),
    templates: (() => {
      try {
        return JSON.parse(row?.templates || "[]");
      } catch {
        return [];
      }
    })(),
    draft: clipId ? drafts[clipId] || null : null,
  });
}

export async function POST(request: Request) {
  const guarded = guardMutation(request, "studio-preferences");
  if (guarded) return guarded;
  const user = await currentUser();
  const body = (await request.json()) as {
    action?: string;
    clipId?: string;
    value?: unknown;
  };
  const row = await currentPreferences(user.id);
  if (body.action === "brandKit") {
    const value = JSON.stringify(body.value || {}).slice(0, 20000);
    await bindings.DB.prepare(
      "UPDATE studio_preferences SET brand_kit=?,updated_at=? WHERE user_id=?",
    )
      .bind(value, Date.now(), user.id)
      .run();
    return Response.json({ ok: true });
  }
  if (body.action === "draft" && body.clipId) {
    const drafts = objectValue(row?.drafts) as Record<string, unknown>;
    drafts[String(body.clipId)] = body.value || {};
    const value = JSON.stringify(drafts);
    if (value.length > 500000) return jsonError("Draft Studio terlalu besar", 413);
    await bindings.DB.prepare(
      "UPDATE studio_preferences SET drafts=?,updated_at=? WHERE user_id=?",
    )
      .bind(value, Date.now(), user.id)
      .run();
    return Response.json({ ok: true });
  }
  if (body.action === "templates") {
    const templates = Array.isArray(body.value) ? body.value.slice(0, 20) : [];
    const value = JSON.stringify(templates).slice(0, 100000);
    await bindings.DB.prepare(
      "UPDATE studio_preferences SET templates=?,updated_at=? WHERE user_id=?",
    )
      .bind(value, Date.now(), user.id)
      .run();
    return Response.json({ ok: true, templates });
  }
  return jsonError("Aksi Studio tidak dikenali");
}

export async function DELETE(request: Request) {
  const guarded = guardMutation(request, "studio-draft-delete");
  if (guarded) return guarded;
  const user = await currentUser();
  const clipId = new URL(request.url).searchParams.get("clipId");
  if (!clipId) return jsonError("Clip ID wajib diisi");
  const row = await currentPreferences(user.id);
  const drafts = objectValue(row?.drafts) as Record<string, unknown>;
  delete drafts[clipId];
  await bindings.DB.prepare(
    "UPDATE studio_preferences SET drafts=?,updated_at=? WHERE user_id=?",
  )
    .bind(JSON.stringify(drafts), Date.now(), user.id)
    .run();
  return Response.json({ ok: true });
}
