import React from "react";
import { AbsoluteFill, interpolate, Series, useCurrentFrame } from "remotion";
import {
  caja,
  Escena,
  fontFamily,
  GRIS,
  Hoja,
  INDIGO,
  Panel,
  Telefono,
  TINTA,
  useEntrada,
  useEsEscritorio,
  useVista,
  VistaProvider,
  type Captura,
  type Vista,
} from "./ui";

// Duración de cada escena en cuadros (30 fps). Suma = 1800 = 60 s.
export const ESCENAS = {
  intro: 150,
  perfil: 150,
  nueva: 330,
  generando: 100,
  editor: 240,
  word: 160,
  actividades: 210,
  proyecto: 210,
  cierre: 250,
} as const;
export const DURACION = Object.values(ESCENAS).reduce((a, b) => a + b, 0);

/** Desplazamiento (px CSS) que deja la marca a `margen` px del borde superior de la pantalla. */
function useHasta() {
  const v = useVista();
  return (c: Captura, marca: string, margen = 220) =>
    Math.max(0, caja(v, c, marca).y - margen);
}

/** Pantalla con una hoja de Word que entra encima (a la derecha en escritorio). */
const ConHoja: React.FC<{
  children: React.ReactNode;
  hoja: string;
  desde: number;
}> = ({ children, hoja, desde }) => {
  const escritorio = useEsEscritorio();
  return (
    <div
      style={{
        position: "relative",
        width: escritorio ? 1100 : 720,
        height: 1000,
        display: "flex",
        alignItems: "center",
      }}
    >
      {children}
      <Hoja
        src={hoja}
        desde={desde}
        estilo={
          escritorio
            ? { right: -20, top: 150, width: 560 }
            : { left: 180, top: 120, width: 560 }
        }
      />
    </div>
  );
};

const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const v = useVista();
  const tel = useEntrada(20, 16);
  const chip = (d: number) => ({
    opacity: interpolate(frame, [d, d + 12], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  });
  return (
    <Escena duracion={ESCENAS.intro}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 30,
          width: v.panel + 100,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            ...chip(0),
            fontSize: 30,
            fontWeight: 700,
            color: INDIGO,
            letterSpacing: 4,
          }}
        >
          TUTORIAL · 1 MINUTO
        </div>
        <div
          style={{
            ...chip(4),
            fontSize: v.titulo * 1.55,
            fontWeight: 800,
            color: TINTA,
            letterSpacing: -3,
            lineHeight: 1,
          }}
        >
          Planeaciones
        </div>
        <div
          style={{ ...chip(14), fontSize: 44, lineHeight: 1.35, color: GRIS }}
        >
          Planeaciones de Matemáticas para secundaria, generadas con IA y listas
          en el formato oficial de tu escuela.
        </div>
        <div style={{ ...chip(40), display: "flex", flexWrap: "wrap", gap: 16 }}>
          {["SEC 27", "SEC 21", "Clases", "Proyectos", "Actividades"].map(
            (t) => (
              <span
                key={t}
                style={{
                  whiteSpace: "nowrap",
                  padding: "10px 22px",
                  borderRadius: 999,
                  background: "white",
                  border: "2px solid #c7d2fe",
                  color: INDIGO,
                  fontSize: 28,
                  fontWeight: 600,
                }}
              >
                {t}
              </span>
            ),
          )}
        </div>
      </div>
      <Telefono
        captura="01-login"
        toques={[{ cuadro: 110, marca: "entrar" }]}
        estilo={{ transform: `translateY(${(1 - tel) * 700}px)` }}
      />
    </Escena>
  );
};

const Perfil: React.FC = () => {
  const hasta = useHasta();
  return (
    <Escena duracion={ESCENAS.perfil}>
      <Panel
        paso="Paso 1 · Una sola vez"
        titulo="Sube tus contenidos"
        texto="El sistema lee los PDA de 1°, 2° y 3° de tu documento y marca los que ya usaste."
      />
      <Telefono
        captura="02-perfil"
        scroll={[
          [0, 0],
          [55, 0],
          [95, hasta("02-perfil", "segundo", 300)],
        ]}
        toques={[{ cuadro: 30, marca: "archivo" }]}
        resaltar={[{ marca: "marca", desde: 100, hasta: 150 }]}
      />
    </Escena>
  );
};

const Nueva: React.FC = () => {
  const hasta = useHasta();
  const c = "03-nueva" as const;
  return (
    <Escena duracion={ESCENAS.nueva}>
      <Panel
        paso="Paso 2"
        titulo="Nueva planeación"
        puntos={[
          "Por clases o por proyecto",
          "SEC 27 (con logos) o SEC 21",
          "Grado, grupos, periodo y PDA",
          "Sesiones: tipo e instrucción de cada una",
        ]}
      />
      <Telefono
        captura={c}
        scroll={[
          [0, 0],
          [60, 0],
          [100, hasta(c, "pda")],
          [160, hasta(c, "pda")],
          [205, hasta(c, "nota", 300)],
          [265, hasta(c, "nota", 300)],
          [300, hasta(c, "generar", 600)],
        ]}
        toques={[
          { cuadro: 20, marca: "tipo" },
          { cuadro: 45, marca: "escuela" },
          { cuadro: 125, marca: "pda" },
          { cuadro: 220, marca: "nota" },
          { cuadro: 250, marca: "calculo" },
          { cuadro: 315, marca: "generar" },
        ]}
      />
    </Escena>
  );
};

const Generando: React.FC = () => {
  const frame = useCurrentFrame();
  const puntos = ".".repeat(1 + (Math.floor(frame / 8) % 3));
  return (
    <Escena duracion={ESCENAS.generando}>
      <Panel
        paso="Paso 3"
        titulo={`La IA redacta${puntos}`}
        texto="Gemini escribe propósito, problemática, producto, articulación, ejes y cada sesión con inicio, desarrollo y cierre. Suele tardar entre 10 segundos y 1 minuto."
      />
      <Telefono captura="04-generando" />
    </Escena>
  );
};

const Editor: React.FC = () => {
  const hasta = useHasta();
  const c = "05-editor" as const;
  return (
    <Escena duracion={ESCENAS.editor}>
      <Panel
        paso="Paso 4"
        titulo="Revisa y edita"
        texto="Todo lo que propone la IA se puede corregir antes de descargar. Cada planeación queda guardada en tu historial."
      />
      <Telefono
        captura={c}
        scroll={[
          [0, 0],
          [40, 0],
          [90, hasta(c, "proposito", 160)],
          [130, hasta(c, "proposito", 160)],
          [200, hasta(c, "sesion", 200)],
          [215, 0],
        ]}
        toques={[
          { cuadro: 105, marca: "proposito" },
          { cuadro: 228, marca: "descargar" },
        ]}
      />
    </Escena>
  );
};

const Word: React.FC = () => {
  const frame = useCurrentFrame();
  const zoom = interpolate(frame, [20, ESCENAS.word], [1, 1.06], {
    extrapolateLeft: "clamp",
  });
  return (
    <Escena duracion={ESCENAS.word}>
      <Panel
        paso="Paso 5"
        titulo="Descarga en Word"
        texto="El formato oficial de tu escuela, con encabezado, logos y ciclo escolar. Listo para entregar."
      />
      <div style={{ position: "relative", width: 720, height: 960 }}>
        <Hoja
          src="06-word"
          desde={5}
          estilo={{ left: 10, top: 0, transform: `scale(${zoom})` }}
        />
      </div>
    </Escena>
  );
};

const Actividades: React.FC = () => (
  <Escena duracion={ESCENAS.actividades}>
    <Panel
      paso="Paso 6"
      titulo="Actividades por sesión"
      puntos={[
        "8 reactivos por clase: 6 directos y 2 con contexto",
        "10 operaciones de cálculo mental",
        "Respuestas para el docente, en un Word aparte",
      ]}
    />
    <ConHoja hoja="08-word-actividades" desde={110}>
      <Telefono
        captura="07-actividades"
        scroll={[
          [0, 0],
          [30, 0],
          [80, 200],
        ]}
        resaltar={[{ marca: "respuesta", desde: 30, hasta: 100 }]}
      />
    </ConHoja>
  </Escena>
);

const Proyecto: React.FC = () => (
  <Escena duracion={ESCENAS.proyecto}>
    <Panel
      paso="También"
      titulo="Planeación por proyecto"
      texto="Elige la metodología de la NEM y la IA reparte tus sesiones entre sus momentos."
      puntos={[
        "ABP comunitario (11 momentos)",
        "Indagación STEAM (5 fases)",
        "ABP de problemas · Aprendizaje Servicio",
      ]}
    />
    <ConHoja hoja="11-word-proyecto" desde={105}>
      <Telefono
        captura="09-proyecto"
        toques={[
          { cuadro: 25, marca: "proyecto" },
          { cuadro: 60, marca: "metodologia" },
        ]}
      />
    </ConHoja>
  </Escena>
);

const Cierre: React.FC = () => {
  const frame = useCurrentFrame();
  const items = [
    ["📄", "Contenidos y PDA desde tu documento"],
    ["🏫", "SEC 27 con logos · SEC 21"],
    ["🤖", "Sesiones, proyecto y actividades con IA"],
    ["✏️", "Todo editable antes de descargar"],
    ["🗂️", "Historial, duplicar y PDA ya planeados"],
    ["📱", "Hecha para el celular y la computadora"],
  ];
  return (
    <Escena duracion={ESCENAS.cierre}>
      <div
        style={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 50,
        }}
      >
        <div
          style={{
            fontSize: 96,
            fontWeight: 800,
            color: TINTA,
            letterSpacing: -2,
          }}
        >
          Planeaciones
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "26px 40px",
            width: 1500,
          }}
        >
          {items.map(([icono, texto], i) => {
            const d = 15 + i * 10;
            const o = interpolate(frame, [d, d + 12], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            return (
              <div
                key={texto}
                style={{
                  opacity: o,
                  transform: `translateY(${(1 - o) * 20}px)`,
                  display: "flex",
                  gap: 22,
                  alignItems: "center",
                  padding: "26px 32px",
                  borderRadius: 24,
                  background: "white",
                  border: "2px solid #e0e7ff",
                  fontSize: 36,
                  color: TINTA,
                  fontWeight: 600,
                }}
              >
                <span style={{ fontSize: 46 }}>{icono}</span>
                {texto}
              </div>
            );
          })}
        </div>
        <div
          style={{
            opacity: interpolate(frame, [110, 125], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            fontSize: 30,
            color: GRIS,
          }}
        >
          Next.js · Supabase · Gemini
        </div>
      </div>
    </Escena>
  );
};

export const Tutorial: React.FC<{ vista: Vista }> = ({ vista }) => (
  <VistaProvider value={vista}>
    <AbsoluteFill style={{ fontFamily, background: "#f8fafc" }}>
      <Series>
        <Series.Sequence durationInFrames={ESCENAS.intro}>
          <Intro />
        </Series.Sequence>
        <Series.Sequence durationInFrames={ESCENAS.perfil}>
          <Perfil />
        </Series.Sequence>
        <Series.Sequence durationInFrames={ESCENAS.nueva}>
          <Nueva />
        </Series.Sequence>
        <Series.Sequence durationInFrames={ESCENAS.generando}>
          <Generando />
        </Series.Sequence>
        <Series.Sequence durationInFrames={ESCENAS.editor}>
          <Editor />
        </Series.Sequence>
        <Series.Sequence durationInFrames={ESCENAS.word}>
          <Word />
        </Series.Sequence>
        <Series.Sequence durationInFrames={ESCENAS.actividades}>
          <Actividades />
        </Series.Sequence>
        <Series.Sequence durationInFrames={ESCENAS.proyecto}>
          <Proyecto />
        </Series.Sequence>
        <Series.Sequence durationInFrames={ESCENAS.cierre}>
          <Cierre />
        </Series.Sequence>
      </Series>
    </AbsoluteFill>
  </VistaProvider>
);
