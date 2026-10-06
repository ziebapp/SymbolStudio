import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { fadeOpacity } from "../engine/timing";

export type FadeProps = {
  /** Fade-in length in frames (from start of enclosing sequence). */
  inFrames?: number;
  /** Fade-out length in frames (ending at the end of the enclosing sequence). */
  outFrames?: number;
  children: React.ReactNode;
};

/**
 * Opacity fade in/out over the enclosing sequence.
 * Fade to black = Fade over a black background.
 */
export const Fade: React.FC<FadeProps> = ({ inFrames = 0, outFrames = 0, children }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return (
    <AbsoluteFill style={{ opacity: fadeOpacity(frame, durationInFrames, inFrames, outFrames) }}>
      {children}
    </AbsoluteFill>
  );
};

/**
 * Dissolve: identical opacity ramp, used on the INCOMING shot while it overlaps
 * the outgoing shot by `frames`. Example (30 fps, 15-frame dissolve):
 *   shot A: start 0,  duration 90
 *   shot B: start 75, duration 90, transition.in = {type:"dissolve", frames:15}
 * For a full cross-dissolve on two non-opaque layers, also fade A out over the same frames.
 */
export const Dissolve: React.FC<{ frames: number; children: React.ReactNode }> = ({ frames, children }) => (
  <Fade inFrames={frames}>{children}</Fade>
);
