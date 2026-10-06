import type { Manifest } from "../src/engine/types";

/**
 * MainFilm — 1920x1080 @ 30 fps.
 *
 * Timing is in FRAMES. 30 frames = 1 s.
 * Shots are listed in timeline order; `layer` controls stacking (higher = on top).
 * Filenames are relative to the project root. Generated files must be versioned:
 *   generated/higgsfield/shot-01-v01.mp4, shot-01-v02.mp4 …
 *
 * The shots below are a placeholder demo using only text / svg / logo / scene / adjustment,
 * so the project renders before any real media exists. Replace them with real shots.
 */
export const mainFilm: Manifest = {
  title: "MainFilm",
  width: 1920,
  height: 1080,
  fps: 30,
  background: "#000000",
  shots: [
    {
      id: "shot-01-title",
      type: "scene",
      scene: "TitleCard",
      sceneProps: { title: "Video Production", subtitle: "Remotion · Higgsfield · FFmpeg" },
      start: 0,
      duration: 90,
      transition: { in: { type: "fade", frames: 15 }, out: { type: "fade", frames: 15 } },
      animate: { keyframes: [{ frame: 0, scale: 1 }, { frame: 90, scale: 1.05 }], easing: "linear" },
      notes: "Placeholder title scene.",
    },
    {
      id: "shot-02-svg",
      type: "svg",
      filename: "generated/svg/example-draw-v01.svg",
      start: 75,
      duration: 75,
      width: 1100,
      drawFrames: 40,
      position: { x: 0, y: -60 },
      transition: { in: { type: "dissolve", frames: 15 }, out: { type: "fade", frames: 10 } },
      notes: "Stroke draw-on demo. Overlaps shot-01 by 15 frames (dissolve).",
    },
    {
      id: "shot-02-caption",
      type: "text",
      text: "Frame-accurate motion",
      textAnimation: "chars",
      textStyle: { fontSize: 64, fontWeight: 600 },
      start: 95,
      duration: 55,
      position: { x: 0, y: 200 },
      transition: { out: { type: "fade", frames: 10 } },
      layer: 1,
    },
    {
      id: "shot-03-logo",
      type: "logo",
      filename: "assets/logos/placeholder-logo.svg",
      text: "Production ready",
      start: 150,
      duration: 90,
      width: 700,
      mask: { type: "circle", frames: 20 },
      transition: { out: { type: "fade", frames: 20 } },
    },
    {
      id: "grade",
      type: "adjustment",
      adjustment: { vignette: 0.55, grain: 0.12, tint: "rgba(40,80,160,0.18)", tintBlend: "soft-light" },
      start: 0,
      duration: 240,
      layer: 10,
      notes: "Global look. Keep as the top layer.",
    },
  ],
};
