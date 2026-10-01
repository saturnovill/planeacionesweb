import React from "react";
import { Composition } from "remotion";
import { DURACION, Tutorial } from "./Tutorial";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="Tutorial"
      component={Tutorial}
      defaultProps={{ vista: "movil" as const }}
      durationInFrames={DURACION}
      fps={30}
      width={1920}
      height={1080}
    />
    <Composition
      id="TutorialEscritorio"
      component={Tutorial}
      defaultProps={{ vista: "escritorio" as const }}
      durationInFrames={DURACION}
      fps={30}
      width={1920}
      height={1080}
    />
  </>
);
