#!/usr/bin/env bash
# Checks each tool of the pipeline independently. Exit code = number of failures.
cd "$(dirname "$0")/.."
fail=0
ok()   { printf "  \033[32m✓\033[0m %s\n" "$1"; }
bad()  { printf "  \033[31m✗\033[0m %s\n" "$1"; fail=$((fail+1)); }

echo "Node / npm"
command -v node >/dev/null && ok "node $(node -v)" || bad "node missing"
command -v npm  >/dev/null && ok "npm $(npm -v)"   || bad "npm missing"

echo "FFmpeg"
if command -v ffmpeg >/dev/null; then
  ok "$(ffmpeg -version | head -1 | cut -d' ' -f1-3)"
  ffmpeg -hide_banner -loglevel error -y -f lavfi -i testsrc2=size=320x180:rate=30:duration=1 \
    -c:v libx264 -pix_fmt yuv420p temp/_ffmpeg-check.mp4 && ok "libx264 encode works" || bad "ffmpeg encode failed"
  rm -f temp/_ffmpeg-check.mp4
else bad "ffmpeg missing"; fi
command -v ffprobe >/dev/null && ok "ffprobe present" || bad "ffprobe missing"

echo "Higgsfield"
if command -v higgsfield >/dev/null; then
  ok "$(higgsfield --version | head -1)"
  if higgsfield auth token >/dev/null 2>&1; then
    ok "authenticated"
    higgsfield account --help >/dev/null 2>&1 && ok "account reachable"
  else bad "not authenticated — run: higgsfield auth login"; fi
else bad "higgsfield CLI missing — npm i -g @higgsfield/cli"; fi

echo "Agent skills (project)"
for s in higgsfield-generate remotion-best-practices; do
  [ -e ".claude/skills/$s/SKILL.md" ] && ok "$s" || bad "$s missing"
done

echo "Remotion"
npx remotion versions >/dev/null 2>&1 && ok "remotion $(node -p "require('remotion/package.json').version")" || bad "remotion not installed (npm i)"
npx remotion compositions 2>/dev/null | grep -q MainFilmVertical && ok "compositions MainFilm + MainFilmVertical found" || bad "compositions not found"
npx remotion still MainFilm temp/_remotion-check.png --frame=100 --log=error >/dev/null 2>&1 \
  && ok "still render works" || bad "still render failed"
rm -f temp/_remotion-check.png

echo
[ $fail -eq 0 ] && echo "All checks passed." || echo "$fail check(s) failed."
exit $fail
