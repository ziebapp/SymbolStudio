import { Audio } from "@remotion/media";
import React from "react";
import { interpolate, useVideoConfig } from "remotion";
import { resolveSrc } from "./VideoClip";

export type AudioTrackProps = {
  src: string;
  /** 0..1 */
  volume?: number;
  /** Fade-in / fade-out in frames (relative to the enclosing sequence). */
  fadeInFrames?: number;
  fadeOutFrames?: number;
  trimBefore?: number;
  loop?: boolean;
  playbackRate?: number;
};

/** Audio track with frame-accurate volume fades. Time it with a <Sequence> or via the manifest. */
export const AudioTrack: React.FC<AudioTrackProps> = ({
  src,
  volume = 1,
  fadeInFrames = 0,
  fadeOutFrames = 0,
  trimBefore,
  loop = false,
  playbackRate = 1,
}) => {
  const { durationInFrames } = useVideoConfig();
  return (
    <Audio
      src={resolveSrc(src)}
      trimBefore={trimBefore}
      loop={loop}
      playbackRate={playbackRate}
      volume={(f) => {
        let v = volume;
        if (fadeInFrames > 0)
          v *= interpolate(f, [0, fadeInFrames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        if (fadeOutFrames > 0)
          v *= interpolate(f, [durationInFrames - fadeOutFrames, durationInFrames], [1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
        return v;
      }}
    />
  );
};
