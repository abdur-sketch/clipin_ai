import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");

test("build contains the KLIYU MVP product", async () => {
  const [page, layout, worker] = await Promise.all([
    source("app/page.tsx"),
    source("app/layout.tsx"),
    source("dist/server/index.js"),
  ]);
  assert.match(layout, /KLIYU — Create Your Moment/);
  for (const feature of [
    "Dashboard",
    "Projects",
    "AI Clips",
    "Studio",
    "Published",
    "Analytics",
    "Monetization",
    "New project",
  ])
    assert.ok(page.includes(feature), `missing ${feature}`);
  assert.match(worker, /api\/projects/);
  assert.doesNotMatch(
    page + layout,
    /codex-preview|Your site is taking shape|Building your site/,
  );
});

test("local development prevents recursive Vite websocket error overlays", async () => {
  const [viteConfig, packageJson] = await Promise.all([
    source("vite.config.ts"),
    source("package.json"),
  ]);
  assert.match(viteConfig, /forwardConsole:\s*false/);
  assert.match(viteConfig, /strictPort:\s*true/);
  assert.match(packageJson, /start-local-ai\.sh/);
});

test("Firebase Firestore is securely connected for core creator data", async () => {
  const [firebase, server, projects, processApi, capabilities, page, rules] =
    await Promise.all([
      source("lib/firebase.ts"),
      source("lib/server.ts"),
      source("app/api/projects/route.ts"),
      source("app/api/projects/[id]/process/route.ts"),
      source("app/api/capabilities/route.ts"),
      source("app/page.tsx"),
      source("firestore.rules"),
    ]);
  assert.match(firebase, /FIREBASE_SERVICE_ACCOUNT_JSON/);
  assert.match(firebase, /RSASSA-PKCS1-v1_5/);
  assert.match(firebase, /firestore\.googleapis\.com/);
  assert.match(server, /syncD1Record/);
  assert.match(projects, /firebaseList/);
  assert.match(processApi, /firebaseSet\("transcripts"/);
  assert.match(capabilities, /firebaseHealthcheck/);
  assert.match(page, /Firebase Firestore/);
  assert.match(rules, /allow read, write: if false/);
});

test("new project accepts original files and honest direct video links", async () => {
  const [page, projectsApi, processApi] = await Promise.all([
    source("app/page.tsx"),
    source("app/api/projects/route.ts"),
    source("app/api/projects/[id]/process/route.ts"),
  ]);
  assert.match(
    page,
    /onStart:\s*\(source\?: File \| string,\s*projectName\?: string\)/,
  );
  assert.match(page, /Project Name/);
  assert.match(page, /accept="video\/mp4,video\/quicktime"/);
  assert.match(page, /Link video YouTube, TikTok, Instagram/);
  assert.match(page, /MP4\/WebM publik/);
  assert.doesNotMatch(page, /Gunakan video contoh/);
  assert.match(projectsApi, /Link video tidak valid/);
  assert.match(processApi, /contentType\.startsWith\("video\/"\)/);
  assert.match(processApi, /\/import/);
  assert.match(processApi, /LOCAL_RENDER_BASE_URL/);
  assert.match(processApi, /512 \* 1024 \* 1024/);
  assert.match(await source("scripts/local-render-server.mjs"), /height<=480/);
  assert.match(await source("scripts/local-render-server.mjs"), /500M/);
});

test("real OpenAI and local AI pipelines replace fake output", async () => {
  const [processApi, ai] = await Promise.all([
    source("app/api/projects/[id]/process/route.ts"),
    source("lib/kliyu-ai.ts"),
  ]);
  assert.match(processApi, /api\.openai\.com\/v1\/audio\/transcriptions/);
  assert.match(processApi, /openai-whisper/);
  assert.match(ai, /api\.openai\.com\/v1\/responses/);
  assert.match(ai, /json_schema/);
  assert.match(processApi, /WHISPER_BASE_URL/);
  assert.match(processApi, /whisper\.cpp-local/);
  assert.match(ai, /OLLAMA|Ollama|api\/generate/);
  for (const criterion of [
    "Hook Strength",
    "Clarity",
    "Emotion",
    "Standalone Value",
    "Shareability",
    "Curiosity",
  ])
    assert.ok(ai.includes(criterion));
  assert.doesNotMatch(processApi + ai, /demoMoments|clipin-demo/);
});

test("clip workflow includes filters, real preview, typography controls, Studio, render, and MP4 download", async () => {
  const [
    page,
    clipApi,
    renderApi,
    localRender,
    overlay,
    downloadApi,
    mediaApi,
    logoApi,
  ] = await Promise.all([
    source("app/page.tsx"),
    source("app/api/clips/[id]/route.ts"),
    source("app/api/clips/[id]/render/route.ts"),
    source("scripts/local-render-server.mjs"),
    source("scripts/render-text-overlay.swift"),
    source("app/api/clips/[id]/download/route.ts"),
    source("app/api/clips/[id]/media/route.ts"),
    source("app/api/clips/[id]/logo/route.ts"),
  ]);
  for (const feature of [
    'filter === "hot"',
    'filter === "ready"',
    'filter === "rendered"',
    "ClipPreview",
    "ClipEditor",
    "Automatic captions",
    "Face tracking",
    "Hook overlay",
    "KLIYU watermark",
    "Karaoke",
    "Export MP4",
  ])
    assert.ok(page.includes(feature), `missing ${feature}`);
  for (const ratio of ["9:16", "1:1", "16:9"]) assert.ok(page.includes(ratio));
  assert.match(clipApi, /status='ready',rendered_key=NULL/);
  assert.match(renderApi, /RENDER_SERVICE_URL/);
  assert.match(renderApi, /LOCAL_RENDER_BASE_URL/);
  assert.match(localRender, /ffmpeg/);
  for (const feature of [
    "captionsEnabled",
    "hookOverlay",
    "watermark",
    "logo",
    "loudnorm",
    "render-text-overlay",
  ])
    assert.ok(
      (renderApi + localRender).includes(feature),
      `local render missing ${feature}`,
    );
  assert.match(renderApi, /rendered_key/);
  assert.match(downloadApi, /content-disposition/i);
  assert.match(page, /real-clip-video/);
  assert.match(page, /clip-card-video/);
  assert.match(page, /studio-source-video/);
  assert.match(page, /media\?source=1/);
  for (const feature of [
    "Jenis font",
    "Warna font",
    "Efek font",
    "Rounded",
    "Editorial Serif",
    "Shadow",
    "Outline",
    "Glow",
  ])
    assert.ok(page.includes(feature), `typography control missing ${feature}`);
  assert.match(page, /Efek teks judul \/ hook/);
  assert.match(page, /titleEffect/);
  for (const field of ["fontFamily", "fontColor", "fontEffect"])
    assert.ok(
      (page + clipApi + renderApi + localRender).includes(field),
      `font pipeline missing ${field}`,
    );
  assert.match(overlay, /selectedFont/);
  assert.match(overlay, /fontHex/);
  assert.match(page, /\/media/);
  assert.match(mediaApi, /content-range/);
  assert.match(mediaApi, /status:206/);
  assert.ok(logoApi.includes("image\\/(png|jpeg|webp)"));
});

test("advanced Studio tools persist and reach the native render pipeline", async () => {
  const [page, clipApi, renderApi, renderer, overlay, faceTool, migration] =
    await Promise.all([
      source("app/page.tsx"),
      source("app/api/clips/[id]/route.ts"),
      source("app/api/clips/[id]/render/route.ts"),
      source("scripts/local-render-server.mjs"),
      source("scripts/render-text-overlay.swift"),
      source("scripts/detect-face-center.swift"),
      source("drizzle/0009_worried_king_cobra.sql"),
    ]);
  for (const feature of [
    "Animasi judul",
    "Posisi judul",
    "Posisi subtitle",
    "Preset visual",
    "SUBTITLE EDITOR",
    "Smart cleanup",
    "antrean lokal",
    "Batalkan",
  ])
    assert.ok(page.includes(feature), `advanced editor missing ${feature}`);
  for (const field of [
    "titleAnimation",
    "titlePosition",
    "captionPosition",
    "smartCleanup",
    "subtitles",
  ])
    assert.ok(
      (page + clipApi + renderApi + renderer).includes(field),
      `advanced pipeline missing ${field}`,
    );
  assert.match(renderer, /karaoke:/);
  assert.match(overlay, /karaokeIndex/);
  assert.match(faceTool, /VNDetectFaceRectanglesRequest/);
  assert.match(renderer, /faceTracking/);
  assert.match(renderApi, /export async function DELETE/);
  assert.match(migration, /title_animation/);
});

test("production editor upgrades include real progress, word timing, cleanup, history, and project management", async () => {
  const [
    page,
    processApi,
    renderApi,
    renderer,
    faceTool,
    projectsApi,
    contentUi,
    contentApi,
    server,
    migration,
  ] = await Promise.all([
    source("app/page.tsx"),
    source("app/api/projects/[id]/process/route.ts"),
    source("app/api/clips/[id]/render/route.ts"),
    source("scripts/local-render-server.mjs"),
    source("scripts/detect-face-center.swift"),
    source("app/api/projects/[id]/route.ts"),
    source("app/content-os.tsx"),
    source("app/api/content/route.ts"),
    source("lib/server.ts"),
    source("drizzle/0010_clean_the_leader.sql"),
  ]);
  for (const feature of [
    "Undo",
    "Redo",
    "Safe area",
    "Zoom",
    "Duplicate project",
    "Rename project",
    "Delete project",
  ])
    assert.ok(page.includes(feature), `missing ${feature}`);
  assert.match(processApi, /timestamp_granularities/);
  assert.match(processApi, /inferredWords/);
  assert.match(renderer, /timedWords/);
  assert.match(renderer, /silencedetect/);
  assert.match(renderer, /out_time_ms/);
  assert.match(renderer, /\/progress\//);
  assert.match(faceTool, /joined\(separator: ";"\)/);
  assert.match(renderApi, /export async function GET/);
  assert.match(renderApi, /render_progress/);
  assert.match(projectsApi, /duplicate/);
  assert.match(contentUi, /Publish directly/);
  assert.match(contentApi, /PUBLISH_SERVICE_URL/);
  assert.match(server, /guardMutation/);
  assert.match(migration, /render_job_id/);
});

test("advanced creator tools include transcript cuts, speaker colors, B-roll, audio presets, thumbnail, translation, and Brand Kit", async () => {
  const [page, renderer, renderApi, migration, translation] = await Promise.all(
    [
      source("app/page.tsx"),
      source("scripts/local-render-server.mjs"),
      source("app/api/clips/[id]/render/route.ts"),
      source("drizzle/0011_green_xorn.sql"),
      source("app/api/clips/[id]/translate/route.ts"),
    ],
  );
  assert.match(page, /Transcript-based cuts/);
  assert.match(page, /Warna subtitle per speaker/);
  assert.match(page, /kliyu-brand-kit/);
  assert.match(page, /Smart Thumbnail/);
  assert.match(page, /FITUR CREATOR BARU/);
  assert.match(page, /Studio Lengkap/);
  assert.match(renderer, /aselect=/);
  assert.match(renderer, /audioPreset/);
  assert.match(renderer, /brollFile/);
  assert.match(renderApi, /clip\.broll_key/);
  assert.match(migration, /transcript_cut/);
  assert.match(translation, /translateSubtitleText/);
});

test("personal workspace metadata, social card, and responsive styling are present", async () => {
  const [page, css, layout] = await Promise.all([
    source("app/page.tsx"),
    source("app/globals.css"),
    source("app/layout.tsx"),
  ]);
  assert.match(page, /PERSONAL CONTENT OS/);
  assert.match(css, /\.content-os-page/);
  assert.match(css, /@media\(max-width:720px\)/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(layout, /\/og-personal\.png/);
  await access(new URL("public/og-personal.png", root));
});

test("SaaS and marketplace features are excluded from personal navigation", async () => {
  const page = await source("app/page.tsx");
  const nav = page.slice(
    page.indexOf('<nav className="nav-list"'),
    page.indexOf("</nav>", page.indexOf('<nav className="nav-list"')),
  );
  assert.doesNotMatch(
    nav,
    /Autopilot|Affiliate|Auto posting|Campaigns|Templates|Upgrade|Billing/,
  );
});

test("account settings and authenticated sign-out remain wired", async () => {
  const [page, account, capabilities, notifications] = await Promise.all([
    source("app/page.tsx"),
    source("app/api/account/route.ts"),
    source("app/api/capabilities/route.ts"),
    source("app/api/notifications/route.ts"),
  ]);
  for (const feature of [
    "SettingsPage",
    "Owner workspace",
    "Sign out",
    "Save changes",
    "Settings-integrations".toLowerCase(),
    "HelpModal",
    "NotificationsModal",
    "scrollIntoView",
  ])
    assert.ok(page.toLowerCase().includes(feature.toLowerCase()));
  assert.match(account, /user_settings/);
  assert.match(account, /subscriptions/);
  assert.match(capabilities, /OPENAI_API_KEY/);
  assert.match(capabilities, /RENDER_SERVICE_URL/);
  assert.match(notifications, /UPDATE notifications SET read=1/);
});

test("published content, analytics, monetization, and AI caption are fully wired", async () => {
  const [page, contentUi, contentApi, captionApi, ai, migration] =
    await Promise.all([
      source("app/page.tsx"),
      source("app/content-os.tsx"),
      source("app/api/content/route.ts"),
      source("app/api/clips/[id]/caption/route.ts"),
      source("lib/kliyu-ai.ts"),
      source("drizzle/0006_nosy_jean_grey.sql"),
    ]);
  for (const feature of ["Published", "Analytics", "Monetization"])
    assert.ok(page.includes(feature));
  for (const feature of [
    "Mark as Published",
    "Update Performance",
    "Content Analytics",
    "Add Revenue",
    "Revenue history",
  ])
    assert.ok(contentUi.includes(feature), `missing ${feature}`);
  assert.match(contentApi, /INSERT INTO publications/);
  assert.match(contentApi, /UPDATE publications SET views/);
  assert.match(contentApi, /INSERT INTO revenue_entries/);
  assert.match(contentApi, /scheduled_at,published_at/);
  assert.match(ai, /kliyu_social_caption/);
  assert.match(captionApi, /post_hashtags/);
  assert.match(page, /Generate Caption/);
  assert.match(page, /Copy Caption/);
  assert.match(migration, /CREATE TABLE `revenue_entries`/);
  assert.match(migration, /post_caption/);
  assert.match(migration, /followers_gained/);
});
