/**
 * Shot manifest types.
 *
 * ALL TIMING IS IN FRAMES (integers) at the composition's fps (30).
 *   1 second = 30 frames, 0.5 s = 15 frames, 2 s = 60 frames.
 */

export type ShotType =
  | "video" // video clip (mp4/mov/webm)
  | "image" // still image (png/jpg/webp)
  | "svg" // SVG file, optionally drawn on stroke-by-stroke
  | "text" // animated typography
  | "logo" // logo reveal
  | "audio" // audio track (music, VO, SFX)
  | "adjustment" // full-frame adjustment overlay (tint / vignette / grain / grade)
  | "scene"; // custom React scene from compositions/scenes (see registry.ts)

export type TransitionType =
  | "none"
  | "fade" // fade from/to transparent (black if nothing is underneath)
  | "dissolve"; // same opacity ramp, but meant to overlap with the neighbouring shot

export type TransitionSpec = {
  type: TransitionType;
  /** Length of the transition in frames. */
  frames: number;
};

export type Position = {
  /** Horizontal offset from frame centre in px (+ = right). */
  x: number;
  /** Vertical offset from frame centre in px (+ = down). */
  y: number;
};

/** A keyframe for scale / position / opacity / rotation animation. Frame is relative to shot start. */
export type Keyframe = {
  frame: number;
  x?: number;
  y?: number;
  scale?: number;
  opacity?: number;
  rotation?: number;
};

export type Easing = "linear" | "ease-in" | "ease-out" | "ease-in-out";

export type MaskSpec =
  | { type: "wipe"; direction: "left" | "right" | "up" | "down"; frames: number; delay?: number }
  | { type: "circle"; frames: number; delay?: number; /** final radius in % of frame diagonal, default 75 */ radius?: number }
  | { type: "inset"; /** static inset in % on each side */ top: number; right: number; bottom: number; left: number; round?: number }
  | { type: "feather"; /** edge softness in % */ amount: number };

export type TextStyle = {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number | string;
  color?: string;
  letterSpacing?: number;
  lineHeight?: number;
  textAlign?: "left" | "center" | "right";
  maxWidth?: number;
  textTransform?: "none" | "uppercase" | "lowercase";
};

export type TextAnimation = "fade-up" | "words" | "chars" | "typewriter" | "scale-in";

export type AdjustmentSpec = {
  /** CSS colour, e.g. "rgba(255,140,0,0.15)" */
  tint?: string;
  tintBlend?: "normal" | "multiply" | "screen" | "overlay" | "soft-light" | "color";
  /** 0..1 */
  vignette?: number;
  /** 0..1 film grain amount */
  grain?: number;
  /** Letterbox bars, height of each bar in px. */
  letterbox?: number;
};

export type Shot = {
  /** Unique id, also shown as the Sequence name in Remotion Studio. e.g. "shot-01" */
  id: string;
  type: ShotType;
  /**
   * Path relative to the project root, e.g.
   *   "generated/higgsfield/shot-01-v02.mp4" or "assets/logos/client.svg".
   * Not needed for text / adjustment / scene shots.
   */
  filename?: string;
  /** Start frame on the composition timeline. */
  start: number;
  /** Duration in frames. */
  duration: number;
  /** Offset from frame centre in px. Default {x:0, y:0}. */
  position?: Position;
  /** 1 = native fit (cover for video/image). Default 1. */
  scale?: number;
  /** 0..1. Default 1. */
  opacity?: number;
  transition?: { in?: TransitionSpec; out?: TransitionSpec };
  /** Optional scale/position animation; overrides static position/scale/opacity where defined. */
  animate?: { keyframes: Keyframe[]; easing?: Easing };
  mask?: MaskSpec;
  /** Stacking order. Higher draws on top. Default: manifest order. */
  layer?: number;

  // ---- media options ----
  /** Frames to skip at the start of the source file (video/audio). */
  trimBefore?: number;
  /** 0..1 (video/audio). */
  volume?: number;
  muted?: boolean;
  playbackRate?: number;
  loop?: boolean;
  fit?: "cover" | "contain";
  /** Slow push-in for stills: end scale relative to start, e.g. 1.08. */
  kenBurns?: number;

  // ---- text / logo / svg / scene options ----
  text?: string;
  textStyle?: TextStyle;
  textAnimation?: TextAnimation;
  /** Width of the svg/logo box in px. */
  width?: number;
  /** SVG: draw strokes on over this many frames (0 = static). */
  drawFrames?: number;
  adjustment?: AdjustmentSpec;
  /** For type "scene": key in compositions/scenes/registry.ts */
  scene?: string;
  sceneProps?: Record<string, unknown>;

  /** Free-form production notes (prompt used, client feedback, version history…). Not rendered. */
  notes?: string;
};

export type Manifest = {
  title: string;
  width: number;
  height: number;
  fps: number;
  /** Optional fixed length in frames. If omitted, the end of the last shot is used. */
  durationInFrames?: number;
  /** Background colour behind everything. */
  background?: string;
  shots: Shot[];
};
