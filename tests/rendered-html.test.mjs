import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server renders the complete CLIPIN AI dashboard", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html lang="id">/i);
  assert.match(html, /<title>CLIPIN AI — Long Video to Viral Clips<\/title>/i);
  assert.match(html, /Ubah video panjang menjadi/);
  assert.match(html, /AI VIDEO REPURPOSING/);
  assert.match(html, /Drop video Anda di sini/);
  assert.match(html, /Podcast Bisnis: Mulai dari Nol/);
  assert.match(html, /New Project/);
  assert.match(html, /My Clips/);
  assert.match(html, /Projects/);
  assert.match(html, /og:image/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|Building your site/);
});

test("source includes every interactive V0.1 flow", async () => {
  const [page, css, layout, packageJson] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/globals.css", root), "utf8"),
    readFile(new URL("app/layout.tsx", root), "utf8"),
    readFile(new URL("package.json", root), "utf8"),
  ]);

  for (const required of [
    "Dashboard", "UploadModal", "processing", "progress", "Detected clips",
    "filter === \"hot\"", "filter === \"rendered\"", "ClipEditor",
    "Burn subtitles", "Face tracking", "Hook overlay", "Karaoke",
    "Render all", "ProjectsPage", "toast", "inputRef.current?.click()",
  ]) assert.ok(page.includes(required), `missing flow: ${required}`);

  assert.match(css, /@media\(max-width:720px\)/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(css, /\.mobile-nav/);
  assert.match(layout, /\/og\.png/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  await access(new URL("public/og.png", root));
});

test("dummy dataset exposes hot, rendered, and editable clips", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  const scores = [...page.matchAll(/score:\s*(\d+)/g)].map((match) => Number(match[1]));
  assert.ok(scores.length >= 6);
  assert.ok(scores.filter((score) => score >= 85).length >= 3);
  assert.match(page, /status:\s*"rendered"/);
  assert.match(page, /status:\s*"ready"/);
  assert.match(page, /setSubtitle/);
  assert.match(page, /setTracking/);
  assert.match(page, /setHook/);
  assert.match(page, /setStyle/);
});
