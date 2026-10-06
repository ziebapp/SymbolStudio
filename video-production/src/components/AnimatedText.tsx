import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { TextAnimation, TextStyle } from "../engine/types";

export type AnimatedTextProps = {
  text: string;
  animation?: TextAnimation;
  style?: TextStyle;
  /** Frames between words/chars for "words" / "chars". */
  stagger?: number;
  /** Frame (relative to the sequence) the animation starts. */
  delay?: number;
};

const defaultStyle: Required<Omit<TextStyle, "maxWidth">> & { maxWidth?: number } = {
  fontFamily: "Inter, Helvetica Neue, Arial, sans-serif",
  fontSize: 96,
  fontWeight: 700,
  color: "#ffffff",
  letterSpacing: -1,
  lineHeight: 1.1,
  textAlign: "center",
  textTransform: "none",
};

/** Animated typography. All motion is frame-driven (spring / interpolate). */
export const AnimatedText: React.FC<AnimatedTextProps> = ({
  text,
  animation = "fade-up",
  style,
  stagger = 3,
  delay = 0,
}) => {
  const frame = useCurrentFrame() - delay;
  const { fps } = useVideoConfig();
  const s = { ...defaultStyle, ...style };
  const css: React.CSSProperties = {
    fontFamily: s.fontFamily,
    fontSize: s.fontSize,
    fontWeight: s.fontWeight,
    color: s.color,
    letterSpacing: s.letterSpacing,
    lineHeight: s.lineHeight,
    textAlign: s.textAlign,
    textTransform: s.textTransform,
    maxWidth: s.maxWidth ?? "85%",
    whiteSpace: "pre-wrap",
  };

  const unit = (i: number) =>
    spring({ frame: frame - i * stagger, fps, config: { damping: 200 }, durationInFrames: 20 });

  let content: React.ReactNode;
  switch (animation) {
    case "words":
    case "chars": {
      const parts = animation === "words" ? text.split(/(\s+)/) : Array.from(text);
      let idx = 0;
      content = parts.map((p, i) => {
        if (/^\s+$/.test(p)) return <span key={i}>{p}</span>;
        const v = unit(idx++);
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              opacity: v,
              transform: `translateY(${(1 - v) * 0.4}em)`,
            }}
          >
            {p}
          </span>
        );
      });
      break;
    }
    case "typewriter": {
      const chars = Math.floor(Math.max(0, frame) / Math.max(1, stagger / 2));
      content = (
        <>
          {text.slice(0, chars)}
          <span style={{ opacity: Math.floor(frame / 15) % 2 === 0 ? 1 : 0 }}>▍</span>
        </>
      );
      break;
    }
    case "scale-in": {
      const v = spring({ frame, fps, config: { damping: 14, mass: 0.8 } });
      content = (
        <span style={{ display: "inline-block", transform: `scale(${interpolate(v, [0, 1], [0.6, 1])})`, opacity: Math.min(1, v * 1.5) }}>
          {text}
        </span>
      );
      break;
    }
    case "fade-up":
    default: {
      const v = unit(0);
      content = (
        <span style={{ display: "inline-block", opacity: v, transform: `translateY(${(1 - v) * 40}px)` }}>
          {text}
        </span>
      );
    }
  }

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={css}>{content}</div>
    </AbsoluteFill>
  );
};
