#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
MODEL_DIR="$PROJECT_DIR/.local-ai/models"
WHISPER_MODEL="$MODEL_DIR/ggml-base.bin"

if ! command -v brew >/dev/null 2>&1; then
  echo "Homebrew belum tersedia. Install dari https://brew.sh lalu jalankan ulang."
  exit 1
fi

echo "Menginstal Ollama, whisper.cpp, FFmpeg, dan yt-dlp..."
brew install ollama whisper-cpp ffmpeg yt-dlp

mkdir -p "$MODEL_DIR" "$PROJECT_DIR/.local-ai/logs" "$PROJECT_DIR/.local-ai/pids"
if [ ! -s "$WHISPER_MODEL" ]; then
  echo "Mengunduh model Whisper multilingual base..."
  curl --fail --location --progress-bar \
    "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin" \
    --output "$WHISPER_MODEL"
fi

"$PROJECT_DIR/scripts/start-local-ai.sh"
echo "Mengunduh model teks qwen2.5:1.5b..."
ollama pull qwen2.5:1.5b
"$PROJECT_DIR/scripts/check-local-ai.sh"
echo "AI lokal KLIYU siap. Jalankan: npm run dev"
