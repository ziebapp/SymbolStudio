import { Video } from "@remotion/media";
import React from "react";
import { AbsoluteFill, staticFile } from "remotion";

export type VideoClipProps = {
  /** Path relative to project root, e.g. "generated/higgsfield/shot-01-v01.mp4". */
  src: string;
  /** Frames skipped at the start of the source file. */
  trimBefore?: number;
  volume?: number;
  muted?: boolean;
  playbackRate?: number;
  loop?: boolean;
  fit?: "cover" | "contain";
};

/** Full-frame video clip. Place inside a <Sequence> (or use via the manifest) to time it. */
export const VideoClip: React.FC<VideoClipProps> = ({
  src,
  trimBefore,
  volume = 1,
  muted = false,
  playbackRate = 1,
  loop = false,
  fit = "cover",
}) => {
  return (
    <AbsoluteFill>
      <Video
        src={resolveSrc(src)}
        trimBefore={trimBefore}
        volume={volume}
        muted={muted}
        playbackRate={playbackRate}
        loop={loop}
        objectFit={fit}
        style={{ width: "100%", height: "100%" }}
      />
    </AbsoluteFill>
  );
};

/** Project-root relative path → served URL. Remote URLs pass through. */
export const resolveSrc = (src: string) =>
  /^https?:\/\//.test(src) ? src : staticFile(src.replace(/^\.?\//, ""));
