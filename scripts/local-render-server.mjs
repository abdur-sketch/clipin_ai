#!/usr/bin/env node
import { createServer } from "node:http";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const port = Number(process.env.KLIYU_RENDER_PORT || 8789);
const overlayTool =
  process.env.KLIYU_OVERLAY_TOOL || ".local-ai/bin/render-text-overlay";
const faceTool =
  process.env.KLIYU_FACE_TOOL || ".local-ai/bin/detect-face-center";
const sizes = { "9:16": [720, 1280], "1:1": [720, 720], "16:9": [1280, 720] };
const renderJobs = new Map();
const renderProcesses = new Map();

function run(command, args, timeoutMs = 0, job) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "ignore", "pipe"] });
    if (job) renderProcesses.set(job.id, child);
    let error = "";
    const timer = timeoutMs
      ? setTimeout(() => child.kill("SIGTERM"), timeoutMs)
      : null;
    child.stderr.on("data", (chunk) => {
      const value = chunk.toString();
      error += value;
      if (job && !job.cancelled) {
        const matches = [...value.matchAll(/out_time_ms=(\d+)/g)];
        const microseconds = Number(matches.at(-1)?.[1] || 0);
        if (microseconds) {
          job.progress = Math.min(
            98,
            Math.max(
              job.progress,
              Math.round((microseconds / 1_000_000 / job.duration) * 100),
            ),
          );
          job.status = "rendering";
        }
      }
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (job) renderProcesses.delete(job.id);
      if (timer) clearTimeout(timer);
      if (code === 0) resolve();
      else
        reject(
          new Error(
            error || `${command} dihentikan atau keluar dengan kode ${code}`,
          ),
        );
    });
  });
}

function runOutput(command, args, timeoutMs = 0) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "ignore"] });
    let output = "";
    const timer = timeoutMs
      ? setTimeout(() => child.kill("SIGTERM"), timeoutMs)
      : null;
    child.stdout.on("data", (chunk) => {
      output += chunk.toString();
    });
    child.on("error", () => resolve(""));
    child.on("close", () => {
      if (timer) clearTimeout(timer);
      resolve(output.trim());
    });
  });
}

function runErrorOutput(command, args, timeoutMs = 0) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: ["ignore", "ignore", "pipe"] });
    let output = "";
    const timer = timeoutMs
      ? setTimeout(() => child.kill("SIGTERM"), timeoutMs)
      : null;
    child.stderr.on("data", (chunk) => {
      output += chunk.toString();
    });
    child.on("error", () => resolve(""));
    child.on("close", () => {
      if (timer) clearTimeout(timer);
      resolve(output);
    });
  });
}

async function cleanSilenceBounds(input, start, end) {
  const report = await runErrorOutput(
    "ffmpeg",
    [
      "-hide_banner",
      "-ss",
      String(start),
      "-t",
      String(end - start),
      "-i",
      input,
      "-af",
      "silencedetect=noise=-38dB:d=0.35",
      "-f",
      "null",
      "-",
    ],
    45000,
  );
  const starts = [...report.matchAll(/silence_start: ([\d.]+)/g)].map((item) =>
    Number(item[1]),
  );
  const ends = [...report.matchAll(/silence_end: ([\d.]+)/g)].map((item) =>
    Number(item[1]),
  );
  let cleanedStart = start,
    cleanedEnd = end;
  if (
    starts[0] !== undefined &&
    starts[0] < 0.15 &&
    ends[0] > 0.1 &&
    ends[0] < 2.5
  )
    cleanedStart += ends[0];
  const lastStart = starts.at(-1),
    duration = end - start;
  if (lastStart !== undefined && lastStart > duration - 2.5)
    cleanedEnd = start + lastStart;
  return cleanedEnd - cleanedStart >= 3
    ? [cleanedStart, cleanedEnd]
    : [start, end];
}

async function makeTextOverlay(
  path,
  text,
  width,
  pointSize,
  style = "bold",
  fontFamily = "system",
  fontColor = "#FFFFFF",
  fontEffect = "outline",
  overlayHeight = 180,
) {
  await run(overlayTool, [
    path,
    String(Math.round(width * 0.86)),
    String(overlayHeight),
    String(pointSize),
    style,
    text,
    fontFamily,
    fontColor,
    fontEffect,
  ]);
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
  if (request.url?.startsWith("/progress/")) {
    const id = decodeURIComponent(request.url.slice("/progress/".length));
    const job = renderJobs.get(id);
    if (!job) {
      response.writeHead(404, { "content-type": "application/json" });
      response.end('{"error":"Job tidak ditemukan"}');
      return;
    }
    if (request.method === "DELETE") {
      renderProcesses.get(id)?.kill("SIGTERM");
      job.cancelled = true;
      job.status = "cancelled";
      job.error = "Render dibatalkan";
    }
    response.writeHead(200, {
      "content-type": "application/json",
      "cache-control": "no-store",
    });
    response.end(JSON.stringify(job));
    return;
  }
  if (request.method === "POST" && request.url === "/import") {
    const work = await mkdtemp(join(tmpdir(), "kliyu-import-"));
    try {
      const raw = await receive(request, 1024 * 1024);
      const input = JSON.parse(raw.toString());
      const sourceUrl = new URL(String(input.url || ""));
      if (!/^https?:$/.test(sourceUrl.protocol))
        throw new Error("Link video harus menggunakan HTTP atau HTTPS");
      const outputTemplate = join(work, "import.%(ext)s");
      await run(
        "yt-dlp",
        [
          "--no-playlist",
          "--max-filesize",
          "500M",
          "--concurrent-fragments",
          "4",
          "-f",
          "bv*[height<=480]+ba/b[height<=480]/b",
          "--merge-output-format",
          "mp4",
          "--remux-video",
          "mp4",
          "-o",
          outputTemplate,
          sourceUrl.toString(),
        ],
        30 * 60 * 1000,
      );
      const filename = (await readdir(work)).find((name) =>
        name.startsWith("import."),
      );
      if (!filename) throw new Error("Importer tidak menghasilkan video");
      const video = await readFile(join(work, filename));
      response.writeHead(200, {
        "content-type": "video/mp4",
        "content-length": String(video.length),
        "cache-control": "no-store",
      });
      response.end(video);
    } catch (error) {
      response.writeHead(422, { "content-type": "application/json" });
      response.end(
        JSON.stringify({
          error: error instanceof Error ? error.message : "Impor video gagal",
        }),
      );
    } finally {
      await rm(work, { recursive: true, force: true });
    }
    return;
  }
  if (request.method === "POST" && request.url === "/thumbnail") {
    const work = await mkdtemp(join(tmpdir(), "kliyu-thumbnail-"));
    try {
      const raw = await receive(request);
      const formRequest = new Request("http://127.0.0.1/thumbnail", {
        method: "POST",
        headers: request.headers,
        body: raw,
      });
      const form = await formRequest.formData();
      const videoFile = form.get("video");
      if (!videoFile || typeof videoFile === "string")
        throw new Error("Video sumber tidak tersedia");
      const input = join(work, "source-video");
      const output = join(work, "thumbnail.jpg");
      const config = JSON.parse(String(form.get("config") || "{}"));
      await writeFile(input, Buffer.from(await videoFile.arrayBuffer()));
      const ratio = String(config.aspectRatio || "9:16");
      const [width, height] = sizes[ratio] || sizes["9:16"];
      await run("ffmpeg", [
        "-hide_banner",
        "-loglevel",
        "error",
        "-ss",
        String(Math.max(0, Number(config.timestamp || 0))),
        "-i",
        input,
        "-frames:v",
        "1",
        "-vf",
        `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height}`,
        "-q:v",
        "2",
        "-y",
        output,
      ]);
      const image = await readFile(output);
      response.writeHead(200, {
        "content-type": "image/jpeg",
        "content-length": String(image.length),
        "cache-control": "no-store",
      });
      response.end(image);
    } catch (error) {
      response.writeHead(500, { "content-type": "application/json" });
      response.end(
        JSON.stringify({
          error:
            error instanceof Error ? error.message : "Thumbnail gagal dibuat",
        }),
      );
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
  let activeJob;
  try {
    const input = join(work, "source-video");
    const output = join(work, "clip.mp4");
    const raw = await receive(request);
    const formRequest = new Request("http://127.0.0.1/render", {
      method: "POST",
      headers: request.headers,
      body: raw,
    });
    const form = await formRequest.formData();
    const videoFile = form.get("video");
    if (!videoFile || typeof videoFile === "string")
      throw new Error("Video sumber tidak tersedia");
    await writeFile(input, Buffer.from(await videoFile.arrayBuffer()));
    const config = JSON.parse(String(form.get("config") || "{}"));
    let start = Math.max(0, Number(config.start || 0));
    let end = Math.max(start + 0.1, Number(config.end || start + 30));
    if (config.smartCleanup)
      [start, end] = await cleanSilenceBounds(input, start, end);
    const removalRanges =
      config.transcriptCut && Array.isArray(config.subtitles)
        ? config.subtitles
            .filter((segment) => segment.removed)
            .map((segment) => [
              Math.max(start, Number(segment.start)),
              Math.min(end, Number(segment.end)),
            ])
            .filter(
              ([from, to]) =>
                Number.isFinite(from) && Number.isFinite(to) && to > from,
            )
            .sort((a, b) => a[0] - b[0])
        : [];
    const removedDuration = removalRanges.reduce(
      (total, [from, to]) => total + (to - from),
      0,
    );
    const outputDuration = Math.max(0.1, end - start - removedDuration);
    const outputTime = (absoluteTime) =>
      Math.max(
        0,
        absoluteTime -
          start -
          removalRanges.reduce(
            (total, [from, to]) =>
              total + Math.max(0, Math.min(absoluteTime, to) - from),
            0,
          ),
      );
    activeJob = {
      id: String(config.renderJobId || crypto.randomUUID()),
      progress: 1,
      status: "preparing",
      error: "",
      duration: outputDuration,
    };
    renderJobs.set(activeJob.id, activeJob);
    const ratio = String(config.aspectRatio || "9:16");
    const [width, height] = sizes[ratio] || sizes["9:16"];
    const imageInputs = [];
    const overlays = [];
    let focusX = 0.5,
      focusY = 0.5,
      faceTrack = [];
    if (config.faceTracking && ratio !== "16:9") {
      const detected = await runOutput(
        faceTool,
        [input, String(start), String(end), "7"],
        45000,
      );
      faceTrack = detected
        .split(";")
        .map((sample) => sample.split(",").map(Number))
        .filter(
          (sample) => sample.length === 3 && sample.every(Number.isFinite),
        );
      if (faceTrack.length) {
        focusX = Math.min(0.85, Math.max(0.15, faceTrack[0][1]));
        focusY = Math.min(0.8, Math.max(0.2, faceTrack[0][2]));
      } else {
        const [x, y] = detected.split(",").map(Number);
        if (Number.isFinite(x) && Number.isFinite(y)) {
          focusX = x;
          focusY = y;
        }
      }
    }

    if (config.hookOverlay && String(config.hook || "").trim()) {
      const path = join(work, "hook.png");
      const fullHook = String(config.hook).trim();
      const displayHook =
        fullHook.length > 100
          ? `${fullHook.slice(0, 97).replace(/\s+\S*$/, "")}...`
          : fullHook;
      await makeTextOverlay(
        path,
        displayHook,
        width,
        Math.min(44, Math.max(28, Number(config.fontSize || 48))),
        "bold",
        String(config.fontFamily || "system"),
        String(config.fontColor || "#FFFFFF"),
        String(config.titleEffect || "background"),
        280,
      );
      imageInputs.push(path);
      const titleY =
        config.titlePosition === "center"
          ? Math.round(height * 0.42)
          : config.titlePosition === "bottom"
            ? Math.round(height * 0.72)
            : Math.round(height * 0.12);
      overlays.push({
        y: titleY,
        from: 0,
        to: Math.min(5, end - start),
        animation: String(config.titleAnimation || "fade"),
      });
    }
    if (config.captionsEnabled) {
      const segments = Array.isArray(config.subtitles)
        ? config.subtitles
            .filter(
              (segment) =>
                !segment.removed &&
                Number(segment.end) > start &&
                Number(segment.start) < end &&
                String(segment.text || "").trim(),
            )
            .slice(0, 24)
        : [];
      const captionY =
        config.captionPosition === "top"
          ? Math.round(height * 0.22)
          : config.captionPosition === "center"
            ? Math.round(height * 0.48)
            : Math.round(height * 0.72);
      let imageIndex = 0;
      for (const segment of segments) {
        let text = String(segment.text).trim();
        if (config.smartCleanup)
          text =
            text
              .replace(
                /^(?:e+|eh+|em+|um+|anu|apa namanya|jadi)\b[,.]?\s*/i,
                "",
              )
              .trim() || text;
        let words = text.match(/\S+/g) || [];
        let timedWords = Array.isArray(segment.words)
          ? segment.words.filter(
              (word) =>
                Number(word.end) > start &&
                Number(word.start) < end &&
                String(word.word || "").trim(),
            )
          : [];
        if (words.length > 16) {
          text = words.slice(0, 16).join(" ");
          words = text.match(/\S+/g) || [];
          timedWords = timedWords.slice(0, 16);
        }
        const karaoke =
          String(config.style || "").toLowerCase() === "karaoke" &&
          words.length > 1;
        const variants = karaoke
          ? words.map((_, wordIndex) => wordIndex)
          : [-1];
        for (const wordIndex of variants) {
          const path = join(work, `subtitle-${imageIndex++}.png`);
          const speakerPalette = ["#C9FF45", "#69E8FF", "#FFE066", "#FF6B9B"];
          const speakerName = String(segment.speaker || "Speaker 1");
          const speakerColor =
            speakerPalette[
              [...speakerName].reduce(
                (total, char) => total + char.charCodeAt(0),
                0,
              ) % speakerPalette.length
            ];
          await makeTextOverlay(
            path,
            text,
            width,
            Math.min(60, Math.max(24, Number(config.fontSize || 48))),
            karaoke ? `karaoke:${wordIndex}` : String(config.style || "bold"),
            String(config.fontFamily || "system"),
            config.speakerColors
              ? speakerColor
              : String(config.fontColor || "#FFFFFF"),
            String(config.fontEffect || "outline"),
          );
          imageInputs.push(path);
          const segmentFrom = outputTime(
            Math.max(start, Number(segment.start)),
          );
          const segmentTo = Math.min(
            outputDuration,
            outputTime(Math.min(end, Number(segment.end))),
          );
          const wordDuration =
            (segmentTo - segmentFrom) / Math.max(1, words.length);
          const timedWord = timedWords[wordIndex];
          overlays.push({
            y: captionY,
            from: karaoke
              ? timedWord
                ? outputTime(Math.max(start, Number(timedWord.start)))
                : segmentFrom + wordIndex * wordDuration
              : segmentFrom,
            to: karaoke
              ? timedWord
                ? Math.min(outputDuration, outputTime(Number(timedWord.end)))
                : segmentFrom + (wordIndex + 1) * wordDuration
              : segmentTo,
          });
        }
      }
    }
    if (config.watermark) {
      const path = join(work, "watermark.png");
      await makeTextOverlay(path, "KLIYU.", width, 24, "clean");
      imageInputs.push(path);
      overlays.push({
        x: Math.round(width * 0.04),
        y: Math.round(height * 0.04),
        from: 0,
        to: outputDuration,
      });
    }
    const logoFile = form.get("logo");
    if (logoFile && typeof logoFile !== "string") {
      const path = join(work, "logo-image");
      await writeFile(path, Buffer.from(await logoFile.arrayBuffer()));
      imageInputs.push(path);
      overlays.push({
        x: Math.round(width * 0.78),
        y: Math.round(height * 0.05),
        from: 0,
        to: outputDuration,
        logo: true,
      });
    }
    const brollFile = form.get("broll");
    if (brollFile && typeof brollFile !== "string") {
      const path = join(work, "broll-image");
      await writeFile(path, Buffer.from(await brollFile.arrayBuffer()));
      imageInputs.push(path);
      const from = Math.min(
        Math.max(0, Number(config.brollStart || 2)),
        Math.max(0, outputDuration - 0.5),
      );
      overlays.push({
        y: 0,
        from,
        to: Math.min(outputDuration, from + 3.5),
        broll: true,
      });
    }

    const args = [
      "-hide_banner",
      "-loglevel",
      "error",
      "-ss",
      String(start),
      "-t",
      String(end - start),
      "-i",
      input,
    ];
    for (const path of imageInputs) args.push("-loop", "1", "-i", path);
    function tracked(axis) {
      if (faceTrack.length < 2)
        return axis === 1 ? focusX.toFixed(4) : focusY.toFixed(4);
      let expression = Number(faceTrack.at(-1)[axis]).toFixed(4);
      for (let index = faceTrack.length - 2; index >= 0; index--) {
        const current = faceTrack[index],
          next = faceTrack[index + 1];
        const span = Math.max(0.001, next[0] - current[0]);
        const interpolated = `${Number(current[axis]).toFixed(4)}+(t-${current[0].toFixed(3)})/${span.toFixed(3)}*(${Number(next[axis]).toFixed(4)}-${Number(current[axis]).toFixed(4)})`;
        expression = `if(lt(t,${next[0].toFixed(3)}),${interpolated},${expression})`;
      }
      return expression;
    }
    const cropX = `max(0,min(iw-ow,iw*(${tracked(1)})-ow/2))`;
    const cropY = `max(0,min(ih-oh,ih*(${tracked(2)})-oh/2))`;
    const keepExpression = removalRanges.length
      ? removalRanges
          .map(
            ([from, to]) =>
              `between(t,${(from - start).toFixed(3)},${(to - start).toFixed(3)})`,
          )
          .join("+")
      : "";
    const videoSource = keepExpression
      ? `[0:v]select='not(${keepExpression})',setpts=N/FRAME_RATE/TB,`
      : "[0:v]";
    const filters = [
      `${videoSource}scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height}:x='${cropX}':y='${cropY}'[v0]`,
    ];
    overlays.forEach((overlay, index) => {
      const inputIndex = index + 1;
      let sourceLabel = overlay.logo ? `logo${index}` : `${inputIndex}:v`;
      if (overlay.logo)
        filters.push(
          `[${inputIndex}:v]scale=${Math.round(width * 0.16)}:-1[${sourceLabel}]`,
        );
      if (overlay.broll) {
        sourceLabel = `broll${index}`;
        filters.push(
          `[${inputIndex}:v]scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height}[${sourceLabel}]`,
        );
      }
      if (overlay.animation === "fade") {
        filters.push(
          `[${sourceLabel}]fade=t=in:st=${overlay.from}:d=0.6:alpha=1[fade${index}]`,
        );
        sourceLabel = `fade${index}`;
      }
      let x = overlay.x ?? "(W-w)/2";
      let y = overlay.y;
      if (overlay.animation === "slide")
        y = `if(lt(t,0.45),${overlay.y}-70+(t/0.45)*70,${overlay.y})`;
      if (overlay.animation === "pop")
        x = `if(lt(t,0.35),(W-w)/2+sin(t*28)*8,(W-w)/2)`;
      filters.push(
        `[v${index}][${sourceLabel}]overlay='${x}':'${y}':enable='between(t,${overlay.from},${overlay.to})'[v${index + 1}]`,
      );
    });
    const audioFilters = {
      natural: "loudnorm",
      podcast:
        "highpass=f=80,lowpass=f=12000,acompressor=threshold=-18dB:ratio=3:attack=20:release=250,loudnorm",
      studio:
        "afftdn=nf=-25,highpass=f=70,lowpass=f=14000,acompressor=threshold=-20dB:ratio=4:attack=15:release=220,loudnorm",
    };
    const audioPreset =
      audioFilters[config.audioPreset] || audioFilters.podcast;
    let audioMap = "0:a?";
    if (keepExpression) {
      filters.push(
        `[0:a]aselect='not(${keepExpression})',asetpts=N/SR/TB,${audioPreset}[a0]`,
      );
      audioMap = "[a0]";
    }
    args.push(
      "-filter_complex",
      filters.join(";"),
      "-map",
      overlays.length ? `[v${overlays.length}]` : "[v0]",
      "-map",
      audioMap,
      ...(keepExpression ? [] : ["-af", audioPreset]),
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "23",
      "-c:a",
      "aac",
      "-movflags",
      "+faststart",
      "-t",
      String(outputDuration),
      "-shortest",
      "-progress",
      "pipe:2",
      "-nostats",
      "-y",
      output,
    );
    await run("ffmpeg", args, 0, activeJob);
    activeJob.progress = 100;
    activeJob.status = "complete";
    const video = await readFile(output);
    response.writeHead(200, {
      "content-type": "video/mp4",
      "content-length": String(video.length),
      "cache-control": "no-store",
    });
    response.end(video);
  } catch (error) {
    if (activeJob && !activeJob.cancelled) {
      activeJob.status = "failed";
      activeJob.error = error instanceof Error ? error.message : "Render gagal";
    }
    process.stderr.write(
      `Render gagal: ${error instanceof Error ? error.stack || error.message : String(error)}\n`,
    );
    response.writeHead(500, { "content-type": "application/json" });
    response.end(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Render gagal",
      }),
    );
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

server.listen(port, "127.0.0.1", () =>
  process.stdout.write(
    `KLIYU local render listening on http://127.0.0.1:${port}\n`,
  ),
);
