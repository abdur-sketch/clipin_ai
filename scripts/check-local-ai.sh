#!/usr/bin/env bash
set -euo pipefail

OLLAMA_STATUS="OFF"
WHISPER_STATUS="OFF"
RENDER_STATUS="OFF"
GATEWAY_STATUS="OFF"
curl --silent --fail http://127.0.0.1:11434/api/tags >/dev/null 2>&1 && OLLAMA_STATUS="ON"
curl --silent --fail http://127.0.0.1:8080/ >/dev/null 2>&1 && WHISPER_STATUS="ON"
curl --silent --fail http://127.0.0.1:8789/health >/dev/null 2>&1 && RENDER_STATUS="ON"
curl --silent --fail http://127.0.0.1:8791/health >/dev/null 2>&1 && GATEWAY_STATUS="ON"
echo "OLLAMA=$OLLAMA_STATUS"
echo "WHISPER=$WHISPER_STATUS"
echo "RENDER=$RENDER_STATUS"
echo "GATEWAY=$GATEWAY_STATUS"
[ "$OLLAMA_STATUS" = "ON" ] && [ "$WHISPER_STATUS" = "ON" ] && [ "$RENDER_STATUS" = "ON" ] && [ "$GATEWAY_STATUS" = "ON" ]
