import { env } from "cloudflare:workers";
import { getChatGPTUser } from "@/app/chatgpt-auth";

type AppEnv = {
  DB: D1Database;
  MEDIA: R2Bucket;
  AI_PROVIDER?: "openai" | "ollama";
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
  OLLAMA_BASE_URL?: string;
  OLLAMA_MODEL?: string;
  WHISPER_BASE_URL?: string;
  LOCAL_RENDER_BASE_URL?: string;
  RENDER_SERVICE_URL?: string;
  RENDER_SERVICE_TOKEN?: string;
  YOUTUBE_API_KEY?: string;
  PUBLISH_SERVICE_URL?: string;
  PUBLISH_SERVICE_TOKEN?: string;
  BILLING_SERVICE_URL?: string;
  BILLING_SERVICE_TOKEN?: string;
};
export const bindings = env as unknown as AppEnv;

export function aiProvider() {
  if (bindings.AI_PROVIDER === "ollama") return "ollama" as const;
  if (bindings.AI_PROVIDER === "openai") return "openai" as const;
  if (bindings.OLLAMA_BASE_URL || bindings.WHISPER_BASE_URL)
    return "ollama" as const;
  return "openai" as const;
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
  return { id, email, name, authenticated: Boolean(signedIn) };
}

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
