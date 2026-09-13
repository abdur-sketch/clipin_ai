import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("build contains the complete CLIPIN AI product", async () => {
  const [page, layout, worker] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/layout.tsx", root), "utf8"),
    readFile(new URL("dist/server/index.js", root), "utf8"),
  ]);
  assert.match(layout, /CLIPIN AI — Long Video to Viral Clips/);
  assert.match(layout, /metadataBase/);
  assert.match(page, /Ubah video panjang menjadi/);
  assert.match(page, /AI VIDEO REPURPOSING/);
  assert.match(page, /Podcast Bisnis: Mulai dari Nol/);
  assert.match(page, /New Project/);
  assert.match(page, /My Clips/);
  assert.match(page, /Projects/);
  assert.match(worker, /api\/projects/);
  assert.doesNotMatch(page + layout, /codex-preview|Your site is taking shape|Building your site/);
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

test("autopilot covers monitoring, approval, posting, analytics, and affiliate", async () => {
  const [page, automation, schema, migration] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/api/automation/route.ts", root), "utf8"),
    readFile(new URL("db/schema.ts", root), "utf8"),
    readFile(new URL("drizzle/0001_large_martin_li.sql", root), "utf8"),
  ]);
  for (const feature of ["Channel Watch","Full autopilot","Approval queue","Auto posting","Performance","Affiliate","save-rules","connect-channel"]) assert.ok((page+automation).toLowerCase().includes(feature.toLowerCase()),`missing ${feature}`);
  for (const table of ["channels","postingRules","publications","notifications","referrals"]) assert.match(schema,new RegExp(table));
  assert.match(migration,/CREATE TABLE `channels`/);
  assert.match(migration,/CREATE TABLE `publications`/);
});
