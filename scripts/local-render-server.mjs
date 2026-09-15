#!/usr/bin/env node
import { createServer } from "node:http";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const port = Number(process.env.KLIYU_RENDER_PORT || 8789);
const overlayTool = process.env.KLIYU_OVERLAY_TOOL || ".local-ai/bin/render-text-overlay";
const sizes = { "9:16": [720, 1280], "1:1": [720, 720], "16:9": [1280, 720] };

function run(command, args, timeoutMs = 0) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "ignore", "pipe"] });
    let error = "";
    const timer = timeoutMs ? setTimeout(() => child.kill("SIGTERM"), timeoutMs) : null;
    child.stderr.on("data", (chunk) => { error += chunk.toString(); });
    child.on("error", reject);
    child.on("close", (code) => {
      if (timer) clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(error || `${command} dihentikan atau keluar dengan kode ${code}`));
    });
  });
}

async function makeTextOverlay(path, text, width, pointSize, style = "bold", fontFamily = "system", fontColor = "#FFFFFF", fontEffect = "outline", overlayHeight = 180) {
  await run(overlayTool, [path, String(Math.round(width * 0.86)), String(overlayHeight), String(pointSize), style, text, fontFamily, fontColor, fontEffect]);
}

function receive(request, limit = 2 * 1024 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) request.destroy(new Error("Video melebihi batas 2 GB"));
      else chunks.push(chunk);
    });
    request.on("end", () => resolve(Buffer.concat(chunks)));
    request.on("error", reject);
  });
}

const server = createServer(async (request, response) => {
  if (request.method === "GET" && request.url === "/health") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end('{"ok":true}');
    return;
  }
  if (request.method === "POST" && request.url === "/import") {
    const work = await mkdtemp(join(tmpdir(), "kliyu-import-"));
    try {
      const raw = await receive(request, 1024 * 1024);
      const input = JSON.parse(raw.toString());
      const sourceUrl = new URL(String(input.url || ""));
      if (!/^https?:$/.test(sourceUrl.protocol)) throw new Error("Link video harus menggunakan HTTP atau HTTPS");
      const outputTemplate = join(work, "import.%(ext)s");
      await run("yt-dlp", ["--no-playlist", "--max-filesize", "500M", "--concurrent-fragments", "4", "-f", "bv*[height<=480]+ba/b[height<=480]/b", "--merge-output-format", "mp4", "--remux-video", "mp4", "-o", outputTemplate, sourceUrl.toString()], 30 * 60 * 1000);
      const filename = (await readdir(work)).find((name) => name.startsWith("import."));
      if (!filename) throw new Error("Importer tidak menghasilkan video");
      const video = await readFile(join(work, filename));
      response.writeHead(200, { "content-type": "video/mp4", "content-length": String(video.length), "cache-control": "no-store" });
      response.end(video);
    } catch (error) {
      response.writeHead(422, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: error instanceof Error ? error.message : "Impor video gagal" }));
    } finally {
      await rm(work, { recursive: true, force: true });
    }
    return;
  }
  if (request.method !== "POST" || request.url !== "/render") {
    response.writeHead(404).end();
    return;
  }

  const work = await mkdtemp(join(tmpdir(), "kliyu-render-"));
  try {
    const input = join(work, "source-video");
    const output = join(work, "clip.mp4");
    const raw = await receive(request);
    const formRequest = new Request("http://127.0.0.1/render", { method: "POST", headers: request.headers, body: raw });
    const form = await formRequest.formData();
    const videoFile = form.get("video");
    if (!videoFile || typeof videoFile === "string") throw new Error("Video sumber tidak tersedia");
    await writeFile(input, Buffer.from(await videoFile.arrayBuffer()));
    const config = JSON.parse(String(form.get("config") || "{}"));
    const start = Math.max(0, Number(config.start || 0));
    const end = Math.max(start + 0.1, Number(config.end || start + 30));
    const ratio = String(config.aspectRatio || "9:16");
    const [width, height] = sizes[ratio] || sizes["9:16"];
    const imageInputs = [];
    const overlays = [];

    if (config.hookOverlay && String(config.hook || "").trim()) {
      const path = join(work, "hook.png");
      const fullHook = String(config.hook).trim();
      const displayHook = fullHook.length > 100 ? `${fullHook.slice(0, 97).replace(/\s+\S*$/, "")}...` : fullHook;
      await makeTextOverlay(path, displayHook, width, Math.min(44, Math.max(28, Number(config.fontSize || 48))), "bold", String(config.fontFamily || "system"), String(config.fontColor || "#FFFFFF"), String(config.titleEffect || "background"), 280);
      imageInputs.push(path);
      overlays.push({ y: Math.round(height * 0.12), from: 0, to: Math.min(5, end - start) });
    }
    if (config.captionsEnabled) {
      const segments = Array.isArray(config.subtitles) ? config.subtitles.filter((segment) => Number(segment.end) > start && Number(segment.start) < end && String(segment.text || "").trim()).slice(0, 40) : [];
      for (const [index, segment] of segments.entries()) {
        const path = join(work, `subtitle-${index}.png`);
        await makeTextOverlay(path, String(segment.text).trim(), width, Math.min(60, Math.max(24, Number(config.fontSize || 48))), String(config.style || "bold"), String(config.fontFamily || "system"), String(config.fontColor || "#FFFFFF"), String(config.fontEffect || "outline"));
        imageInputs.push(path);
        overlays.push({ y: Math.round(height * 0.72), from: Math.max(0, Number(segment.start) - start), to: Math.min(end - start, Number(segment.end) - start) });
      }
    }
    if (config.watermark) {
      const path = join(work, "watermark.png");
      await makeTextOverlay(path, "KLIYU.", width, 24, "clean");
      imageInputs.push(path);
      overlays.push({ x: Math.round(width * 0.04), y: Math.round(height * 0.04), from: 0, to: end - start });
    }
    const logoFile = form.get("logo");
    if (logoFile && typeof logoFile !== "string") {
      const path = join(work, "logo-image");
      await writeFile(path, Buffer.from(await logoFile.arrayBuffer()));
      imageInputs.push(path);
      overlays.push({ x: Math.round(width * 0.78), y: Math.round(height * 0.05), from: 0, to: end - start, logo: true });
    }

    const args = ["-hide_banner", "-loglevel", "error", "-ss", String(start), "-i", input];
    for (const path of imageInputs) args.push("-loop", "1", "-i", path);
    const filters = [`[0:v]scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height}[v0]`];
    overlays.forEach((overlay, index) => {
      const inputIndex = index + 1;
      const sourceLabel = overlay.logo ? `logo${index}` : `${inputIndex}:v`;
      if (overlay.logo) filters.push(`[${inputIndex}:v]scale=${Math.round(width * 0.16)}:-1[${sourceLabel}]`);
      const x = overlay.x ?? "(W-w)/2";
      filters.push(`[v${index}][${sourceLabel}]overlay=${x}:${overlay.y}:enable='between(t,${overlay.from},${overlay.to})'[v${index + 1}]`);
    });
    args.push("-t", String(end - start), "-filter_complex", filters.join(";"), "-map", overlays.length ? `[v${overlays.length}]` : "[v0]", "-map", "0:a?", "-af", "loudnorm", "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-c:a", "aac", "-movflags", "+faststart", "-y", output);
    await run("ffmpeg", args);
    const video = await readFile(output);
    response.writeHead(200, { "content-type": "video/mp4", "content-length": String(video.length), "cache-control": "no-store" });
    response.end(video);
  } catch (error) {
    process.stderr.write(`Render gagal: ${error instanceof Error ? error.stack || error.message : String(error)}\n`);
    response.writeHead(500, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: error instanceof Error ? error.message : "Render gagal" }));
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

server.listen(port, "127.0.0.1", () => process.stdout.write(`KLIYU local render listening on http://127.0.0.1:${port}\n`));
