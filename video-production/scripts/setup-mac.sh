#!/usr/bin/env bash
# One-time setup of this Mac as an AI video production machine.
# Safe to re-run: every step checks first and skips what is already installed.
#   bash scripts/setup-mac.sh
set -euo pipefail
cd "$(dirname "$0")/.."

say() { printf "\n\033[1m==> %s\033[0m\n" "$1"; }

say "Homebrew"
if ! command -v brew >/dev/null; then
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  eval "$(/opt/homebrew/bin/brew shellenv 2>/dev/null || /usr/local/bin/brew shellenv)"
fi
brew --version | head -1

say "Node.js + npm"
if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 20 ]; then
  brew install node
fi
echo "node $(node -v), npm $(npm -v)"

say "FFmpeg"
command -v ffmpeg >/dev/null || brew install ffmpeg
ffmpeg -version | head -1

say "Higgsfield CLI"
command -v higgsfield >/dev/null || npm i -g @higgsfield/cli
higgsfield --version | head -1

say "Higgsfield login"
if higgsfield auth token >/dev/null 2>&1; then
  echo "Already authenticated."
else
  higgsfield auth login   # opens the browser
fi

say "Agent skills (global, for Claude Code anywhere on this Mac)"
npx -y skills@latest add higgsfield-ai/skills -g -y
npx -y skills@latest add remotion-dev/skills -g -y

say "Project dependencies"
npm install

say "Verify"
bash scripts/verify-tools.sh
