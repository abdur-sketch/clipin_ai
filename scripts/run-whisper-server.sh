#!/usr/bin/env bash
set -euo pipefail

export PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
MODEL_PATH="${1:?Whisper model path is required}"
WORK_DIR="${2:?Whisper working directory is required}"
cd "$WORK_DIR"
exec /usr/local/bin/whisper-server --host 127.0.0.1 --port 8080 --model "$MODEL_PATH" --convert --language auto
