import type React from "react";
import { TitleCard } from "./TitleCard";

/**
 * Custom scenes referenced from a manifest with { type: "scene", scene: "<key>" }.
 * One file per scene in this folder, so a scene can be replaced without touching the rest of the film.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const sceneRegistry: Record<string, React.FC<any>> = {
  TitleCard,
};
