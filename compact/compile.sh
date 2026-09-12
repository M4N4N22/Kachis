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

# Vercel serves settle keys from public/ (CDN). Managed keys stay gitignored locally;
# the public copy is what production fetch(/zk/kachis-guardrail/…) needs.
PUBLIC_ZK="$ROOT/public/zk/kachis-guardrail"
mkdir -p "$PUBLIC_ZK/keys" "$PUBLIC_ZK/zkir"
cp -f compact/managed/kachis-guardrail/.compiled "$PUBLIC_ZK/.compiled"
cp -f compact/managed/kachis-guardrail/keys/* "$PUBLIC_ZK/keys/"
cp -f compact/managed/kachis-guardrail/zkir/* "$PUBLIC_ZK/zkir/"

echo "Wrote compact/managed/kachis-guardrail"
echo "Synced public/zk/kachis-guardrail (keys + zkir) for production settle"
