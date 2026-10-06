import type { Manifest } from "../src/engine/types";

/**
 * MainFilmVertical — 1080x1920 @ 30 fps (Reels / Shorts / TikTok).
 * Same conventions as main-film.manifest.ts. Keep text inside the safe area
 * (avoid the top ~250 px and bottom ~350 px where platform UI sits).
 */
export const mainFilmVertical: Manifest = {
  title: "MainFilmVertical",
  width: 1080,
  height: 1920,
  fps: 30,
  background: "#000000",
  shots: [
    {
      id: "shot-01-title",
      type: "scene",
      scene: "TitleCard",
      sceneProps: { title: "Video\nProduction", subtitle: "Vertical 9:16" },
      start: 0,
      duration: 90,
      transition: { in: { type: "fade", frames: 15 }, out: { type: "fade", frames: 15 } },
    },
    {
      id: "shot-02-logo",
      type: "logo",
      filename: "assets/logos/placeholder-logo.svg",
      start: 90,
      duration: 90,
      width: 700,
      mask: { type: "wipe", direction: "right", frames: 20 },
      transition: { out: { type: "fade", frames: 20 } },
    },
    {
      id: "grade",
      type: "adjustment",
      adjustment: { vignette: 0.5, grain: 0.1 },
      start: 0,
      duration: 180,
      layer: 10,
    },
  ],
};
