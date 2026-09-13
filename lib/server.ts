import { env } from "cloudflare:workers";
import { getChatGPTUser } from "@/app/chatgpt-auth";

type AppEnv = { DB: D1Database; MEDIA: R2Bucket; OPENAI_API_KEY?: string; RENDER_SERVICE_URL?: string; RENDER_SERVICE_TOKEN?: string; YOUTUBE_API_KEY?: string; PUBLISH_SERVICE_URL?: string };
export const bindings = env as unknown as AppEnv;

export async function currentUser() {
  const signedIn = await getChatGPTUser();
  const email = signedIn?.email ?? "demo@clipin.local";
  const name = signedIn?.displayName ?? "Demo Creator";
  const id = await sha(email);
  await bindings.DB.prepare("INSERT OR IGNORE INTO users (id,email,name,created_at) VALUES (?,?,?,?)").bind(id,email,name,Date.now()).run();
  return { id, email, name, authenticated: Boolean(signedIn) };
}

export async function sha(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map((x) => x.toString(16).padStart(2, "0")).join("").slice(0, 24);
}

export function jsonError(message: string, status = 400) { return Response.json({ error: message }, { status }); }
export function id(prefix: string) { return `${prefix}_${crypto.randomUUID().replaceAll("-", "")}`; }
