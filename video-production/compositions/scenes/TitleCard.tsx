import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { AnimatedText } from "../../src/components";

/** Example modular scene: gradient background + headline + subline. */
export const TitleCard: React.FC<{ title?: string; subtitle?: string; from?: string; to?: string }> = ({
  title = "Title",
  subtitle,
  from = "#0b0b12",
  to = "#1d1d33",
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const angle = interpolate(frame, [0, durationInFrames], [120, 160]);
  return (
    <AbsoluteFill style={{ background: `linear-gradient(${angle}deg, ${from}, ${to})` }}>
      <AnimatedText text={title} animation="words" style={{ fontSize: 120 }} />
      {subtitle ? (
        <AbsoluteFill style={{ top: 220 }}>
          <AnimatedText text={subtitle} animation="fade-up" delay={12} style={{ fontSize: 40, fontWeight: 400, color: "#c9c9d6" }} />
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};
