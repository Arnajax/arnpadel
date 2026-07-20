#!/usr/bin/env bash
# verify.sh — repo-native verifier voor arnpadel (Next.js/TS).
# Deze in-repo kopie wordt door CI gebruikt (.github/workflows/verify.yml).
# Bron van waarheid voor de lokale loop-harness: ~/.claude/skills/loop-engineering/templates/verify.sh
# (de cheat-guard flagt elke diff aan dit bestand zodat de twee niet ongemerkt uiteenlopen).
#
# Harde gates: lint, build (type-gate), tests. npm audit = advisory (geen blocker, nooit auto-fix).
# Gebruik: scripts/verify.sh [REPO_DIR]   (default: $PWD)
# Laatste stdout-regel is machine-leesbaar: "VERIFY: PASS" of "VERIFY: FAIL gate=<naam>".
set -uo pipefail

REPO="${1:-$PWD}"
cd "$REPO" || { echo "VERIFY: FAIL gate=cd"; exit 2; }

fail() { echo "VERIFY: FAIL gate=$1"; exit 1; }

echo "▶ lint";  npm run lint --silent           || fail lint
echo "▶ build"; npm run build                    || fail build
echo "▶ test";  node --test tests/*.mjs          || fail test

echo "▶ audit (advisory)"
npm audit --omit=dev || echo "  ⚠ audit findings — handmatig beoordelen (geen blocker)"

echo "VERIFY: PASS"
