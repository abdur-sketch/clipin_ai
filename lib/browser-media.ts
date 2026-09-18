export type BrowserMediaClip = {
  id: string;
  title: string;
  hook: string;
  startTime: number;
  endTime: number;
  aspectRatio?: string;
  fontColor?: string;
  fontFamily?: string;
  fontEffect?: string;
  fontSize?: number;
  titlePosition?: string;
  captionPosition?: string;
  hookOverlay?: boolean;
  captionsEnabled?: boolean;
  watermark?: boolean;
  faceTracking?: boolean;
  logoName?: string;
  brollName?: string;
  brollStart?: number;
  smartCleanup?: boolean;
  transcriptCut?: boolean;
  audioPreset?: string;
  noiseReduction?: boolean;
  autoLevel?: boolean;
  reframeMode?: string;
  cropFocusX?: number;
  transition?: string;
  captionAnimation?: string;
  titleAnimation?: string;
  audioGain?: number;
  exportResolution?: string;
  exportFps?: number;
  exportBitrate?: number;
  musicName?: string;
  musicVolume?: number;
  audioDucking?: boolean;
  subtitles?: Array<{
    start: number;
    end: number;
    text: string;
    removed?: boolean;
  }>;
};

function waitFor(target: EventTarget, name: string) {
  return new Promise<void>((resolve, reject) => {
    const ok = () => {
      cleanup();
      resolve();
    };
    const fail = () => {
      cleanup();
      reject(new Error("Video tidak dapat dibaca browser"));
    };
    const cleanup = () => {
      target.removeEventListener(name, ok);
      target.removeEventListener("error", fail);
    };
    target.addEventListener(name, ok, { once: true });
    target.addEventListener("error", fail, { once: true });
  });
}

function dimensions(ratio = "9:16", resolution = "720p") {
  const high = resolution === "1080p";
  if (ratio === "16:9")
    return high ? { width: 1920, height: 1080 } : { width: 1280, height: 720 };
  if (ratio === "1:1")
    return high ? { width: 1080, height: 1080 } : { width: 720, height: 720 };
  return high ? { width: 1080, height: 1920 } : { width: 720, height: 1280 };
}

function fontStack(name = "system") {
  if (name === "serif") return "Georgia, serif";
  if (name === "mono") return "Menlo, monospace";
  if (name === "rounded") return "Avenir Next, system-ui, sans-serif";
  if (name === "condensed") return "Arial Narrow, system-ui, sans-serif";
  return "system-ui, sans-serif";
}

function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
) {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else line = candidate;
  }
  if (line) lines.push(line);
  return lines.slice(0, 5);
}

function drawLabel(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  size: number,
  color: string,
  family: string,
  effect: string,
) {
  context.save();
  context.font = `800 ${size}px ${fontStack(family)}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  const lines = wrapText(context, text, maxWidth);
  const height = lines.length * size * 1.18;
  if (effect === "background") {
    context.fillStyle = "rgba(0,0,0,.72)";
    context.fillRect(x - maxWidth / 2 - 18, y - height / 2 - 14, maxWidth + 36, height + 28);
  }
  if (effect === "shadow" || effect === "glow") {
    context.shadowColor = effect === "glow" ? color : "rgba(0,0,0,.95)";
    context.shadowBlur = effect === "glow" ? 24 : 10;
    context.shadowOffsetY = effect === "shadow" ? 7 : 0;
  }
  context.lineJoin = "round";
  context.lineWidth = Math.max(4, size / 10);
  context.strokeStyle = "#000";
  context.fillStyle = color;
  lines.forEach((line, index) => {
    const lineY = y - height / 2 + size * 0.6 + index * size * 1.18;
    if (effect === "outline") context.strokeText(line, x, lineY, maxWidth);
    context.fillText(line, x, lineY, maxWidth);
  });
  context.restore();
}

function drawVideoCover(
  context: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  width: number,
  height: number,
  focusX = 0.5,
) {
  const scale = Math.max(width / video.videoWidth, height / video.videoHeight);
  const sourceWidth = width / scale;
  const sourceHeight = height / scale;
  const sourceX = Math.max(
    0,
    Math.min(video.videoWidth - sourceWidth, video.videoWidth * focusX - sourceWidth / 2),
  );
  const sourceY = Math.max(0, (video.videoHeight - sourceHeight) / 2);
  context.drawImage(
    video,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    width,
    height,
  );
}

function drawFrame(
  context: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  clip: BrowserMediaClip,
  assets?: { logo?: HTMLImageElement; broll?: HTMLImageElement; focusX?: number },
) {
  const { width, height } = context.canvas;
  drawVideoCover(context, video, width, height, assets?.focusX);
  const elapsed = video.currentTime - clip.startTime;
  const duration = Math.max(0.1, clip.endTime - clip.startTime);
  if (assets?.broll && elapsed >= (clip.brollStart || 2) && elapsed <= (clip.brollStart || 2) + 3) {
    context.save();
    context.globalAlpha = 0.96;
    const boxWidth = width * 0.78;
    const boxHeight = height * 0.3;
    context.drawImage(assets.broll, width * 0.11, height * 0.34, boxWidth, boxHeight);
    context.restore();
  }
  if (clip.hookOverlay !== false) {
    const position = clip.titlePosition || "top";
    const y = position === "bottom" ? height * 0.78 : position === "center" ? height * 0.5 : height * 0.16;
    const intro = Math.min(1, elapsed / 0.45);
    context.save();
    context.globalAlpha = clip.titleAnimation === "none" ? 1 : intro;
    if (clip.titleAnimation === "pop") {
      context.translate(width / 2, y);
      context.scale(0.8 + intro * 0.2, 0.8 + intro * 0.2);
      context.translate(-width / 2, -y);
    }
    drawLabel(context, clip.hook, width / 2, y, width * 0.78,
      Math.max(32, Math.round((clip.fontSize || 48) * 1.15)),
      clip.fontColor || "#FFFFFF", clip.fontFamily || "system",
      clip.fontEffect || "outline");
    context.restore();
  }
  if (clip.captionsEnabled !== false) {
    const row = clip.subtitles?.find(
      (item) => !item.removed && item.start <= video.currentTime && item.end >= video.currentTime,
    );
    if (row) {
      const position = clip.captionPosition || "bottom";
      const y = position === "top" ? height * 0.28 : position === "center" ? height * 0.58 : height * 0.86;
      const rowProgress = Math.min(1, Math.max(0, (video.currentTime - row.start) / 0.18));
      const animatedSize =
        clip.captionAnimation === "pop"
          ? Math.max(28, clip.fontSize || 48) * (0.82 + rowProgress * 0.18)
          : Math.max(28, clip.fontSize || 48);
      context.save();
      if (clip.captionAnimation === "fade") context.globalAlpha = rowProgress;
      drawLabel(
        context,
        row.text,
        width / 2,
        y,
        width * 0.82,
        animatedSize,
        clip.fontColor || "#FFFFFF",
        clip.fontFamily || "system",
        clip.fontEffect || "outline",
      );
      context.restore();
    }
  }
  if (clip.watermark !== false) {
    context.save();
    context.font = `800 ${Math.round(width * 0.026)}px system-ui`;
    context.textAlign = "right";
    context.fillStyle = "rgba(255,255,255,.8)";
    context.fillText("KLIYU.", width * 0.95, height * 0.96);
    context.restore();
  }
  if (assets?.logo) {
    const size = width * 0.13;
    context.drawImage(assets.logo, width * 0.82, height * 0.04, size, size);
  }
  if (clip.transition && clip.transition !== "none") {
    const edge = Math.min(elapsed, duration - elapsed);
    const strength = Math.max(0, 1 - edge / 0.45);
    if (strength > 0) {
      context.save();
      context.globalAlpha = strength;
      context.fillStyle = clip.transition === "white" ? "#fff" : "#000";
      context.fillRect(0, 0, width, height);
      context.restore();
    }
  }
}

async function optionalImage(url: string) {
  try {
    const response = await fetch(url);
    if (!response.ok) return undefined;
    const image = new Image();
    image.src = URL.createObjectURL(await response.blob());
    await waitFor(image, "load");
    return image;
  } catch {
    return undefined;
  }
}

async function sourceVideo(clip: BrowserMediaClip) {
  const video = document.createElement("video");
  video.src = `/api/clips/${clip.id}/media?source=1`;
  video.preload = "auto";
  video.playsInline = true;
  video.crossOrigin = "use-credentials";
  await waitFor(video, "loadedmetadata");
  video.currentTime = Math.max(0, clip.startTime);
  await waitFor(video, "seeked");
  return video;
}

async function thumbnailAt(clip: BrowserMediaClip, fraction: number) {
  const video = await sourceVideo(clip);
  const target = Math.min(
    clip.endTime - 0.1,
    clip.startTime + Math.max(0.1, (clip.endTime - clip.startTime) * fraction),
  );
  if (Math.abs(video.currentTime - target) > 0.05) {
    video.currentTime = target;
    await waitFor(video, "seeked");
  }
  const canvas = document.createElement("canvas");
  Object.assign(canvas, dimensions(clip.aspectRatio));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas tidak tersedia");
  const logo = clip.logoName ? await optionalImage(`/api/clips/${clip.id}/logo`) : undefined;
  drawFrame(context, video, clip, { logo });
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Thumbnail gagal dibuat"))),
      "image/jpeg",
      0.9,
    ),
  );
}

export async function createThumbnailInBrowser(clip: BrowserMediaClip) {
  return thumbnailAt(clip, 0.2);
}

export async function createThumbnailVariantsInBrowser(
  clip: BrowserMediaClip,
) {
  const variants: Blob[] = [];
  for (const fraction of [0.16, 0.48, 0.78])
    variants.push(await thumbnailAt(clip, fraction));
  return variants;
}

export async function renderVideoInBrowser(
  clip: BrowserMediaClip,
  onProgress: (value: number) => void,
  signal?: AbortSignal,
) {
  if (!("MediaRecorder" in window))
    throw new Error("Browser ini belum mendukung export video. Gunakan Chrome atau Edge terbaru.");
  const video = await sourceVideo(clip);
  const [logo, broll] = await Promise.all([
    clip.logoName ? optionalImage(`/api/clips/${clip.id}/logo`) : undefined,
    clip.brollName ? optionalImage(`/api/clips/${clip.id}/broll`) : undefined,
  ]);
  const canvas = document.createElement("canvas");
  Object.assign(canvas, dimensions(clip.aspectRatio, clip.exportResolution));
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("Canvas tidak tersedia");
  const output = canvas.captureStream(
    Math.max(24, Math.min(60, clip.exportFps || 30)),
  );
  let audioContext: AudioContext | undefined;
  if (
    (clip.audioPreset && clip.audioPreset !== "natural") ||
    clip.noiseReduction ||
    clip.autoLevel
  ) {
    audioContext = new AudioContext();
    const source = audioContext.createMediaElementSource(video);
    const compressor = audioContext.createDynamicsCompressor();
    const gain = audioContext.createGain();
    const highpass = audioContext.createBiquadFilter();
    const lowpass = audioContext.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.value = clip.noiseReduction === false ? 20 : 80;
    lowpass.type = "lowpass";
    lowpass.frequency.value = clip.noiseReduction === false ? 20000 : 14500;
    compressor.threshold.value = clip.autoLevel === false
      ? 0
      : clip.audioPreset === "studio"
        ? -28
        : -22;
    compressor.ratio.value = clip.autoLevel === false
      ? 1
      : clip.audioPreset === "studio"
        ? 5
        : 3;
    gain.gain.value = (clip.autoLevel === false
      ? 1
      : clip.audioPreset === "studio"
        ? 1.18
        : 1.08) * Math.max(0.5, Math.min(1.5, clip.audioGain || 1));
    const destination = audioContext.createMediaStreamDestination();
    source
      .connect(highpass)
      .connect(lowpass)
      .connect(compressor)
      .connect(gain)
      .connect(destination);
    if (clip.musicName) {
      const music = document.createElement("audio");
      music.src = `/api/clips/${clip.id}/music`;
      music.loop = true;
      music.crossOrigin = "use-credentials";
      await waitFor(music, "canplay");
      const musicSource = audioContext.createMediaElementSource(music);
      const musicGain = audioContext.createGain();
      musicGain.gain.value =
        Math.max(0, Math.min(0.7, clip.musicVolume ?? 0.18)) *
        (clip.audioDucking === false ? 1 : 0.42);
      musicSource.connect(musicGain).connect(destination);
      music.currentTime = 0;
      void music.play();
      video.addEventListener("pause", () => music.pause(), { once: true });
    }
    destination.stream.getAudioTracks().forEach((track) => output.addTrack(track));
  } else {
    const capture = (video as HTMLVideoElement & { captureStream?: () => MediaStream }).captureStream?.();
    capture?.getAudioTracks().forEach((track) => output.addTrack(track));
  }
  const mimeTypes = [
    "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  const mimeType = mimeTypes.find((item) => MediaRecorder.isTypeSupported(item)) || "";
  const recorder = new MediaRecorder(output, {
    ...(mimeType ? { mimeType } : {}),
    videoBitsPerSecond: 5_000_000,
    ...(clip.exportBitrate
      ? { videoBitsPerSecond: clip.exportBitrate * 1_000_000 }
      : {}),
  });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (event) => event.data.size && chunks.push(event.data);
  const stopped = waitFor(recorder, "stop");
  const duration = Math.max(0.1, clip.endTime - clip.startTime);
  const detectorApi = (
    globalThis as typeof globalThis & {
      FaceDetector?: new (options?: Record<string, unknown>) => {
        detect: (source: CanvasImageSource) => Promise<Array<{ boundingBox: DOMRectReadOnly }>>;
      };
    }
  ).FaceDetector;
  const detector =
    clip.faceTracking &&
    clip.reframeMode !== "center" &&
    clip.reframeMode !== "manual" &&
    detectorApi
      ? new detectorApi({ fastMode: true, maxDetectedFaces: 1 })
      : null;
  let focusX =
    clip.reframeMode === "left"
      ? 0.3
      : clip.reframeMode === "right"
        ? 0.7
        : Math.max(0.1, Math.min(0.9, clip.cropFocusX || 0.5));
  let frameNumber = 0;
  let animation = 0;
  const finish = () => {
    window.cancelAnimationFrame(animation);
    video.pause();
    if (recorder.state !== "inactive") recorder.stop();
  };
  const abort = () => finish();
  signal?.addEventListener("abort", abort, { once: true });
  recorder.start(500);
  await video.play();
  await new Promise<void>((resolve) => {
    const paint = () => {
      const skipped = clip.subtitles?.find(
        (item) =>
          item.start <= video.currentTime &&
          item.end > video.currentTime &&
          ((clip.transcriptCut && item.removed) ||
            (clip.smartCleanup && /^(?:e+|eh+|em+|anu|hmm+)[,.!? ]*$/i.test(item.text.trim()))),
      );
      if (skipped) video.currentTime = Math.min(skipped.end, clip.endTime);
      drawFrame(context, video, clip, { logo, broll, focusX });
      if (detector && frameNumber++ % 12 === 0) {
        void detector.detect(video).then((faces) => {
          const face = faces[0]?.boundingBox;
          if (face && video.videoWidth)
            focusX = Math.max(0.15, Math.min(0.85, (face.x + face.width / 2) / video.videoWidth));
        }).catch(() => {});
      }
      const elapsed = Math.max(0, video.currentTime - clip.startTime);
      onProgress(Math.min(94, 5 + Math.round((elapsed / duration) * 89)));
      if (signal?.aborted || video.currentTime >= clip.endTime || video.ended) {
        finish();
        resolve();
        return;
      }
      animation = window.requestAnimationFrame(paint);
    };
    paint();
  });
  await stopped;
  await audioContext?.close();
  signal?.removeEventListener("abort", abort);
  if (signal?.aborted) throw new DOMException("Render dibatalkan", "AbortError");
  const type = recorder.mimeType || mimeType || "video/webm";
  const result = new Blob(chunks, { type });
  if (!result.size) throw new Error("Browser tidak menghasilkan file video");
  onProgress(96);
  return result;
}
