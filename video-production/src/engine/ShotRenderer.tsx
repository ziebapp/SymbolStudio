import React from "react";
import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";
import { sceneRegistry } from "../../compositions/scenes/registry";
import { Adjustment } from "../components/Adjustment";
import { AnimatedText } from "../components/AnimatedText";
import { AudioTrack } from "../components/AudioTrack";
import { Fade } from "../components/Fade";
import { LogoReveal } from "../components/LogoReveal";
import { Mask } from "../components/Mask";
import { StillImage } from "../components/StillImage";
import { SvgAnimation } from "../components/SvgAnimation";
import { Transform } from "../components/Transform";
import { VideoClip } from "../components/VideoClip";
import type { Manifest, Shot } from "./types";

const transitionFrames = (t: Shot["transition"], which: "in" | "out") => {
  const spec = t?.[which];
  return spec && spec.type !== "none" ? spec.frames : 0;
};

const need = (s: Shot): string => {
  if (!s.filename) throw new Error(`Shot "${s.id}" (type ${s.type}) needs a filename`);
  return s.filename;
};

/** The visual content of one shot, without timing / transform wrappers. */
const ShotContent: React.FC<{ shot: Shot }> = ({ shot: s }) => {
  switch (s.type) {
    case "video":
      return (
        <VideoClip
          src={need(s)}
          trimBefore={s.trimBefore}
          volume={s.volume}
          muted={s.muted}
          playbackRate={s.playbackRate}
          loop={s.loop}
          fit={s.fit}
        />
      );
    case "image":
      return <StillImage src={need(s)} fit={s.fit} kenBurns={s.kenBurns} />;
    case "svg":
      return <SvgAnimation src={need(s)} width={s.width} drawFrames={s.drawFrames} />;
    case "text":
      return <AnimatedText text={s.text ?? ""} animation={s.textAnimation} style={s.textStyle} />;
    case "logo":
      return <LogoReveal src={need(s)} width={s.width} tagline={s.text} />;
    case "adjustment":
      return <Adjustment {...s.adjustment} />;
    case "scene": {
      const Scene = s.scene ? sceneRegistry[s.scene] : undefined;
      if (!Scene) throw new Error(`Shot "${s.id}": unknown scene "${s.scene}" (see compositions/scenes/registry.ts)`);
      return <Scene {...(s.sceneProps ?? {})} />;
    }
    case "audio":
      return null; // handled separately (no visual layer)
  }
};

const ShotLayer: React.FC<{ shot: Shot }> = ({ shot: s }) => {
  const { fps } = useVideoConfig();
  const inF = transitionFrames(s.transition, "in");
  const outF = transitionFrames(s.transition, "out");

  if (s.type === "audio") {
    return (
      <Sequence name={s.id} from={s.start} durationInFrames={s.duration} premountFor={fps}>
        <AudioTrack
          src={need(s)}
          volume={s.volume}
          trimBefore={s.trimBefore}
          loop={s.loop}
          playbackRate={s.playbackRate}
          fadeInFrames={inF}
          fadeOutFrames={outF}
        />
      </Sequence>
    );
  }

  let content: React.ReactNode = <ShotContent shot={s} />;
  if (s.mask) content = <Mask mask={s.mask}>{content}</Mask>;

  return (
    <Sequence name={s.id} from={s.start} durationInFrames={s.duration} premountFor={fps}>
      <Fade inFrames={inF} outFrames={outF}>
        <Transform
          x={s.position?.x}
          y={s.position?.y}
          scale={s.scale}
          opacity={s.opacity}
          keyframes={s.animate?.keyframes}
          easing={s.animate?.easing}
        >
          {content}
        </Transform>
      </Fade>
    </Sequence>
  );
};

/** Renders a full manifest. Shots are stacked by `layer` (then manifest order). */
export const ManifestTimeline: React.FC<{ manifest: Manifest }> = ({ manifest }) => {
  const ordered = manifest.shots
    .map((shot, i) => ({ shot, i }))
    .sort((a, b) => (a.shot.layer ?? 0) - (b.shot.layer ?? 0) || a.i - b.i)
    .map(({ shot }) => shot);
  return (
    <AbsoluteFill style={{ backgroundColor: manifest.background ?? "#000" }}>
      {ordered.map((shot) => (
        <ShotLayer key={shot.id} shot={shot} />
      ))}
    </AbsoluteFill>
  );
};

/** Throws early on common manifest mistakes (non-integer frames, duplicate ids, missing files fields). */
export const validateManifest = (m: Manifest) => {
  const ids = new Set<string>();
  for (const s of m.shots) {
    if (ids.has(s.id)) throw new Error(`Duplicate shot id "${s.id}"`);
    ids.add(s.id);
    for (const [k, v] of [["start", s.start], ["duration", s.duration]] as const) {
      if (!Number.isInteger(v) || v < 0) throw new Error(`Shot "${s.id}": ${k} must be a whole frame number, got ${v}`);
    }
    if (s.duration === 0) throw new Error(`Shot "${s.id}": duration must be > 0`);
    if (["video", "image", "svg", "logo", "audio"].includes(s.type) && !s.filename)
      throw new Error(`Shot "${s.id}" (type ${s.type}) needs a filename`);
  }
};
