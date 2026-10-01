/*
 * Tutorial para docentes (escritorio, con voz): perfil + documento de contenidos → nueva planeación → actividades.
 * Cada escena dura lo que su audio (src/voz.ts) y sus clics ocurren cuando el narrador dice la palabra indicada.
 */
import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  Sequence,
  Series,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { GUION, type IdEscena } from "./guion";
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
  useVista,
  VistaProvider,
} from "./ui";
import { ANTES, duracion, frases, momento, voz } from "./voz";

const aparecer = (frame: number, desde: number, d = 12) =>
  interpolate(frame, [desde, desde + d], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

/** Desplazamiento (px CSS) que deja la marca a `margen` px del borde superior de la ventana. */
function useHasta() {
  const v = useVista();
  return (c: string, marca: string, margen = 200) => Math.max(0, caja(v, c, marca).y - margen);
}

const PERFIL = "Paso 1 · Tu perfil";
const PLANEACION = "Paso 2 · Nueva planeación";
const ACTIVIDADES = "Paso 3 · Actividades";

// ── Pasos 1-2-3 (intro y cierre) ────────────────────────────────────────────
const PASOS = [
  ["1", "Completa tu perfil", "Nombre y documento de contenidos"],
  ["2", "Crea una planeación", "Datos, PDA y sesiones; la IA la redacta"],
  ["3", "Genera actividades", "Una hoja de ejercicios por sesión"],
];

const Pasos: React.FC<{ desde: number[]; hecho?: boolean }> = ({ desde, hecho }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ display: "flex", gap: 36 }}>
      {PASOS.map(([n, titulo, sub], i) => {
        const o = aparecer(frame, desde[i]);
        return (
          <div
            key={n}
            style={{
              width: 470,
              padding: "34px 36px",
              borderRadius: 28,
              background: "white",
              border: `2px solid ${o > 0.5 && hecho ? "#a5b4fc" : "#e0e7ff"}`,
              boxShadow: "0 20px 40px -20px rgba(15,23,42,.25)",
              opacity: o,
              transform: `translateY(${(1 - o) * 30}px)`,
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <span
              style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                background: INDIGO,
                color: "white",
                fontSize: 32,
                fontWeight: 800,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {hecho ? "✓" : n}
            </span>
            <span style={{ fontSize: 40, fontWeight: 800, color: TINTA }}>{titulo}</span>
            <span style={{ fontSize: 27, color: GRIS, lineHeight: 1.35 }}>{sub}</span>
          </div>
        );
      })}
    </div>
  );
};

const Centro: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      width: "100%",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 46,
      textAlign: "center",
    }}
  >
    {children}
  </div>
);

const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const m = (f: string, d?: number) => momento("s01", f, d);
  return (
    <Escena duracion={duracion("s01")}>
      <Centro>
        <div style={{ opacity: aparecer(frame, 0), fontSize: 30, fontWeight: 700, color: INDIGO, letterSpacing: 4 }}>
          TUTORIAL PARA DOCENTES
        </div>
        <div style={{ opacity: aparecer(frame, 6), fontSize: 120, fontWeight: 800, color: TINTA, letterSpacing: -3, lineHeight: 1 }}>
          Planeaciones
        </div>
        <Pasos desde={[m("perfil"), m("planeación"), m("actividades")]} />
      </Centro>
    </Escena>
  );
};

const Login: React.FC = () => {
  const m = (f: string, d?: number) => momento("s02", f, d);
  return (
    <Escena duracion={duracion("s02")}>
      <Panel
        paso="Antes de empezar"
        titulo="Inicia sesión"
        puntos={["Abre la aplicación en tu computadora", "Usuario y contraseña del administrador", "Clic en Entrar"]}
        puntosDesde={[m("Abre"), m("Escribe"), m("clic")]}
      />
      <Telefono
        captura="d01-login"
        resaltar={[
          { marca: "usuario", desde: m("usuario"), hasta: m("contraseña") + 5 },
          { marca: "password", desde: m("contraseña"), hasta: m("clic") },
        ]}
        toques={[{ cuadro: m("Entrar"), marca: "entrar" }]}
      />
    </Escena>
  );
};

const Inicio: React.FC = () => {
  const m = (f: string, d?: number) => momento("s03", f, d);
  return (
    <Escena duracion={duracion("s03")}>
      <Panel
        paso={PERFIL}
        titulo="La primera vez: tu perfil"
        texto="Inicio te pide tu nombre y tu documento de contenidos. Se capturan una sola vez."
        puntos={["Clic en «Ir a Perfil»", "O en «Perfil», en la barra de arriba"]}
        puntosDesde={[m("Haz"), m("También")]}
      />
      <Telefono
        captura="d02-inicio"
        resaltar={[{ marca: "aviso", desde: m("dos"), hasta: m("Haz") }]}
        toques={[
          { cuadro: m("Perfil"), marca: "ir" },
          { cuadro: m("botón") + 10, marca: "perfil" },
        ]}
      />
    </Escena>
  );
};

const Nombre: React.FC = () => {
  const m = (f: string, d?: number) => momento("s04", f, d);
  return (
    <Escena duracion={duracion("s04")}>
      <Panel
        paso={PERFIL}
        titulo="Tu nombre"
        texto="Escríbelo tal como quieres que aparezca en la planeación."
        puntos={["Ej.: Mtra. Ana López"]}
        puntosDesde={[m("ejemplo")]}
      />
      <Telefono
        captura="d03-perfil-vacio"
        resaltar={[{ marca: "nombre", desde: m("Nombre"), hasta: m("ejemplo") }]}
        toques={[{ cuadro: m("escribe"), marca: "nombre" }]}
        escribir={[{ marca: "nombre", texto: "Mtra. Ana López", desde: m("ejemplo") + 10 }]}
      />
    </Escena>
  );
};

// ── Formato del documento de contenidos ─────────────────────────────────────
// Cajas en px de la imagen d06-contenidos.png (primera página de fixtures/CONTENIDOS.docx a 110 dpi, 935 × 1210).
const DOC = { ancho: 935, mostrar: 700 };
const ZONAS = {
  tabla: { x: 110, y: 110, w: 715, h: 972 },
  contenido: { x: 110, y: 110, w: 151, h: 972 },
  g1: { x: 261, y: 145, w: 184, h: 937 },
  g2: { x: 445, y: 145, w: 190, h: 937 },
  g3: { x: 635, y: 145, w: 190, h: 937 },
  parrafo1: { x: 263, y: 336, w: 180, h: 128 },
  parrafo2: { x: 263, y: 468, w: 180, h: 176 },
  marca1: { x: 265, y: 296, w: 102, h: 26 },
  marca2: { x: 449, y: 832, w: 102, h: 26 },
};

const Zona: React.FC<{
  z: keyof typeof ZONAS;
  desde: number;
  hasta: number;
  etiqueta?: string;
  /** Etiqueta a la derecha de la zona (por defecto, arriba). */
  derecha?: boolean;
}> = ({ z, desde, hasta, etiqueta, derecha }) => {
  const frame = useCurrentFrame();
  const k = DOC.mostrar / DOC.ancho;
  const c = ZONAS[z];
  const o = interpolate(frame, [desde, desde + 8, hasta - 8, hasta], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        left: c.x * k - 4,
        top: c.y * k - 4,
        width: c.w * k + 8,
        height: c.h * k + 8,
        borderRadius: 8,
        border: `4px solid ${INDIGO}`,
        background: "rgba(79,70,229,.10)",
        opacity: o,
      }}
    >
      {etiqueta && (
        <span
          style={{
            position: "absolute",
            ...(derecha
              ? { left: "100%", top: "50%", transform: "translate(14px, -50%)" }
              : { left: "50%", top: -48, transform: "translateX(-50%)" }),
            whiteSpace: "nowrap",
            padding: "6px 16px",
            borderRadius: 999,
            background: INDIGO,
            color: "white",
            fontSize: 24,
            fontWeight: 700,
          }}
        >
          {etiqueta}
        </span>
      )}
    </div>
  );
};

const Formato: React.FC = () => {
  const frame = useCurrentFrame();
  const m = (f: string, d?: number) => momento("s05", f, d);
  const fin = duracion("s05");
  const word = m("Word");
  const columnas = m("Adentro");
  const primera = m("primera", m("cuatro"));
  const otras = m("otras");
  const parrafo = m("Escribe");
  const usado = m("trabajaste");
  const hoja = useEntrada(4, 16);
  return (
    <Escena duracion={fin}>
      <Panel
        paso={PERFIL}
        titulo="Documento de contenidos"
        puntos={[
          "Archivo de Word (.docx)",
          "Primera tabla, 4 columnas: Contenido · 1° · 2° · 3°",
          "Un PDA por párrafo",
          "PDA ya usado: fechas debajo («13 – 25 SEP», «QUINCENA 1»)",
        ]}
        puntosDesde={[word, columnas, parrafo, usado]}
      />
      <div
        style={{
          position: "relative",
          width: DOC.mostrar,
          marginRight: 160,
          opacity: hoja,
          transform: `translateY(${(1 - hoja) * 300}px)`,
        }}
      >
        <Img
          src={staticFile("capturas-docente/d06-contenidos.png")}
          style={{
            width: DOC.mostrar,
            display: "block",
            borderRadius: 6,
            boxShadow: "0 50px 90px -20px rgba(15,23,42,.45)",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: -90,
            top: 24,
            padding: "14px 26px",
            borderRadius: 18,
            background: "#2b579a",
            color: "white",
            fontSize: 34,
            fontWeight: 800,
            boxShadow: "0 16px 30px -10px rgba(15,23,42,.5)",
            opacity: aparecer(frame, word),
            transform: `scale(${0.6 + 0.4 * aparecer(frame, word)})`,
          }}
        >
          CONTENIDOS.docx
        </div>
        <Zona z="tabla" desde={columnas} hasta={primera} />
        <Zona z="contenido" desde={primera} hasta={otras} etiqueta="Contenido" />
        <Zona z="g1" desde={otras} hasta={parrafo} etiqueta="1°" />
        <Zona z="g2" desde={otras + 12} hasta={parrafo} etiqueta="2°" />
        <Zona z="g3" desde={otras + 24} hasta={parrafo} etiqueta="3°" />
        <Zona z="parrafo1" desde={parrafo} hasta={usado} etiqueta="Un PDA" derecha />
        <Zona z="parrafo2" desde={parrafo + 15} hasta={usado} etiqueta="Otro PDA" derecha />
        <Zona z="marca1" desde={usado} hasta={fin} etiqueta="Ya usado" derecha />
        <Zona z="marca2" desde={usado + 10} hasta={fin} />
      </div>
    </Escena>
  );
};

const Subir: React.FC = () => {
  const m = (f: string, d?: number) => momento("s06", f, d);
  const elige = m("elige");
  return (
    <Escena duracion={duracion("s06")}>
      <Panel
        paso={PERFIL}
        titulo="Sube tu documento"
        puntos={["Clic en «Seleccionar archivo»", "Elige tu archivo .docx", "Clic en Guardar"]}
        puntosDesde={[m("Seleccionar"), elige, m("Guardar")]}
      />
      <Telefono
        captura="d03-perfil-vacio"
        secuencia={[[elige + 8, "d04-perfil-lleno"]]}
        escribir={[{ marca: "nombre", texto: "Mtra. Ana López", desde: -100, captura: "d03-perfil-vacio" }]}
        resaltar={[{ marca: "archivo", desde: elige + 8, hasta: m("Guardar") }]}
        toques={[
          { cuadro: m("Seleccionar"), marca: "archivo" },
          { cuadro: m("Guardar"), marca: "guardar" },
        ]}
      />
    </Escena>
  );
};

const Guardado: React.FC = () => {
  const m = (f: string, d?: number) => momento("s07", f, d);
  const hasta = useHasta();
  const c = "d05-perfil-guardado";
  const abajo = m("abajo");
  return (
    <Escena duracion={duracion("s07")}>
      <Panel
        paso={PERFIL}
        titulo="Revisa tus contenidos"
        puntos={["Tus PDA, separados por grado", "Se hace una sola vez", "¿Cambiaron? Vuelve a subir el documento"]}
        puntosDesde={[m("verás"), m("Este"), m("cambias")]}
      />
      <Telefono
        captura={c}
        scroll={[
          [0, 0],
          [abajo, 0],
          [abajo + 30, hasta(c, "cargados", 120)],
        ]}
        resaltar={[
          { marca: "aviso", desde: m("Guardado"), hasta: abajo },
          { marca: "segundo", desde: m("grado"), hasta: m("Este") },
          { marca: "marca", desde: m("revisar"), hasta: duracion("s07") },
        ]}
      />
    </Escena>
  );
};

const Datos: React.FC = () => {
  const m = (f: string, d?: number) => momento("s08", f, d);
  const datos = m("Datos");
  const fechas = m("fechas");
  return (
    <Escena duracion={duracion("s08")}>
      <Panel
        paso={PLANEACION}
        titulo="Datos generales"
        puntos={["Tipo: por clases o por proyecto", "Escuela y grado", "Grupos", "Periodo: inicio y fin"]}
        puntosDesde={[m("tipo"), m("escuela"), m("grupos"), fechas]}
      />
      <Telefono
        captura="d07-inicio-listo"
        secuencia={[[datos - 6, "d08-nueva"]]}
        toques={[
          { cuadro: m("Nueva"), marca: "nueva" },
          { cuadro: m("tipo"), marca: "tipo" },
          { cuadro: m("escuela"), marca: "escuela" },
          { cuadro: m("grado"), marca: "grado" },
          { cuadro: m("grupos"), marca: "grupos" },
          { cuadro: m("inicio", fechas), marca: "inicio" },
          { cuadro: m("fin", fechas), marca: "fin" },
        ]}
      />
    </Escena>
  );
};

const Pdas: React.FC = () => {
  const m = (f: string, d?: number) => momento("s09", f, d);
  const hasta = useHasta();
  const c = "d08-nueva";
  return (
    <Escena duracion={duracion("s09")}>
      <Panel
        paso={PLANEACION}
        titulo="Elige tus PDA"
        puntos={["Marca uno o varios", "Etiqueta amarilla: PDA ya usado"]}
        puntosDesde={[m("Marca"), m("etiqueta")]}
      />
      <Telefono
        captura={c}
        scroll={[
          [0, 0],
          [ANTES, 0],
          [ANTES + 30, hasta(c, "seccion2", 150)],
        ]}
        toques={[{ cuadro: m("Marca"), marca: "pda" }]}
        resaltar={[
          { marca: "seccion2", desde: m("sección"), hasta: m("Marca") },
          { marca: "usado", desde: m("etiqueta"), hasta: duracion("s09") },
        ]}
      />
    </Escena>
  );
};

const Sesiones: React.FC = () => {
  const m = (f: string, d?: number) => momento("s10", f, d);
  const hasta = useHasta();
  const c = "d08-nueva";
  return (
    <Escena duracion={duracion("s10")}>
      <Panel
        paso={PLANEACION}
        titulo="Sesiones"
        puntos={["Cuántas: solo días con clase", "Tipo: clase, cálculo mental o evaluación", "Instrucción específica (opcional)"]}
        puntosDesde={[m("cuántas"), m("tipo"), m("específico")]}
      />
      <Telefono
        captura={c}
        scroll={[
          [0, hasta(c, "seccion2", 150)],
          [ANTES, hasta(c, "seccion2", 150)],
          [ANTES + 35, hasta(c, "sesiones", 220)],
        ]}
        resaltar={[{ marca: "sesiones", desde: m("cuántas"), hasta: m("tipo") }]}
        toques={[
          { cuadro: m("cálculo"), marca: "calculo" },
          { cuadro: m("instrucción"), marca: "nota" },
        ]}
      />
    </Escena>
  );
};

const Generar: React.FC = () => {
  const m = (f: string, d?: number) => momento("s11", f, d);
  const hasta = useHasta();
  const c = "d08-nueva";
  const clic = m("Generar");
  return (
    <Escena duracion={duracion("s11")}>
      <Panel
        paso={PLANEACION}
        titulo="Genera con IA"
        puntos={["Clic en «Generar planeación»", "Tarda alrededor de 1 minuto", "No cierres la página"]}
        puntosDesde={[clic, m("inteligencia"), m("cierres")]}
      />
      <Telefono
        captura={c}
        secuencia={[[clic + 12, "d09-generando"]]}
        scroll={[
          [0, hasta(c, "sesiones", 220)],
          [ANTES, hasta(c, "sesiones", 220)],
          [ANTES + 30, hasta(c, "generar", 600)],
        ]}
        toques={[{ cuadro: clic, marca: "generar" }]}
      />
    </Escena>
  );
};

/** Ventana con una hoja de Word que entra a la derecha. */
const ConHoja: React.FC<{ hoja: string; desde: number; children: React.ReactNode }> = ({ hoja, desde, children }) => (
  <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
    {children}
    <Hoja src={hoja} desde={desde} estilo={{ right: -40, top: 60, width: 560 }} />
  </div>
);

const Editor: React.FC = () => {
  const m = (f: string, d?: number) => momento("s12", f, d);
  const hasta = useHasta();
  const c = "d10-editor";
  const proposito = m("propósito");
  const sesiones = m("sesiones");
  return (
    <Escena duracion={duracion("s12")}>
      <Panel
        paso={PLANEACION}
        titulo="Revisa, guarda y descarga"
        puntos={["Corrige cualquier texto", "Clic en Guardar", "«Descargar .docx»: Word con el formato de tu escuela"]}
        puntosDesde={[m("corregir"), m("Guardar"), m("Descargar")]}
      />
      <ConHoja hoja="d11-word" desde={m("obtienes")}>
        <Telefono
          captura={c}
          scroll={[
            [0, 0],
            [proposito - 25, 0],
            [proposito, hasta(c, "proposito", 160)],
            [sesiones - 10, hasta(c, "proposito", 160)],
            [sesiones + 20, hasta(c, "sesion", 120)],
          ]}
          resaltar={[{ marca: "proposito", desde: proposito, hasta: sesiones }]}
          toques={[
            { cuadro: m("Guardar"), marca: "guardar" },
            { cuadro: m("Descargar"), marca: "descargar" },
          ]}
        />
      </ConHoja>
    </Escena>
  );
};

const AbrirActividades: React.FC = () => {
  const m = (f: string, d?: number) => momento("s13", f, d);
  const clic = m("Actividades por");
  return (
    <Escena duracion={duracion("s13")}>
      <Panel
        paso={ACTIVIDADES}
        titulo="Actividades por sesión"
        puntos={["Clic en «Actividades por sesión»", "Revisa la lista de sesiones", "Clic en «Generar actividades»"]}
        puntosDesde={[clic, m("lista"), m("Generar")]}
      />
      <Telefono
        captura="d10-editor"
        secuencia={[[clic + 15, "d12-actividades-antes"]]}
        resaltar={[{ marca: "lista", desde: m("lista"), hasta: m("Generar") }]}
        toques={[
          { cuadro: clic, marca: "actividades" },
          { cuadro: m("Generar"), marca: "generar" },
        ]}
      />
    </Escena>
  );
};

const Actividades: React.FC = () => {
  const m = (f: string, d?: number) => momento("s14", f, d);
  const descargar = m("descargar");
  return (
    <Escena duracion={duracion("s14")}>
      <Panel
        paso={ACTIVIDADES}
        titulo="Tu hoja de ejercicios"
        puntos={["Respuestas resaltadas en amarillo", "Edita y guarda tus cambios", "Descarga el Word"]}
        puntosDesde={[m("respuestas"), m("editar"), descargar]}
      />
      <ConHoja hoja="d14-word-actividades" desde={descargar + 10}>
        <Telefono
          captura="d13-actividades"
          resaltar={[
            { marca: "respuesta", desde: m("respuestas"), hasta: m("editar") },
            { marca: "reactivo", desde: m("editar"), hasta: m("guardar") },
          ]}
          toques={[
            { cuadro: m("guardar"), marca: "guardar" },
            { cuadro: descargar, marca: "descargar" },
          ]}
        />
      </ConHoja>
    </Escena>
  );
};

const Cierre: React.FC = () => {
  const frame = useCurrentFrame();
  const m = (f: string, d?: number) => momento("s15", f, d);
  return (
    <Escena duracion={duracion("s15")}>
      <Centro>
        <div style={{ opacity: aparecer(frame, 0), fontSize: 84, fontWeight: 800, color: TINTA, letterSpacing: -2 }}>
          ¡Eso es todo!
        </div>
        <Pasos desde={[m("perfil"), m("planeación"), m("actividades")]} hecho />
        <div style={{ opacity: aparecer(frame, m("Todas")), fontSize: 36, color: GRIS }}>
          Tus planeaciones quedan guardadas en <b style={{ color: TINTA }}>Mis planeaciones</b> (Inicio).
        </div>
        <div style={{ opacity: aparecer(frame, m("Mucho")), fontSize: 44, fontWeight: 700, color: INDIGO }}>
          ¡Mucho éxito en tus clases!
        </div>
      </Centro>
    </Escena>
  );
};

// ── Subtítulos ──────────────────────────────────────────────────────────────
const Subtitulos: React.FC<{ id: IdEscena }> = ({ id }) => {
  const frame = useCurrentFrame();
  const actual = frases(id).filter((f) => frame >= f.desde).at(-1);
  if (!actual) return null;
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 26 }}>
      <div
        style={{
          maxWidth: 1600,
          padding: "12px 30px",
          borderRadius: 16,
          background: "rgba(15,23,42,.85)",
          color: "white",
          fontFamily,
          fontSize: 32,
          lineHeight: 1.35,
          textAlign: "center",
        }}
      >
        {actual.texto}
      </div>
    </AbsoluteFill>
  );
};

const ESCENAS: [IdEscena, React.FC][] = [
  ["s01", Intro],
  ["s02", Login],
  ["s03", Inicio],
  ["s04", Nombre],
  ["s05", Formato],
  ["s06", Subir],
  ["s07", Guardado],
  ["s08", Datos],
  ["s09", Pdas],
  ["s10", Sesiones],
  ["s11", Generar],
  ["s12", Editor],
  ["s13", AbrirActividades],
  ["s14", Actividades],
  ["s15", Cierre],
];
if (ESCENAS.length !== Object.keys(GUION).length) throw new Error("Cada entrada del guion necesita su escena.");

export const DURACION_DOCENTE = ESCENAS.reduce((a, [id]) => a + duracion(id), 0);

export const TutorialDocente: React.FC = () => (
  <VistaProvider value="docente">
    <AbsoluteFill style={{ fontFamily, background: "#f8fafc" }}>
      <Series>
        {ESCENAS.map(([id, C]) => (
          <Series.Sequence key={id} durationInFrames={duracion(id)}>
            <C />
            <Subtitulos id={id} />
            {voz(id).real && (
              <Sequence from={ANTES}>
                <Audio src={staticFile(`voz/${id}.mp3`)} />
              </Sequence>
            )}
          </Series.Sequence>
        ))}
      </Series>
    </AbsoluteFill>
  </VistaProvider>
);
