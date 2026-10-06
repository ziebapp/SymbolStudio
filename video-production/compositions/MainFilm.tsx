import React from "react";
import { ManifestTimeline } from "../src/engine/ShotRenderer";
import { mainFilm } from "./main-film.manifest";
import { mainFilmVertical } from "./main-film-vertical.manifest";

export const MainFilm: React.FC = () => <ManifestTimeline manifest={mainFilm} />;
export const MainFilmVertical: React.FC = () => <ManifestTimeline manifest={mainFilmVertical} />;
