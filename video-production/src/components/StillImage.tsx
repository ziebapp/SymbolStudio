import React from "react";
import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { resolveSrc } from "./VideoClip";

export type StillImageProps = {
  src: string;
  fit?: "cover" | "contain";
  /** Slow push-in: end scale relative to start (1.08 = 8% zoom over the sequence). 1 = static. */
  kenBurns?: number;
};

/** Full-frame still image with optional Ken Burns push-in over the enclosing sequence. */
export const StillImage: React.FC<StillImageProps> = ({ src, fit = "cover", kenBurns = 1 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const s = interpolate(frame, [0, Math.max(1, durationInFrames - 1)], [1, kenBurns], {
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Img
        src={resolveSrc(src)}
        style={{ width: "100%", height: "100%", objectFit: fit, transform: `scale(${s})` }}
      />
    </AbsoluteFill>
  );
};
