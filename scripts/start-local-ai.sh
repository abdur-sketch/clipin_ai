#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
STATE_DIR="$PROJECT_DIR/.local-ai"
MODEL_PATH="$STATE_DIR/models/ggml-base.bin"
mkdir -p "$STATE_DIR/logs" "$STATE_DIR/pids" "$STATE_DIR/tmp"
mkdir -p "$STATE_DIR/bin"

OVERLAY_SOURCE="$PROJECT_DIR/scripts/render-text-overlay.swift"
OVERLAY_TOOL="$STATE_DIR/bin/render-text-overlay"
if [ ! -x "$OVERLAY_TOOL" ] || [ "$OVERLAY_SOURCE" -nt "$OVERLAY_TOOL" ]; then
  xcrun swiftc "$OVERLAY_SOURCE" -o "$OVERLAY_TOOL"
fi
FACE_SOURCE="$PROJECT_DIR/scripts/detect-face-center.swift"
FACE_TOOL="$STATE_DIR/bin/detect-face-center"
if [ ! -x "$FACE_TOOL" ] || [ "$FACE_SOURCE" -nt "$FACE_TOOL" ]; then
  xcrun swiftc -framework AVFoundation -framework Vision "$FACE_SOURCE" -o "$FACE_TOOL"
fi

if ! command -v ollama >/dev/null 2>&1; then
  echo "Ollama belum terpasang. Jalankan: npm run local-ai:setup"
  exit 1
fi
if ! command -v whisper-server >/dev/null 2>&1; then
  echo "whisper-server belum terpasang. Jalankan: npm run local-ai:setup"
  exit 1
fi
if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "FFmpeg belum terpasang. Jalankan: npm run local-ai:setup"
  exit 1
fi
if ! command -v yt-dlp >/dev/null 2>&1; then
  echo "yt-dlp belum terpasang. Jalankan: npm run local-ai:setup"
  exit 1
fi
if [ ! -s "$MODEL_PATH" ]; then
  echo "Model Whisper belum tersedia. Jalankan: npm run local-ai:setup"
  exit 1
fi

if ! curl --silent --fail http://127.0.0.1:11434/api/tags >/dev/null 2>&1; then
  brew services start ollama >/dev/null
fi

for _ in {1..30}; do
  curl --silent --fail http://127.0.0.1:11434/api/tags >/dev/null 2>&1 && break
  sleep 1
done
curl --silent --fail http://127.0.0.1:11434/api/tags >/dev/null || { echo "Ollama gagal dijalankan. Periksa .local-ai/logs/ollama.log"; exit 1; }

if ! curl --silent --fail http://127.0.0.1:8080/ >/dev/null 2>&1; then
  launchctl remove com.kliyu.whisper >/dev/null 2>&1 || true
  launchctl submit -l com.kliyu.whisper -o "$STATE_DIR/logs/whisper.log" -e "$STATE_DIR/logs/whisper.log" -- "$PROJECT_DIR/scripts/run-whisper-server.sh" "$MODEL_PATH" "$STATE_DIR/tmp"
fi

for _ in {1..30}; do
  curl --silent --fail http://127.0.0.1:8080/ >/dev/null 2>&1 && break
  sleep 1
done
curl --silent --fail http://127.0.0.1:8080/ >/dev/null || { echo "Whisper gagal dijalankan. Periksa .local-ai/logs/whisper.log"; exit 1; }

if ! curl --silent --fail http://127.0.0.1:8789/health >/dev/null 2>&1; then
  launchctl remove com.kliyu.render >/dev/null 2>&1 || true
  launchctl submit -l com.kliyu.render -o "$STATE_DIR/logs/render.log" -e "$STATE_DIR/logs/render.log" -- /usr/bin/env PATH="/usr/local/bin:/usr/bin:/bin" KLIYU_OVERLAY_TOOL="$OVERLAY_TOOL" KLIYU_FACE_TOOL="$FACE_TOOL" node "$PROJECT_DIR/scripts/local-render-server.mjs"
fi

for _ in {1..30}; do
  curl --silent --fail http://127.0.0.1:8789/health >/dev/null 2>&1 && break
  sleep 1
done
curl --silent --fail http://127.0.0.1:8789/health >/dev/null || { echo "Render lokal gagal dijalankan. Periksa .local-ai/logs/render.log"; exit 1; }

GATEWAY_TOKEN_FILE="$STATE_DIR/gateway-token"
if [ ! -s "$GATEWAY_TOKEN_FILE" ]; then
  openssl rand -hex 32 > "$GATEWAY_TOKEN_FILE"
  chmod 600 "$GATEWAY_TOKEN_FILE"
fi
if ! curl --silent --fail http://127.0.0.1:8791/health >/dev/null 2>&1; then
  launchctl remove com.kliyu.gateway >/dev/null 2>&1 || true
  launchctl submit -l com.kliyu.gateway -o "$STATE_DIR/logs/gateway.log" -e "$STATE_DIR/logs/gateway.log" -- /usr/bin/env PATH="/usr/local/bin:/usr/bin:/bin" KLIYU_GATEWAY_TOKEN="$(tr -d '\n' < "$GATEWAY_TOKEN_FILE")" node "$PROJECT_DIR/scripts/local-ai-gateway.mjs"
fi
for _ in {1..20}; do
  curl --silent --fail http://127.0.0.1:8791/health >/dev/null 2>&1 && break
  sleep 0.25
done
curl --silent --fail http://127.0.0.1:8791/health >/dev/null || { echo "Gateway AI lokal gagal dijalankan. Periksa .local-ai/logs/gateway.log"; exit 1; }
echo "Ollama, Whisper, dan render FFmpeg lokal aktif."
