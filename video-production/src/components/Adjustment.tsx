import React from "react";
import { AbsoluteFill, random, useCurrentFrame } from "remotion";
import type { AdjustmentSpec } from "../engine/types";

/**
 * Full-frame adjustment overlay drawn ON TOP of the layers beneath it:
 * colour tint (with blend mode), vignette, animated film grain, letterbox bars.
 */
export const Adjustment: React.FC<AdjustmentSpec> = ({
  tint,
  tintBlend = "soft-light",
  vignette = 0,
  grain = 0,
  letterbox = 0,
}) => {
  const frame = useCurrentFrame();
  const seed = Math.floor(random(`grain-${frame}`) * 1000);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {tint ? <AbsoluteFill style={{ background: tint, mixBlendMode: tintBlend }} /> : null}
      {vignette > 0 ? (
        <AbsoluteFill
          style={{
            background: `radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,${vignette}) 100%)`,
          }}
        />
      ) : null}
      {grain > 0 ? (
        <AbsoluteFill style={{ opacity: grain, mixBlendMode: "overlay" }}>
          <svg width="100%" height="100%">
            <filter id={`grain-${seed}`}>
              <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={seed} stitchTiles="stitch" />
              <feColorMatrix type="saturate" values="0" />
            </filter>
            <rect width="100%" height="100%" filter={`url(#grain-${seed})`} />
          </svg>
        </AbsoluteFill>
      ) : null}
      {letterbox > 0 ? (
        <>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: letterbox, background: "#000" }} />
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: letterbox, background: "#000" }} />
        </>
      ) : null}
    </AbsoluteFill>
  );
};

/** Colour grade applied TO its children via CSS filters (brightness/contrast/saturation…). */
export const Grade: React.FC<{
  brightness?: number;
  contrast?: number;
  saturation?: number;
  hueRotate?: number;
  blur?: number;
  children: React.ReactNode;
}> = ({ brightness = 1, contrast = 1, saturation = 1, hueRotate = 0, blur = 0, children }) => (
  <AbsoluteFill
    style={{
      filter: `brightness(${brightness}) contrast(${contrast}) saturate(${saturation}) hue-rotate(${hueRotate}deg) blur(${blur}px)`,
    }}
  >
    {children}
  </AbsoluteFill>
);
