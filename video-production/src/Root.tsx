import React from "react";
import { Composition, Folder } from "remotion";
import { MainFilm, MainFilmVertical } from "../compositions/MainFilm";
import { mainFilm } from "../compositions/main-film.manifest";
import { mainFilmVertical } from "../compositions/main-film-vertical.manifest";
import { validateManifest } from "./engine/ShotRenderer";
import { manifestDuration } from "./engine/timing";

validateManifest(mainFilm);
validateManifest(mainFilmVertical);

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="MainFilm"
        component={MainFilm}
        width={1920}
        height={1080}
        fps={30}
        durationInFrames={manifestDuration(mainFilm)}
      />
      <Composition
        id="MainFilmVertical"
        component={MainFilmVertical}
        width={1080}
        height={1920}
        fps={30}
        durationInFrames={manifestDuration(mainFilmVertical)}
      />
      <Folder name="Tests">
        {/* Registered so the component smoke test can render; safe to ignore. */}
        <Composition
          id="ComponentTest"
          lazyComponent={() => import("../compositions/tests/ComponentTest")}
          width={1280}
          height={720}
          fps={30}
          durationInFrames={90}
        />
      </Folder>
    </>
  );
};
