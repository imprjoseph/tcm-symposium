#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
mkdir -p dist/server dist/.openai
node scripts/bundle.mjs
if [[ -f .openai/hosting.json ]]; then
  cp .openai/hosting.json dist/.openai/hosting.json
fi
