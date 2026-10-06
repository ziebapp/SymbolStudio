import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { keyframeValue } from "../engine/timing";
import type { Easing, Keyframe } from "../engine/types";

export type TransformProps = {
  /** Static values (used when no keyframe defines the property). */
  x?: number;
  y?: number;
  scale?: number;
  opacity?: number;
  rotation?: number;
  /** Keyframes, frame relative to the enclosing sequence. */
  keyframes?: Keyframe[];
  easing?: Easing;
  children: React.ReactNode;
};

/**
 * Scale / position / rotation / opacity animation around the frame centre.
 * Example push-in + drift: keyframes=[{frame:0, scale:1, x:0}, {frame:90, scale:1.1, x:-40}]
 */
export const Transform: React.FC<TransformProps> = ({
  x = 0,
  y = 0,
  scale = 1,
  opacity = 1,
  rotation = 0,
  keyframes = [],
  easing,
  children,
}) => {
  const frame = useCurrentFrame();
  const v = (p: "x" | "y" | "scale" | "opacity" | "rotation", d: number) =>
    keyframeValue(frame, keyframes, p, d, easing);
  return (
    <AbsoluteFill
      style={{
        transform: `translate(${v("x", x)}px, ${v("y", y)}px) scale(${v("scale", scale)}) rotate(${v("rotation", rotation)}deg)`,
        opacity: v("opacity", opacity),
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
