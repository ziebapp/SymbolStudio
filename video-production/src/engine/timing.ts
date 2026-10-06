import { Easing as RemotionEasing, interpolate } from "remotion";
import type { Easing, Keyframe, Manifest } from "./types";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const easingFn = (e: Easing | undefined) => {
  switch (e) {
    case "linear":
      return RemotionEasing.linear;
    case "ease-in":
      return RemotionEasing.in(RemotionEasing.cubic);
    case "ease-out":
      return RemotionEasing.out(RemotionEasing.cubic);
    case "ease-in-out":
    default:
      return RemotionEasing.inOut(RemotionEasing.cubic);
  }
};

/** Opacity multiplier for in/out fades. `frame` is relative to the shot start. */
export const fadeOpacity = (
  frame: number,
  duration: number,
  inFrames: number,
  outFrames: number,
): number => {
  let o = 1;
  if (inFrames > 0) o *= interpolate(frame, [0, inFrames], [0, 1], clamp);
  if (outFrames > 0) o *= interpolate(frame, [duration - outFrames, duration], [1, 0], clamp);
  return o;
};

/** Interpolates one property across keyframes, falling back to `fallback` when no keyframe defines it. */
export const keyframeValue = (
  frame: number,
  keyframes: Keyframe[],
  prop: keyof Omit<Keyframe, "frame">,
  fallback: number,
  easing?: Easing,
): number => {
  const defined = keyframes
    .filter((k) => k[prop] !== undefined)
    .sort((a, b) => a.frame - b.frame);
  if (defined.length === 0) return fallback;
  if (defined.length === 1) return defined[0][prop] as number;
  return interpolate(
    frame,
    defined.map((k) => k.frame),
    defined.map((k) => k[prop] as number),
    { ...clamp, easing: easingFn(easing) },
  );
};

/** Composition length: explicit durationInFrames, or the end of the last shot. */
export const manifestDuration = (m: Manifest): number =>
  m.durationInFrames ??
  Math.max(1, ...m.shots.map((s) => s.start + s.duration));

/** Seconds → frames helper for authoring. Always rounds to whole frames. */
export const sec = (seconds: number, fps = 30): number => Math.round(seconds * fps);
