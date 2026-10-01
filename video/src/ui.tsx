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
import capturasDocente from "../public/capturas-docente.json";

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
  { alto: number; barra: boolean; ruta?: string; marcas: Record<string, Caja> }
>;
export type Captura = string;

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
    abajo: 0,
    puntero: false,
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
    abajo: 0,
    puntero: false,
  },
  // Tutorial para docentes: ventana un poco menor para dejar abajo el espacio de los subtítulos, y puntero de mouse.
  docente: {
    ancho: 1024,
    alto: 800,
    escala: 1.1,
    dir: "capturas-docente",
    meta: capturasDocente as Meta,
    panel: 560,
    titulo: 60,
    padding: 90,
    abajo: 110,
    puntero: true,
  },
} as const;
export type Vista = keyof typeof VISTAS;
const VistaCtx = createContext<Vista>("movil");
export const VistaProvider = VistaCtx.Provider;
export const useVista = () => VISTAS[useContext(VistaCtx)];
export const useEsEscritorio = () => useContext(VistaCtx) !== "movil";

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
const RUTAS: Record<string, string> = {
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
  /** Cambios de captura en el tiempo: [[cuadro, captura], ...] (la primera es `captura`). */
  secuencia?: [number, Captura][];
  scroll?: [number, number][];
  toques?: Toque[];
  resaltar?: { marca: string; desde: number; hasta: number }[];
  /** Texto que se va tecleando dentro de un campo (solo sobre `captura`, si se indica). */
  escribir?: { marca: string; texto: string; desde: number; captura?: Captura }[];
  estilo?: React.CSSProperties;
}> = ({ captura: inicial, secuencia = [], scroll = [[0, 0]], toques = [], resaltar = [], escribir = [], estilo }) => {
  const frame = useCurrentFrame();
  const v = useVista();
  const escritorio = useEsEscritorio();
  const capturaEn = (f: number) =>
    secuencia.filter(([k]) => f >= k).at(-1)?.[1] ?? inicial;
  const captura = capturaEn(frame);
  const info = v.meta[captura];
  const yEn = (f: number) =>
    Math.min(clave(f, scroll), Math.max(0, v.meta[capturaEn(f)].alto - v.alto));
  const y = yEn(frame);
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
        {escribir
          .filter((e) => (e.captura ?? captura) === captura)
          .map((e) => {
            const c = caja(v, captura, e.marca);
            const n = Math.floor(
              interpolate(frame - e.desde, [0, e.texto.length * 2], [0, e.texto.length], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            );
            const cursor = frame >= e.desde && Math.floor(frame / 15) % 2 === 0;
            return (
              <div
                key={e.marca + e.desde}
                style={{
                  position: "absolute",
                  left: c.x + 13,
                  top: c.y,
                  height: c.h,
                  lineHeight: `${c.h}px`,
                  fontSize: 14,
                  color: TINTA,
                  whiteSpace: "pre",
                }}
              >
                {e.texto.slice(0, n)}
                <span style={{ opacity: cursor ? 1 : 0 }}>|</span>
              </div>
            );
          })}
        {resaltar.filter((r) => info.marcas[r.marca]).map((r) => {
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
      {v.puntero && (
        <Puntero
          puntos={toques.map((t) => {
            const c = caja(v, capturaEn(t.cuadro), t.marca);
            const fijo = t.marca === "guardar" || t.marca === "descargar";
            return {
              cuadro: t.cuadro,
              x: (c.x + c.w / 2) * v.escala,
              y: (c.y + c.h / 2 - (fijo ? 0 : yEn(t.cuadro))) * v.escala,
            };
          })}
          ancho={W}
          alto={H}
        />
      )}
      {!v.puntero && toques.map((t) => (
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
            localhost:3000{info.ruta ?? RUTAS[captura]}
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

/**
 * Puntero de mouse (vista de escritorio): espera en el último clic, viaja al siguiente en
 * los ~18 cuadros previos y al hacer clic se encoge y deja una onda.
 */
const Puntero: React.FC<{
  puntos: { cuadro: number; x: number; y: number }[];
  ancho: number;
  alto: number;
}> = ({ puntos, ancho, alto }) => {
  const frame = useCurrentFrame();
  if (!puntos.length) return null;
  const ps = [{ cuadro: -999, x: ancho * 0.72, y: alto * 0.92 }, ...puntos];
  const sig = ps.findIndex((p) => p.cuadro > frame);
  const a = ps[sig === -1 ? ps.length - 1 : sig - 1];
  const b = sig === -1 ? a : ps[sig];
  const viaje = Math.min(18, b.cuadro - a.cuadro - 2);
  const t = sig === -1 ? 1 : interpolate(frame, [b.cuadro - viaje, b.cuadro - 2], [0, 1], suave);
  const x = a.x + (b.x - a.x) * t;
  const y = a.y + (b.y - a.y) * t;
  const ultimo = [...puntos].reverse().find((p) => p.cuadro <= frame);
  const dt = ultimo ? frame - ultimo.cuadro : 99;
  const presion = interpolate(dt, [0, 3, 8], [1, 0.82, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const onda = interpolate(dt, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <>
      {ultimo && dt <= 20 && (
        <div
          style={{
            position: "absolute",
            left: ultimo.x - 30,
            top: ultimo.y - 30,
            width: 60,
            height: 60,
            borderRadius: 30,
            border: `4px solid ${INDIGO}`,
            background: "rgba(79,70,229,.15)",
            transform: `scale(${0.4 + onda})`,
            opacity: 1 - onda,
          }}
        />
      )}
      <svg
        width={34}
        height={34}
        viewBox="0 0 24 24"
        style={{
          position: "absolute",
          left: x - 6,
          top: y - 3,
          transform: `scale(${presion})`,
          transformOrigin: "6px 3px",
          filter: "drop-shadow(0 3px 4px rgba(15,23,42,.35))",
        }}
      >
        <path
          d="M5 3l14 8.5-6.2 1.3 3.7 6.9-2.6 1.4-3.7-6.9L5 18.6z"
          fill="#0f172a"
          stroke="white"
          strokeWidth={1.4}
          strokeLinejoin="round"
        />
      </svg>
    </>
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
  /** Cuadro en que aparece cada punto (por defecto, uno tras otro). */
  puntosDesde?: number[];
  desde?: number;
}> = ({ paso, titulo, texto, puntos = [], puntosDesde, desde = 0 }) => {
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
                ...aparece(puntosDesde ? puntosDesde[i] - desde : 16 + i * 14),
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
          padding: `0 ${v.padding}px ${v.abajo}px`,
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
