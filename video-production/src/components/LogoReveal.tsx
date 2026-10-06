import React from "react";
import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { resolveSrc } from "./VideoClip";

export type LogoRevealProps = {
  /** Logo file (svg/png) relative to project root. */
  src: string;
  width?: number;
  /** "scale" = spring pop, "wipe" = left→right reveal, "blur" = focus pull. */
  style?: "scale" | "wipe" | "blur";
  delay?: number;
  /** Soft glow colour behind the logo, or undefined for none. */
  glow?: string;
  tagline?: string;
  taglineColor?: string;
};

/** Logo reveal with an optional tagline that follows ~12 frames later. */
export const LogoReveal: React.FC<LogoRevealProps> = ({
  src,
  width = 600,
  style = "scale",
  delay = 0,
  glow,
  tagline,
  taglineColor = "#ffffff",
}) => {
  const frame = useCurrentFrame() - delay;
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 12, mass: 0.7 } });
  const smooth = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 30 });
  const tag = spring({ frame: frame - 12, fps, config: { damping: 200 }, durationInFrames: 20 });

  let logoStyle: React.CSSProperties = {};
  if (style === "scale") {
    logoStyle = { transform: `scale(${interpolate(pop, [0, 1], [0.7, 1])})`, opacity: Math.min(1, smooth * 1.4) };
  } else if (style === "wipe") {
    logoStyle = { clipPath: `inset(0 ${(1 - smooth) * 100}% 0 0)` };
  } else {
    logoStyle = {
      filter: `blur(${interpolate(smooth, [0, 1], [24, 0])}px)`,
      opacity: smooth,
      transform: `scale(${interpolate(smooth, [0, 1], [1.15, 1])})`,
    };
  }

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 32 }}>
      {glow ? (
        <AbsoluteFill
          style={{
            background: `radial-gradient(circle at 50% 50%, ${glow} 0%, transparent 45%)`,
            opacity: smooth * 0.8,
          }}
        />
      ) : null}
      <Img src={resolveSrc(src)} style={{ width, ...logoStyle }} />
      {tagline ? (
        <div
          style={{
            fontFamily: "Inter, Helvetica Neue, Arial, sans-serif",
            fontSize: 36,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: taglineColor,
            opacity: tag,
            transform: `translateY(${(1 - tag) * 20}px)`,
          }}
        >
          {tagline}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
