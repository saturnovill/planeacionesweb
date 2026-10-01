import palabras from "../public/voz/palabras.json";
import { GUION, type IdEscena } from "./guion";

export const FPS = 30;
/** Cuadros antes de que empiece a hablar y después de que termine, en cada escena. */
export const ANTES = 10;
const DESPUES = 24;

type Voz = { dur: number; palabras: [string, number][]; real: boolean };

const sinAcotaciones = (t: string) => t.replace(/\[[^\]]+\]/g, " ").replace(/\s+/g, " ").trim();
const norm = (s: string) =>
  s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]/g, "");

/** Duración y tiempo (s) de cada palabra: del audio real, o estimados del texto si aún no hay audio. */
export function voz(id: IdEscena): Voz {
  const real = (palabras as unknown as Record<string, Omit<Voz, "real">>)[id];
  if (real) return { ...real, real: true };
  // ponytail: ≈14 caracteres por segundo más las pausas; se reemplaza en cuanto exista el mp3.
  let t = 0;
  const ps: [string, number][] = [];
  for (const parte of GUION[id].split(/(\[[^\]]+\])/)) {
    if (parte.startsWith("[")) {
      t += parte.includes("short") ? 0.35 : parte.includes("pause") ? 0.8 : 0;
      continue;
    }
    for (const w of parte.split(/\s+/).filter(Boolean)) {
      ps.push([w, t]);
      t += (w.length + 1) / 14;
    }
  }
  return { dur: t + 0.3, palabras: ps, real: false };
}

export const duracion = (id: IdEscena) => ANTES + Math.ceil(voz(id).dur * FPS) + DESPUES;

/** Cuadro (dentro de la escena) en que el narrador dice `frase`; la primera vez a partir del cuadro `desde`. */
export function momento(id: IdEscena, frase: string, desde = 0) {
  const ws = voz(id).palabras;
  const fs = frase.split(/\s+/).map(norm);
  for (let i = 0; i < ws.length; i++) {
    const f = ANTES + Math.round(ws[i][1] * FPS);
    if (f < desde) continue;
    if (fs.every((x, k) => ws[i + k] && norm(ws[i + k][0]).startsWith(x))) return f;
  }
  throw new Error(`"${frase}" no aparece en la voz de ${id}`);
}

/** Frases del guion (para subtítulos) con el cuadro en que empieza cada una. */
export function frases(id: IdEscena) {
  let desde = 0;
  return sinAcotaciones(GUION[id])
    .split(/(?<=[.!?])\s+/)
    .map((texto) => {
      try {
        desde = momento(id, texto.split(" ")[0], desde);
      } catch {
        // Whisper escribió distinto la primera palabra: se queda con el inicio anterior.
      }
      return { desde, texto };
    });
}
