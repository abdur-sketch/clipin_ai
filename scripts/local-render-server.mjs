#!/usr/bin/env node
import { createServer } from "node:http";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const port = Number(process.env.KLIYU_RENDER_PORT || 8789);
const sizes = { "9:16": [720, 1280], "1:1": [720, 720], "16:9": [1280, 720] };

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "ignore", "pipe"] });
    let error = "";
    child.stderr.on("data", (chunk) => { error += chunk.toString(); });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve() : reject(new Error(error || `${command} exited with ${code}`)));
  });
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
  if (request.method !== "POST" || request.url !== "/render") {
    response.writeHead(404).end();
    return;
  }

  const work = await mkdtemp(join(tmpdir(), "kliyu-render-"));
  try {
    const input = join(work, "source-video");
    const output = join(work, "clip.mp4");
    await writeFile(input, await receive(request));
    const start = Math.max(0, Number(request.headers["x-kliyu-start"] || 0));
    const end = Math.max(start + 0.1, Number(request.headers["x-kliyu-end"] || start + 30));
    const ratio = String(request.headers["x-kliyu-aspect-ratio"] || "9:16");
    const [width, height] = sizes[ratio] || sizes["9:16"];
    const filter = `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height}`;
    await run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-ss", String(start), "-i", input, "-t", String(end - start), "-vf", filter, "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-c:a", "aac", "-movflags", "+faststart", "-y", output]);
    const video = await readFile(output);
    response.writeHead(200, { "content-type": "video/mp4", "content-length": String(video.length), "cache-control": "no-store" });
    response.end(video);
  } catch (error) {
    response.writeHead(500, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: error instanceof Error ? error.message : "Render gagal" }));
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

server.listen(port, "127.0.0.1", () => process.stdout.write(`KLIYU local render listening on http://127.0.0.1:${port}\n`));
