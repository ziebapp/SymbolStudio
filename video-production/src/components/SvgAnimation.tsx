import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  AbsoluteFill,
  Easing,
  cancelRender,
  continueRender,
  delayRender,
  interpolate,
  useCurrentFrame,
} from "remotion";
import { resolveSrc } from "./VideoClip";

export type SvgAnimationProps = {
  /** SVG file path relative to project root. */
  src: string;
  /** Rendered width in px (height follows the viewBox). */
  width?: number;
  /** Draw strokes on over this many frames. 0 = show static SVG. */
  drawFrames?: number;
  /** Frame (relative to sequence) at which drawing starts. */
  delay?: number;
  /** Stagger between successive paths, in frames. */
  stagger?: number;
  /** Fill fades in after the stroke is drawn, over this many frames. */
  fillFrames?: number;
};

/**
 * Loads an SVG file inline so its paths can be animated frame-accurately.
 * Stroke draw-on uses pathLength=1 + stroke-dashoffset, driven by useCurrentFrame()
 * (never CSS/SMIL animations — those are not frame-synced in renders).
 */
export const SvgAnimation: React.FC<SvgAnimationProps> = ({
  src,
  width = 800,
  drawFrames = 0,
  delay = 0,
  stagger = 2,
  fillFrames = 15,
}) => {
  const frame = useCurrentFrame();
  const ref = useRef<HTMLDivElement>(null);
  const [markup, setMarkup] = useState<string | null>(null);
  const [handle] = useState(() => delayRender(`Loading SVG ${src}`));

  useEffect(() => {
    fetch(resolveSrc(src))
      .then((r) => {
        if (!r.ok) throw new Error(`SVG not found: ${src}`);
        return r.text();
      })
      .then((t) => {
        setMarkup(t);
        continueRender(handle);
      })
      .catch((e) => cancelRender(e));
  }, [src, handle]);

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root || !markup) return;
    const svg = root.querySelector("svg");
    if (svg) {
      svg.setAttribute("width", String(width));
      svg.removeAttribute("height");
      svg.style.height = "auto";
      svg.style.overflow = "visible";
    }
    if (drawFrames <= 0) return;
    const shapes = Array.from(
      root.querySelectorAll<SVGGeometryElement>("path, line, polyline, polygon, circle, ellipse, rect"),
    );
    shapes.forEach((el, i) => {
      const start = delay + i * stagger;
      const p = interpolate(frame, [start, start + drawFrames], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.inOut(Easing.cubic),
      });
      const fillStart = start + drawFrames;
      const f = interpolate(frame, [fillStart, fillStart + fillFrames], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
      el.setAttribute("pathLength", "1");
      el.style.strokeDasharray = "1";
      el.style.strokeDashoffset = String(1 - p);
      el.style.fillOpacity = String(f);
      if (!el.getAttribute("stroke") && !el.style.stroke) {
        el.style.stroke = "currentColor";
        el.style.strokeWidth = "2";
      }
    });
  }, [frame, markup, width, drawFrames, delay, stagger, fillFrames]);

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div ref={ref} style={{ width, lineHeight: 0 }} dangerouslySetInnerHTML={{ __html: markup ?? "" }} />
    </AbsoluteFill>
  );
};
