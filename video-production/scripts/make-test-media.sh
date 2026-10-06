#!/usr/bin/env bash
# Generates throw-away media in temp/ for the ComponentTest composition.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p temp
ffmpeg -hide_banner -loglevel error -y -f lavfi -i testsrc2=size=1280x720:rate=30:duration=4 \
  -c:v libx264 -pix_fmt yuv420p temp/test-pattern.mp4
ffmpeg -hide_banner -loglevel error -y -f lavfi -i "gradients=size=1280x720:seed=7:duration=1" -frames:v 1 temp/test-still.png
ffmpeg -hide_banner -loglevel error -y -f lavfi -i "sine=frequency=440:duration=4" -ac 2 temp/test-tone.wav
echo "Test media written to temp/"
