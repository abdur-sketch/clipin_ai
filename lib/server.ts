import { env } from "cloudflare:workers";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { firebaseGet, firebaseSet } from "@/lib/firebase";

type AppEnv = {
  DB: D1Database;
  MEDIA: R2Bucket;
  RENDER_SERVICE_URL?: string;
  RENDER_SERVICE_TOKEN?: string;
  YOUTUBE_API_KEY?: string;
  PUBLISH_SERVICE_URL?: string;
  PUBLISH_SERVICE_TOKEN?: string;
  EMAIL_SERVICE_URL?: string;
  EMAIL_SERVICE_TOKEN?: string;
  BILLING_SERVICE_URL?: string;
  BILLING_SERVICE_TOKEN?: string;
  FIREBASE_PROJECT_ID?: string;
  FIREBASE_SERVICE_ACCOUNT_JSON?: string;
};
export const bindings = env as unknown as AppEnv;

const firebaseTables = new Set([
  "users",
  "projects",
  "clips",
  "transcripts",
  "user_settings",
  "subscriptions",
  "notifications",
  "channels",
  "posting_rules",
  "publications",
  "referrals",
  "campaigns",
  "campaign_participants",
  "campaign_submissions",
  "payout_requests",
]);

export async function syncD1Record(
  table: string,
  recordId: string,
  idColumn = "id",
) {
  if (!firebaseTables.has(table) || !["id", "project_id", "user_id"].includes(idColumn))
    throw new Error("Koleksi Firebase tidak diizinkan");
  const row = await bindings.DB.prepare(
    `SELECT * FROM ${table} WHERE ${idColumn}=?`,
  )
    .bind(recordId)
    .first<Record<string, unknown>>();
  if (!row) return false;
  return firebaseSet(table, recordId, row);
}

export async function currentUser() {
  const signedIn = await getChatGPTUser();
  const email = signedIn?.email ?? "demo@kliyu.local";
  const name = signedIn?.displayName ?? "Demo Creator";
  const id = await sha(email);
  await bindings.DB.prepare(
    "INSERT OR IGNORE INTO users (id,email,name,created_at) VALUES (?,?,?,?)",
  )
    .bind(id, email, name, Date.now())
    .run();
  const firebaseUser = await firebaseGet<Record<string, unknown>>("users", id);
  if (
    !firebaseUser ||
    firebaseUser.email !== email ||
    firebaseUser.name !== name ||
    firebaseUser.authenticated !== Boolean(signedIn)
  )
    await firebaseSet("users", id, {
      email,
      name,
      authenticated: Boolean(signedIn),
      created_at: Number(firebaseUser?.created_at || Date.now()),
      updated_at: Date.now(),
    });
  return { id, email, name, authenticated: Boolean(signedIn) };
}

export type WorkspaceRole="owner"|"editor"|"reviewer"|"viewer";
export async function workspaceRole(ownerId:string,user:{id:string;email:string}):Promise<WorkspaceRole|null>{
  if(ownerId===user.id)return "owner";
  const member=await bindings.DB.prepare("SELECT role FROM workspace_members WHERE owner_id=? AND email=? AND status='active' AND (expires_at IS NULL OR expires_at>?)").bind(ownerId,user.email.toLowerCase(),Date.now()).first<{role:string}>();
  return member&&["editor","reviewer","viewer"].includes(member.role)?member.role as WorkspaceRole:null;
}
export function roleAllows(role:WorkspaceRole|null,required:"view"|"review"|"edit"){if(!role)return false;if(role==="owner"||role==="editor")return true;if(required==="view")return true;return required==="review"&&role==="reviewer"}

export async function sha(value: string) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(bytes)]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 24);
}

export function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}
export function id(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "")}`;
}

const mutationWindows = new Map<string, { count: number; reset: number }>();
export function guardMutation(request: Request, key = "write") {
  const url = new URL(request.url),
    origin = request.headers.get("origin");
  if (origin && origin !== url.origin)
    return jsonError("Origin request tidak diizinkan", 403);
  const client =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0] ||
    "local";
  const bucket = `${key}:${client}`,
    now = Date.now(),
    current = mutationWindows.get(bucket);
  const window =
    !current || current.reset < now
      ? { count: 0, reset: now + 60_000 }
      : current;
  window.count++;
  mutationWindows.set(bucket, window);
  if (window.count > 30)
    return new Response(
      JSON.stringify({
        error: "Terlalu banyak permintaan. Coba lagi sebentar.",
      }),
      {
        status: 429,
        headers: {
          "content-type": "application/json",
          "retry-after": String(Math.ceil((window.reset - now) / 1000)),
        },
      },
    );
  return null;
}
