import React, { createContext, useContext } from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import capturasMovil from "../public/capturas.json";
import capturasEscritorio from "../public/capturas-escritorio.json";

export const { fontFamily } = loadFont("normal", {
  weights: ["400", "600", "700", "800"],
  subsets: ["latin", "latin-ext"],
});

export const INDIGO = "#4f46e5";
export const TINTA = "#0f172a";
export const GRIS = "#475569";

type Caja = { x: number; y: number; w: number; h: number };
type Meta = Record<
  string,
  { alto: number; barra: boolean; marcas: Record<string, Caja> }
>;
export type Captura = keyof typeof capturasMovil;

// ── Vista: celular (teléfono) o escritorio (ventana de navegador) ───────────
export const VISTAS = {
  movil: {
    ancho: 390,
    alto: 844,
    escala: 1.12,
    dir: "capturas",
    meta: capturasMovil as Meta,
    panel: 760,
    titulo: 76,
    padding: 150,
  },
  escritorio: {
    // 1024 px sigue siendo vista de escritorio y deja la columna de la app más grande en el video.
    ancho: 1024,
    alto: 800,
    escala: 1.07,
    dir: "capturas-escritorio",
    meta: capturasEscritorio as Meta,
    panel: 560,
    titulo: 64,
    padding: 90,
  },
} as const;
export type Vista = keyof typeof VISTAS;
const VistaCtx = createContext<Vista>("movil");
export const VistaProvider = VistaCtx.Provider;
export const useVista = () => VISTAS[useContext(VistaCtx)];
export const useEsEscritorio = () => useContext(VistaCtx) === "escritorio";

export const caja = (v: (typeof VISTAS)[Vista], c: Captura, marca: string) =>
  v.meta[c].marcas[marca];

const suave = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
  easing: Easing.inOut(Easing.cubic),
} as const;

/** Valor animado entre fotogramas clave [[cuadro, valor], ...]. */
export function clave(frame: number, claves: [number, number][]) {
  if (claves.length === 1) return claves[0][1];
  return interpolate(
    frame,
    claves.map((k) => k[0]),
    claves.map((k) => k[1]),
    suave,
  );
}

/** Entrada con resorte (0 → 1) a partir de un cuadro. */
export function useEntrada(desde = 0, damping = 18) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - desde, fps, config: { damping } });
}

// ── Pantalla (teléfono o navegador) ─────────────────────────────────────────
export type Toque = { cuadro: number; marca: string };

// Ruta que se muestra en la barra de direcciones del navegador.
const RUTAS: Record<Captura, string> = {
  "01-login": "/login",
  "02-perfil": "/perfil",
  "03-nueva": "/nueva",
  "04-generando": "/nueva",
  "05-editor": "/p/8f3c…",
  "07-actividades": "/p/8f3c…/actividades",
  "09-proyecto": "/nueva",
  "10-proyecto-editor": "/p/b21e…",
  "12-inicio": "/",
};

/**
 * Captura real de la app dentro de un teléfono (vista móvil) o de una ventana de navegador (escritorio).
 * `scroll` son claves [cuadro, px CSS] para simular el desplazamiento; `toques` dibuja un dedo/clic sobre
 * la marca indicada; `resaltar` enmarca una marca en un rango de cuadros.
 */
export const Telefono: React.FC<{
  captura: Captura;
  scroll?: [number, number][];
  toques?: Toque[];
  resaltar?: { marca: string; desde: number; hasta: number }[];
  estilo?: React.CSSProperties;
}> = ({ captura, scroll = [[0, 0]], toques = [], resaltar = [], estilo }) => {
  const frame = useCurrentFrame();
  const v = useVista();
  const escritorio = useEsEscritorio();
  const info = v.meta[captura];
  const y = Math.min(clave(frame, scroll), Math.max(0, info.alto - v.alto));
  const W = v.ancho * v.escala;
  const H = v.alto * v.escala;

  const contenido = (
    <div
      style={{
        position: "relative",
        width: W,
        height: H,
        borderRadius: escritorio ? 0 : 50,
        overflow: "hidden",
        background: "#f8fafc",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: v.ancho,
          transform: `scale(${v.escala}) translateY(${-y}px)`,
          transformOrigin: "0 0",
        }}
      >
        <Img
          src={staticFile(`${v.dir}/${captura}.png`)}
          style={{ width: v.ancho, display: "block" }}
        />
        {resaltar.map((r) => {
          const c = caja(v, captura, r.marca);
          const o = interpolate(
            frame,
            [r.desde, r.desde + 8, r.hasta - 8, r.hasta],
            [0, 1, 1, 0],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
          );
          return (
            <div
              key={r.marca + r.desde}
              style={{
                position: "absolute",
                left: c.x - 6,
                top: c.y - 6,
                width: c.w + 12,
                height: c.h + 12,
                borderRadius: 12,
                border: `3px solid ${INDIGO}`,
                boxShadow: `0 0 0 6px rgba(79,70,229,.18)`,
                opacity: o,
              }}
            />
          );
        })}
      </div>
      {info.barra && (
        <Img
          src={staticFile(`${v.dir}/${captura}-barra.png`)}
          style={{ position: "absolute", left: 0, bottom: 0, width: W }}
        />
      )}
      {!escritorio && (
        <div
          style={{
            position: "absolute",
            top: 10,
            left: "50%",
            width: 110,
            height: 30,
            marginLeft: -55,
            borderRadius: 20,
            background: "#0b1020",
          }}
        />
      )}
      {toques.map((t) => (
        <Dedo
          key={t.marca + t.cuadro}
          cuadro={t.cuadro}
          caja={caja(v, captura, t.marca)}
          scroll={y}
          escala={v.escala}
          fijo={t.marca === "guardar" || t.marca === "descargar"}
        />
      ))}
    </div>
  );

  if (escritorio)
    return (
      <div
        style={{
          borderRadius: 18,
          overflow: "hidden",
          background: "#e2e8f0",
          boxShadow: "0 40px 80px -20px rgba(15,23,42,.45), 0 0 0 1px #cbd5e1",
          ...estilo,
        }}
      >
        <div
          style={{
            height: 52,
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "0 20px",
            background: "#f1f5f9",
            borderBottom: "1px solid #cbd5e1",
          }}
        >
          {["#f87171", "#fbbf24", "#34d399"].map((c) => (
            <span
              key={c}
              style={{ width: 14, height: 14, borderRadius: 7, background: c }}
            />
          ))}
          <div
            style={{
              marginLeft: 24,
              flex: 1,
              height: 32,
              borderRadius: 16,
              background: "white",
              border: "1px solid #e2e8f0",
              display: "flex",
              alignItems: "center",
              padding: "0 18px",
              fontSize: 18,
              color: GRIS,
            }}
          >
            localhost:3000{RUTAS[captura]}
          </div>
        </div>
        {contenido}
      </div>
    );

  return (
    <div
      style={{
        width: W + 28,
        height: H + 28,
        borderRadius: 64,
        background: "#0b1020",
        padding: 14,
        boxShadow:
          "0 40px 80px -20px rgba(15,23,42,.45), 0 0 0 2px #1e293b inset",
        ...estilo,
      }}
    >
      {contenido}
    </div>
  );
};

/** Círculo de "toque": aparece, se encoge al presionar y deja una onda. */
const Dedo: React.FC<{
  cuadro: number;
  caja: Caja;
  scroll: number;
  escala: number;
  fijo: boolean;
}> = ({ cuadro, caja: c, scroll, escala, fijo }) => {
  const frame = useCurrentFrame();
  const t = frame - cuadro;
  if (t < -12 || t > 30) return null;
  const x = (c.x + c.w / 2) * escala;
  const y = (c.y + c.h / 2 - (fijo ? 0 : scroll)) * escala;
  const aparece = interpolate(t, [-12, 0], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const presion = interpolate(t, [0, 4, 10], [1, 0.8, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const sale = interpolate(t, [18, 30], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const onda = interpolate(t, [0, 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: x - 40,
          top: y - 40,
          width: 80,
          height: 80,
          borderRadius: 40,
          border: `4px solid ${INDIGO}`,
          transform: `scale(${0.6 + onda * 1.1})`,
          opacity: t >= 0 ? (1 - onda) * 0.8 : 0,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: x - 26,
          top: y - 26,
          width: 52,
          height: 52,
          borderRadius: 26,
          background: "rgba(79,70,229,.35)",
          border: "3px solid rgba(255,255,255,.9)",
          boxShadow: "0 6px 16px rgba(15,23,42,.35)",
          transform: `scale(${presion})`,
          opacity: aparece * sale,
        }}
      />
    </>
  );
};

// ── Texto explicativo ───────────────────────────────────────────────────────
export const Panel: React.FC<{
  paso?: string;
  titulo: string;
  texto?: string;
  puntos?: string[];
  desde?: number;
}> = ({ paso, titulo, texto, puntos = [], desde = 0 }) => {
  const frame = useCurrentFrame();
  const v = useVista();
  const aparece = (d: number) => ({
    opacity: interpolate(frame, [desde + d, desde + d + 12], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
    transform: `translateY(${interpolate(frame, [desde + d, desde + d + 12], [24, 0], suave)}px)`,
  });
  return (
    <div
      style={{
        width: v.panel,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        gap: 28,
      }}
    >
      {paso && (
        <div
          style={{
            ...aparece(0),
            alignSelf: "flex-start",
            padding: "10px 22px",
            borderRadius: 999,
            background: "#e0e7ff",
            color: INDIGO,
            fontSize: 30,
            fontWeight: 700,
          }}
        >
          {paso}
        </div>
      )}
      <div
        style={{
          ...aparece(4),
          fontSize: v.titulo,
          lineHeight: 1.05,
          fontWeight: 800,
          color: TINTA,
          letterSpacing: -1.5,
        }}
      >
        {titulo}
      </div>
      {texto && (
        <div
          style={{
            ...aparece(10),
            fontSize: v.titulo * 0.47,
            lineHeight: 1.4,
            color: GRIS,
          }}
        >
          {texto}
        </div>
      )}
      {puntos.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {puntos.map((p, i) => (
            <div
              key={p}
              style={{
                ...aparece(16 + i * 14),
                display: "flex",
                gap: 18,
                alignItems: "flex-start",
                fontSize: v.titulo * 0.45,
                lineHeight: 1.3,
                color: TINTA,
              }}
            >
              <span
                style={{
                  flex: "0 0 36px",
                  height: 36,
                  borderRadius: 18,
                  background: INDIGO,
                  color: "white",
                  fontSize: 22,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: 3,
                }}
              >
                ✓
              </span>
              {p}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/** Fondo y transición de entrada/salida de cada escena. */
export const Escena: React.FC<{
  duracion: number;
  children: React.ReactNode;
}> = ({ duracion, children }) => {
  const frame = useCurrentFrame();
  const v = useVista();
  const o = interpolate(frame, [0, 10, duracion - 10, duracion], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill
      style={{
        fontFamily,
        background:
          "radial-gradient(1200px 800px at 85% 30%, #e0e7ff 0%, #f8fafc 60%)",
      }}
    >
      <AbsoluteFill
        style={{
          opacity: o,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          padding: `0 ${v.padding}px`,
        }}
      >
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Hoja de Word (primera página renderizada) que entra deslizándose. */
export const Hoja: React.FC<{
  src: string;
  desde: number;
  estilo?: React.CSSProperties;
}> = ({ src, desde, estilo }) => {
  const e = useEntrada(desde, 16);
  const v = useVista();
  return (
    <Img
      src={staticFile(`${v.dir}/${src}.png`)}
      style={{
        position: "absolute",
        width: 700,
        borderRadius: 6,
        boxShadow: "0 50px 90px -20px rgba(15,23,42,.5)",
        opacity: e,
        transform: `translateY(${(1 - e) * 500}px) rotate(${(1 - e) * 6 - 2}deg)`,
        ...estilo,
      }}
    />
  );
};
