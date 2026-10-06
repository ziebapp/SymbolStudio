# video-production — production project

This is a **production** video project, not a sandbox. Assets here can cost money (Higgsfield credits) and represent approved creative work. Treat every file as something a client may already have signed off on.

Toolchain:

| Job | Tool |
| --- | --- |
| Assembly, timeline, motion graphics, typography, SVG / HTML / CSS / JS animation | **Remotion** (React) |
| AI image & video generation | **Higgsfield CLI** (`higgsfield …`), skills in `.claude/skills/higgsfield-*` |
| Conversions, trimming, audio utilities, proxies, delivery files | **FFmpeg / ffprobe** |

Remotion skills: `.claude/skills/remotion-*` (start with `remotion-best-practices`).

## Working rules (must follow)

1. **Never regenerate Higgsfield assets unless the user explicitly asks.** Generation costs credits and changes approved looks. If a shot looks wrong, fix it in Remotion (crop, grade, timing, mask) first, and ask before re-generating.
2. **Never overwrite generated files. Always write a new version.** Names use sequential, zero-padded versions:
   `shot-01-v01.mp4`, `shot-01-v02.mp4`, `logo-sting-v03.png` …
   Get the next free name with `npm run next-version -- generated/higgsfield shot-01 mp4`.
   This applies to every file in `generated/` and `exports/final/`.
3. **Keep source assets separate from generated assets.**
   - `assets/` = material supplied by the client or user (footage, photos, music, fonts, logos). **Read-only**: never edit, re-encode in place, rename or delete.
   - `generated/` = everything produced by tools (Higgsfield output, SVG we author, FFmpeg derivatives).
4. **Prefer Remotion** for assembly and motion graphics. Use **FFmpeg** mainly for conversions, trimming, audio utilities, proxies and delivery files — not for building the edit.
5. **Exact frame-based timing.** All manifest timing is in whole frames at 30 fps (30 frames = 1 s). No seconds or floats in `start` / `duration`. Use `sec()` from `src/engine/timing.ts` only as an authoring helper, which rounds to whole frames.
6. **Don't touch unrelated assets or shots when making revisions.** Change only the shots / scenes / files named in the request. Don't "tidy up" other parts of a manifest.
7. **Preview the change before an expensive render.** Before a long final render, render only the modified section:
   `npx remotion render MainFilm temp/check.mp4 --frames=150-240` or a still: `npx remotion still MainFilm temp/f.png --frame=180`.
   Use `npm run render:preview` (half resolution) before `render:final`.
8. **Keep compositions modular.** One shot = one manifest entry. Anything bespoke goes in its own file in `compositions/scenes/` and is registered in `compositions/scenes/registry.ts`, so it can be replaced without rebuilding the project.
9. Record what produced each generated file (prompt, model, seed, job id) in `prompts/` and/or the shot's `notes` field.

## Layout

```
video-production/
├── assets/            SOURCE (read-only): images/ video/ audio/ fonts/ logos/
├── generated/         TOOL OUTPUT (versioned, never overwritten)
│   ├── higgsfield/    Higgsfield images & videos  e.g. shot-03-v02.mp4
│   └── svg/           SVGs authored for animation  e.g. map-route-v01.svg
├── prompts/           Prompt log for every Higgsfield generation (one .md per shot)
├── compositions/      The film itself
│   ├── main-film.manifest.ts           MainFilm 1920x1080 @30 — shot list
│   ├── main-film-vertical.manifest.ts  MainFilmVertical 1080x1920 @30 — shot list
│   ├── MainFilm.tsx                    binds manifests to compositions
│   ├── scenes/                         custom scenes + registry.ts
│   └── tests/                          ComponentTest smoke-test composition
├── src/
│   ├── Root.tsx       registers compositions
│   ├── components/    reusable building blocks (see below)
│   └── engine/        manifest types, timing helpers, ShotRenderer
├── exports/           renders (git-ignored): preview/ final/ stills/
├── temp/              scratch / proxies / test media (git-ignored)
├── public/            symlinks → assets, generated, temp (so staticFile() can serve them)
└── scripts/           verify-tools.sh, next-version.mjs, make-test-media.sh
```

`filename` in a manifest is always **relative to the project root**, e.g. `generated/higgsfield/shot-01-v02.mp4`. The `public/` symlinks make those paths resolve. Don't put files directly in `public/`.

## The shot manifest

Edit `compositions/main-film.manifest.ts` (or the vertical one). Each shot:

| field | meaning |
| --- | --- |
| `id` | unique, shown as the layer name in Studio (`shot-01`, `shot-01-title`) |
| `filename` | path from project root (video / image / svg / logo / audio) |
| `type` | `video` `image` `svg` `text` `logo` `audio` `adjustment` `scene` |
| `start` | start frame on the timeline |
| `duration` | length in frames |
| `position` | `{x, y}` px offset from frame centre |
| `scale` | 1 = native fit |
| `opacity` | 0..1 |
| `transition` | `{in?: {type: "fade" \| "dissolve" \| "none", frames}, out?: …}` |
| `notes` | free text, not rendered (prompt, version history, client feedback) |

Optional: `animate.keyframes` (scale/position/opacity/rotation over time), `mask` (`wipe` / `circle` / `inset` / `feather`), `layer` (stacking order, higher = on top), `trimBefore`, `volume`, `muted`, `loop`, `playbackRate`, `fit`, `kenBurns`, `text`, `textAnimation`, `textStyle`, `width`, `drawFrames`, `adjustment`, `scene` + `sceneProps`. Full types: `src/engine/types.ts`.

**Dissolve** = start the incoming shot `frames` before the previous one ends and give it `transition.in = {type: "dissolve", frames}`.
Composition length = end of the last shot, unless `durationInFrames` is set on the manifest.

## Components (`src/components`)

`VideoClip`, `StillImage` (Ken Burns), `SvgAnimation` (inline SVG, stroke draw-on), `AnimatedText` (fade-up / words / chars / typewriter / scale-in), `LogoReveal` (scale / wipe / blur + tagline), `Fade` + `Dissolve`, `Transform` (keyframed scale/position/rotation/opacity), `Mask`, `AudioTrack` (volume fades), `Adjustment` (tint / vignette / grain / letterbox) + `Grade` (brightness / contrast / saturation filters).

All animation must be driven by `useCurrentFrame()` (interpolate / spring). Never use CSS transitions/animations, SMIL or `setTimeout`: they are not frame-accurate in renders.

## Commands

```
npm run studio            # Remotion Studio (browser preview)
npm run render:preview    # MainFilm, half-res, fast → exports/preview/
npm run render:final      # MainFilm 1920x1080 H.264 CRF16 + AAC 320k → exports/final/
npm run render:vertical   # MainFilmVertical 1080x1920 → exports/final/
npm run render:still      # single PNG
npm run render:test       # renders ComponentTest with throw-away media
npm run verify            # checks node, ffmpeg, higgsfield (+auth), skills, remotion
npm run lint              # eslint + tsc
```

Section render: `npx remotion render MainFilm temp/section.mp4 --frames=120-210`
Before overwriting a final in `exports/final/`, version it (`MainFilm-v03.mp4`) with `--output` or a rename.

## Higgsfield workflow

1. Check auth: `higgsfield auth token >/dev/null && echo ok`. If not authenticated, ask the user to run `higgsfield auth login`.
2. Estimate first: `higgsfield generate cost <model> --prompt "…"`. Tell the user the cost if it's noticeable.
3. Write the prompt to `prompts/shot-XX.md` (model, params, prompt, date, job id) **before** generating.
4. Generate, wait, then download to the next free version name in `generated/higgsfield/`.
5. Add or replace the shot's `filename` in the manifest. Keep the old version file on disk.

Use the `higgsfield-generate` skill for model choice and CLI syntax.

## FFmpeg recipes

```
# Probe
ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate,duration -of compact FILE
# Conform to 30 fps H.264 (new file in generated/, never in place)
ffmpeg -i IN -vf fps=30 -c:v libx264 -crf 16 -pix_fmt yuv420p -c:a aac -b:a 320k OUT
# Frame-accurate trim (re-encode): frames 45..134 at 30fps
ffmpeg -i IN -vf "trim=start_frame=45:end_frame=135,setpts=PTS-STARTPTS" -af "atrim=start=1.5:end=4.5,asetpts=PTS-STARTPTS" OUT
# Proxy for editing
ffmpeg -i IN -vf scale=-2:540 -c:v libx264 -crf 28 -preset veryfast temp/proxy-NAME.mp4
# Loudness normalise for delivery (-14 LUFS web)
ffmpeg -i IN -af loudnorm=I=-14:TP=-1:LRA=11 -c:v copy OUT
# ProRes 422 HQ master
ffmpeg -i IN -c:v prores_ks -profile:v 3 -c:a pcm_s16le OUT.mov
# Extract audio / image sequence → video / GIF
ffmpeg -i IN -vn -c:a pcm_s16le OUT.wav
ffmpeg -framerate 30 -i frame_%04d.png -c:v libx264 -pix_fmt yuv420p OUT.mp4
```
