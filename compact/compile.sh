#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

midnight_compact() {
  local compact_bin
  compact_bin="$(command -v compact 2>/dev/null || true)"
  case "$compact_bin" in
    ""|*System32*|*system32*|*SysWOW64*|*syswow64*)
      return 1
      ;;
  esac
  compact compile --version >/dev/null 2>&1
}

if ! midnight_compact; then
  echo "Install Midnight Compact in WSL/Linux/macOS:"
  echo "  https://docs.midnight.network/getting-started/installation"
  echo "Then: compact update 0.31.1 && ./compact/compile.sh"
  exit 1
fi

compact update 0.31.1 || compact update
compact compile compact/kachis-guardrail.compact compact/managed/kachis-guardrail
printf 'compiled\n' > compact/managed/kachis-guardrail/.compiled
echo "Wrote compact/managed/kachis-guardrail"
