import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import type { MaskSpec } from "../engine/types";

/** Simple masks: animated wipe, circle reveal, static inset (rounded) and feathered edges. */
export const Mask: React.FC<{ mask: MaskSpec; children: React.ReactNode }> = ({ mask, children }) => {
  const frame = useCurrentFrame();
  const progress = (frames: number, delay = 0) =>
    interpolate(frame, [delay, delay + Math.max(1, frames)], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.inOut(Easing.cubic),
    });

  let style: React.CSSProperties = {};
  switch (mask.type) {
    case "wipe": {
      const r = (1 - progress(mask.frames, mask.delay)) * 100;
      const inset = {
        right: `inset(0 ${r}% 0 0)`,
        left: `inset(0 0 0 ${r}%)`,
        down: `inset(0 0 ${r}% 0)`,
        up: `inset(${r}% 0 0 0)`,
      }[mask.direction];
      style = { clipPath: inset };
      break;
    }
    case "circle": {
      const r = progress(mask.frames, mask.delay) * (mask.radius ?? 75);
      style = { clipPath: `circle(${r}% at 50% 50%)` };
      break;
    }
    case "inset":
      style = {
        clipPath: `inset(${mask.top}% ${mask.right}% ${mask.bottom}% ${mask.left}% round ${mask.round ?? 0}px)`,
      };
      break;
    case "feather": {
      const a = mask.amount;
      const g = `linear-gradient(to right, transparent, black ${a}%, black ${100 - a}%, transparent), linear-gradient(to bottom, transparent, black ${a}%, black ${100 - a}%, transparent)`;
      style = { WebkitMaskImage: g, maskImage: g, WebkitMaskComposite: "source-in", maskComposite: "intersect" };
      break;
    }
  }
  return <AbsoluteFill style={style}>{children}</AbsoluteFill>;
};
