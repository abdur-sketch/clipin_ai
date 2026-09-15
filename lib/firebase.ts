import { env } from "cloudflare:workers";

type ServiceAccount = {
  client_email: string;
  private_key: string;
  token_uri?: string;
  project_id: string;
};

type FirebaseEnv = {
  FIREBASE_PROJECT_ID?: string;
  FIREBASE_SERVICE_ACCOUNT_JSON?: string;
};

const firebaseEnv = env as unknown as FirebaseEnv;
let cachedToken: { value: string; expiresAt: number } | undefined;

function credentials(): ServiceAccount | null {
  const raw = firebaseEnv.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ServiceAccount;
    if (!parsed.client_email || !parsed.private_key || !parsed.project_id)
      return null;
    return parsed;
  } catch {
    return null;
  }
}

export function firebaseConfigured() {
  return Boolean(credentials());
}

function base64url(input: Uint8Array | string) {
  const bytes =
    typeof input === "string" ? new TextEncoder().encode(input) : input;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function pemBytes(pem: string) {
  const binary = atob(
    pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, ""),
  );
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function accessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000)
    return cachedToken.value;
  const account = credentials();
  if (!account) throw new Error("Firebase belum dikonfigurasi");
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64url(
    JSON.stringify({
      iss: account.client_email,
      scope: "https://www.googleapis.com/auth/datastore",
      aud: account.token_uri || "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const unsigned = `${header}.${claim}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemBytes(account.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned),
  );
  const response = await fetch(account.token_uri || "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${base64url(new Uint8Array(signature))}`,
    }),
  });
  if (!response.ok)
    throw new Error(`Autentikasi Firebase gagal (${response.status})`);
  const result = (await response.json()) as {
    access_token: string;
    expires_in?: number;
  };
  cachedToken = {
    value: result.access_token,
    expiresAt: Date.now() + (result.expires_in || 3600) * 1000,
  };
  return cachedToken.value;
}

function projectId() {
  return firebaseEnv.FIREBASE_PROJECT_ID || credentials()?.project_id || "";
}

function documentUrl(collection: string, id: string) {
  const path = `${encodeURIComponent(collection)}/${encodeURIComponent(id)}`;
  return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId())}/databases/(default)/documents/${path}`;
}

function encodeValue(value: unknown): Record<string, unknown> {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number")
    return Number.isInteger(value)
      ? { integerValue: String(value) }
      : { doubleValue: value };
  if (typeof value === "string") return { stringValue: value };
  if (Array.isArray(value))
    return { arrayValue: { values: value.map(encodeValue) } };
  if (typeof value === "object")
    return {
      mapValue: {
        fields: Object.fromEntries(
          Object.entries(value as Record<string, unknown>).map(([key, item]) => [
            key,
            encodeValue(item),
          ]),
        ),
      },
    };
  return { stringValue: String(value) };
}

function decodeValue(value: Record<string, unknown>): unknown {
  if ("nullValue" in value) return null;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("stringValue" in value) return value.stringValue;
  if ("timestampValue" in value) return value.timestampValue;
  if ("arrayValue" in value) {
    const array = value.arrayValue as { values?: Record<string, unknown>[] };
    return (array.values || []).map(decodeValue);
  }
  if ("mapValue" in value) {
    const map = value.mapValue as { fields?: Record<string, Record<string, unknown>> };
    return Object.fromEntries(
      Object.entries(map.fields || {}).map(([key, item]) => [key, decodeValue(item)]),
    );
  }
  return null;
}

function decodeDocument(document: {
  name?: string;
  fields?: Record<string, Record<string, unknown>>;
}) {
  const values = Object.fromEntries(
    Object.entries(document.fields || {}).map(([key, value]) => [
      key,
      decodeValue(value),
    ]),
  );
  return {
    id: String(document.name || "").split("/").pop(),
    ...values,
  } as Record<string, unknown>;
}

async function firebaseFetch(url: string, init: RequestInit = {}) {
  const response = await fetch(url, {
    ...init,
    headers: {
      authorization: `Bearer ${await accessToken()}`,
      "content-type": "application/json",
      ...init.headers,
    },
  });
  return response;
}

export async function firebaseGet<T extends Record<string, unknown>>(
  collection: string,
  id: string,
) {
  if (!firebaseConfigured()) return null;
  const response = await firebaseFetch(documentUrl(collection, id));
  if (response.status === 404) return null;
  if (!response.ok)
    throw new Error(`Firestore gagal membaca ${collection} (${response.status})`);
  return decodeDocument(await response.json()) as T;
}

export async function firebaseSet(
  collection: string,
  id: string,
  data: Record<string, unknown>,
) {
  if (!firebaseConfigured()) return false;
  const fields = Object.fromEntries(
    Object.entries({ ...data, id }).map(([key, value]) => [key, encodeValue(value)]),
  );
  const response = await firebaseFetch(documentUrl(collection, id), {
    method: "PATCH",
    body: JSON.stringify({ fields }),
  });
  if (!response.ok)
    throw new Error(`Firestore gagal menyimpan ${collection} (${response.status})`);
  return true;
}

export async function firebasePatch(
  collection: string,
  id: string,
  data: Record<string, unknown>,
) {
  if (!firebaseConfigured()) return false;
  const current = (await firebaseGet(collection, id)) || {};
  return firebaseSet(collection, id, { ...current, ...data, id });
}

export async function firebaseDelete(collection: string, id: string) {
  if (!firebaseConfigured()) return false;
  const response = await firebaseFetch(documentUrl(collection, id), {
    method: "DELETE",
  });
  if (!response.ok && response.status !== 404)
    throw new Error(`Firestore gagal menghapus ${collection} (${response.status})`);
  return true;
}

export async function firebaseList<T extends Record<string, unknown>>(
  collection: string,
  options: {
    field?: string;
    equals?: string | number | boolean;
    orderBy?: string;
    descending?: boolean;
    limit?: number;
  } = {},
) {
  if (!firebaseConfigured()) return null;
  const from = [{ collectionId: collection }];
  const structuredQuery: Record<string, unknown> = {
    from,
    limit: Math.min(100, Math.max(1, options.limit || 50)),
  };
  if (options.field && options.equals !== undefined)
    structuredQuery.where = {
      fieldFilter: {
        field: { fieldPath: options.field },
        op: "EQUAL",
        value: encodeValue(options.equals),
      },
    };
  if (options.orderBy)
    structuredQuery.orderBy = [
      {
        field: { fieldPath: options.orderBy },
        direction: options.descending ? "DESCENDING" : "ASCENDING",
      },
    ];
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId())}/databases/(default)/documents:runQuery`;
  const response = await firebaseFetch(url, {
    method: "POST",
    body: JSON.stringify({ structuredQuery }),
  });
  if (!response.ok)
    throw new Error(`Firestore gagal membaca daftar ${collection} (${response.status})`);
  const rows = (await response.json()) as Array<{
    document?: { name?: string; fields?: Record<string, Record<string, unknown>> };
  }>;
  return rows.filter((row) => row.document).map((row) => decodeDocument(row.document!)) as T[];
}

export async function firebaseHealthcheck() {
  if (!firebaseConfigured()) return { configured: false, connected: false };
  try {
    await firebaseGet("system", "health");
    return { configured: true, connected: true };
  } catch (error) {
    return {
      configured: true,
      connected: false,
      error: error instanceof Error ? error.message : "Firebase tidak terhubung",
    };
  }
}
