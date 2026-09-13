import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");

test("build contains the KLIYU MVP product", async () => {
  const [page, layout, worker] = await Promise.all([source("app/page.tsx"), source("app/layout.tsx"), source("dist/server/index.js")]);
  assert.match(layout, /KLIYU — Create Your Moment/);
  for (const feature of ["Kliyu AI", "Kliyu Studio", "My Clips", "Templates", "Projects", "Create with Kliyu AI"]) assert.ok(page.includes(feature), `missing ${feature}`);
  assert.match(worker, /api\/projects/);
  assert.doesNotMatch(page + layout, /codex-preview|Your site is taking shape|Building your site/);
});

test("new project accepts original files and honest direct video links", async () => {
  const [page, projectsApi, processApi] = await Promise.all([source("app/page.tsx"), source("app/api/projects/route.ts"), source("app/api/projects/[id]/process/route.ts")]);
  assert.match(page, /onStart: \(source\?: File \| string\)/);
  assert.match(page, /accept="video\/mp4,video\/quicktime"/);
  assert.match(page, /Link file video langsung/);
  assert.match(page, /MP4\/WebM publik/);
  assert.doesNotMatch(page, /Gunakan video contoh/);
  assert.match(projectsApi, /Link video tidak valid/);
  assert.match(processApi, /contentType\.startsWith\("video\/"\)/);
});

test("real OpenAI transcription and structured moment analysis replace fake output", async () => {
  const [processApi, ai] = await Promise.all([source("app/api/projects/[id]/process/route.ts"), source("lib/kliyu-ai.ts")]);
  assert.match(processApi, /api\.openai\.com\/v1\/audio\/transcriptions/);
  assert.match(processApi, /openai-whisper/);
  assert.match(ai, /api\.openai\.com\/v1\/responses/);
  assert.match(ai, /json_schema/);
  for (const criterion of ["Hook Strength", "Clarity", "Emotion", "Standalone Value", "Shareability", "Curiosity"]) assert.ok(ai.includes(criterion));
  assert.doesNotMatch(processApi + ai, /demoMoments|clipin-demo/);
});

test("clip workflow includes filters, persistent Studio controls, render, and MP4 download", async () => {
  const [page, clipApi, renderApi, downloadApi, logoApi] = await Promise.all([source("app/page.tsx"), source("app/api/clips/[id]/route.ts"), source("app/api/clips/[id]/render/route.ts"), source("app/api/clips/[id]/download/route.ts"), source("app/api/clips/[id]/logo/route.ts")]);
  for (const feature of ["filter === \"hot\"", "filter === \"ready\"", "filter === \"rendered\"", "ClipPreview", "ClipEditor", "Automatic captions", "Face tracking", "Hook overlay", "KLIYU watermark", "Karaoke", "Export MP4"]) assert.ok(page.includes(feature), `missing ${feature}`);
  for (const ratio of ["9:16", "1:1", "16:9"]) assert.ok(page.includes(ratio));
  assert.match(clipApi, /status='ready',rendered_key=NULL/);
  assert.match(renderApi, /RENDER_SERVICE_URL/);
  assert.match(renderApi, /rendered_key/);
  assert.match(downloadApi, /content-disposition/i);
  assert.ok(logoApi.includes("image\\/(png|jpeg|webp)"));
});

test("templates, metadata, social card, and responsive styling are present", async () => {
  const [page, css, layout] = await Promise.all([source("app/page.tsx"), source("app/globals.css"), source("app/layout.tsx")]);
  for (const category of ["Podcast", "Talking Head", "Business", "Education", "Motivation", "Islamic", "Gaming"]) assert.ok(page.includes(category));
  assert.match(css, /\.template-grid/);
  assert.match(css, /@media\(max-width:720px\)/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(layout, /\/og\.png/);
  await access(new URL("public/og.png", root));
});

test("Autopilot is excluded from the MVP navigation", async () => {
  const page = await source("app/page.tsx");
  const nav = page.slice(page.indexOf('<nav className="nav-list"'), page.indexOf('</nav>', page.indexOf('<nav className="nav-list"')));
  assert.doesNotMatch(nav, /Autopilot|Affiliate|Auto posting/);
});

test("account settings and authenticated sign-out remain wired", async () => {
  const [page, account, capabilities, notifications] = await Promise.all([source("app/page.tsx"), source("app/api/account/route.ts"), source("app/api/capabilities/route.ts"), source("app/api/notifications/route.ts")]);
  for (const feature of ["Upgrade Plan", "SettingsPage", "Billing & plan", "Sign out", "Save changes", "Settings-integrations".toLowerCase(), "HelpModal", "NotificationsModal", "scrollIntoView"]) assert.ok(page.toLowerCase().includes(feature.toLowerCase()));
  assert.match(account, /user_settings/);
  assert.match(account, /subscriptions/);
  assert.match(capabilities, /OPENAI_API_KEY/);
  assert.match(capabilities, /RENDER_SERVICE_URL/);
  assert.match(notifications, /UPDATE notifications SET read=1/);
});
