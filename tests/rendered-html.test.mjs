import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");

test("build contains the KLIYU MVP product", async () => {
  const [page, layout, worker] = await Promise.all([source("app/page.tsx"), source("app/layout.tsx"), source("dist/server/index.js")]);
  assert.match(layout, /KLIYU — Create Your Moment/);
  for (const feature of ["Dashboard", "Projects", "AI Clips", "Studio", "Published", "Analytics", "Monetization", "New project"]) assert.ok(page.includes(feature), `missing ${feature}`);
  assert.match(worker, /api\/projects/);
  assert.doesNotMatch(page + layout, /codex-preview|Your site is taking shape|Building your site/);
});

test("new project accepts original files and honest direct video links", async () => {
  const [page, projectsApi, processApi] = await Promise.all([source("app/page.tsx"), source("app/api/projects/route.ts"), source("app/api/projects/[id]/process/route.ts")]);
  assert.match(page, /onStart: \(source\?: File \| string,projectName\?:string\)/);
  assert.match(page, /Project Name/);
  assert.match(page, /accept="video\/mp4,video\/quicktime"/);
  assert.match(page, /Link file video langsung/);
  assert.match(page, /MP4\/WebM publik/);
  assert.doesNotMatch(page, /Gunakan video contoh/);
  assert.match(projectsApi, /Link video tidak valid/);
  assert.match(processApi, /contentType\.startsWith\("video\/"\)/);
  assert.match(processApi, /\/import/);
  assert.match(processApi, /LOCAL_RENDER_BASE_URL/);
});

test("real OpenAI and local AI pipelines replace fake output", async () => {
  const [processApi, ai] = await Promise.all([source("app/api/projects/[id]/process/route.ts"), source("lib/kliyu-ai.ts")]);
  assert.match(processApi, /api\.openai\.com\/v1\/audio\/transcriptions/);
  assert.match(processApi, /openai-whisper/);
  assert.match(ai, /api\.openai\.com\/v1\/responses/);
  assert.match(ai, /json_schema/);
  assert.match(processApi, /WHISPER_BASE_URL/);
  assert.match(processApi, /whisper\.cpp-local/);
  assert.match(ai, /OLLAMA|Ollama|api\/generate/);
  for (const criterion of ["Hook Strength", "Clarity", "Emotion", "Standalone Value", "Shareability", "Curiosity"]) assert.ok(ai.includes(criterion));
  assert.doesNotMatch(processApi + ai, /demoMoments|clipin-demo/);
});

test("clip workflow includes filters, persistent Studio controls, render, and MP4 download", async () => {
  const [page, clipApi, renderApi, localRender, downloadApi, logoApi] = await Promise.all([source("app/page.tsx"), source("app/api/clips/[id]/route.ts"), source("app/api/clips/[id]/render/route.ts"), source("scripts/local-render-server.mjs"), source("app/api/clips/[id]/download/route.ts"), source("app/api/clips/[id]/logo/route.ts")]);
  for (const feature of ["filter === \"hot\"", "filter === \"ready\"", "filter === \"rendered\"", "ClipPreview", "ClipEditor", "Automatic captions", "Face tracking", "Hook overlay", "KLIYU watermark", "Karaoke", "Export MP4"]) assert.ok(page.includes(feature), `missing ${feature}`);
  for (const ratio of ["9:16", "1:1", "16:9"]) assert.ok(page.includes(ratio));
  assert.match(clipApi, /status='ready',rendered_key=NULL/);
  assert.match(renderApi, /RENDER_SERVICE_URL/);
  assert.match(renderApi, /LOCAL_RENDER_BASE_URL/);
  assert.match(localRender, /ffmpeg/);
  for (const feature of ["captionsEnabled", "hookOverlay", "watermark", "logo", "loudnorm", "render-text-overlay"]) assert.ok((renderApi + localRender).includes(feature), `local render missing ${feature}`);
  assert.match(renderApi, /rendered_key/);
  assert.match(downloadApi, /content-disposition/i);
  assert.ok(logoApi.includes("image\\/(png|jpeg|webp)"));
});

test("personal workspace metadata, social card, and responsive styling are present", async () => {
  const [page, css, layout] = await Promise.all([source("app/page.tsx"), source("app/globals.css"), source("app/layout.tsx")]);
  assert.match(page, /PERSONAL CONTENT OS/);
  assert.match(css, /\.content-os-page/);
  assert.match(css, /@media\(max-width:720px\)/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(layout, /\/og-personal\.png/);
  await access(new URL("public/og-personal.png", root));
});

test("SaaS and marketplace features are excluded from personal navigation", async () => {
  const page = await source("app/page.tsx");
  const nav = page.slice(page.indexOf('<nav className="nav-list"'), page.indexOf('</nav>', page.indexOf('<nav className="nav-list"')));
  assert.doesNotMatch(nav, /Autopilot|Affiliate|Auto posting|Campaigns|Templates|Upgrade|Billing/);
});

test("account settings and authenticated sign-out remain wired", async () => {
  const [page, account, capabilities, notifications] = await Promise.all([source("app/page.tsx"), source("app/api/account/route.ts"), source("app/api/capabilities/route.ts"), source("app/api/notifications/route.ts")]);
  for (const feature of ["SettingsPage", "Owner workspace", "Sign out", "Save changes", "Settings-integrations".toLowerCase(), "HelpModal", "NotificationsModal", "scrollIntoView"]) assert.ok(page.toLowerCase().includes(feature.toLowerCase()));
  assert.match(account, /user_settings/);
  assert.match(account, /subscriptions/);
  assert.match(capabilities, /OPENAI_API_KEY/);
  assert.match(capabilities, /RENDER_SERVICE_URL/);
  assert.match(notifications, /UPDATE notifications SET read=1/);
});

test("published content, analytics, monetization, and AI caption are fully wired", async()=>{
  const [page,contentUi,contentApi,captionApi,ai,migration]=await Promise.all([source("app/page.tsx"),source("app/content-os.tsx"),source("app/api/content/route.ts"),source("app/api/clips/[id]/caption/route.ts"),source("lib/kliyu-ai.ts"),source("drizzle/0006_nosy_jean_grey.sql")]);
  for(const feature of ["Published","Analytics","Monetization"])assert.ok(page.includes(feature));
  for(const feature of ["Mark as Published","Update Performance","Content Analytics","Add Revenue","Revenue history"])assert.ok(contentUi.includes(feature),`missing ${feature}`);
  assert.match(contentApi,/INSERT INTO publications/);assert.match(contentApi,/UPDATE publications SET views/);assert.match(contentApi,/INSERT INTO revenue_entries/);
  assert.match(contentApi,/scheduled_at,published_at/);
  assert.match(ai,/kliyu_social_caption/);assert.match(captionApi,/post_hashtags/);assert.match(page,/Generate Caption/);assert.match(page,/Copy Caption/);
  assert.match(migration,/CREATE TABLE `revenue_entries`/);assert.match(migration,/post_caption/);assert.match(migration,/followers_gained/);
});
