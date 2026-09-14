#!/usr/bin/env bash
set -euo pipefail

brew services stop ollama >/dev/null 2>&1 || true
launchctl remove com.kliyu.whisper >/dev/null 2>&1 || true
launchctl remove com.kliyu.render >/dev/null 2>&1 || true
echo "Proses AI lokal KLIYU dihentikan."
