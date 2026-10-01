/*
 * Guion de la voz en off del tutorial para docentes, una entrada por escena.
 * Cada texto se genera en ElevenLabs (voz "Marto", modelo Eleven v4) y se guarda como public/voz/<id>.mp3.
 * Los [corchetes] son acotaciones de Eleven v4 (pausas y tono): marcan los tiempos entre acciones.
 * Después:  uv run --python 3.12 --with faster-whisper palabras.py  → tiempos por palabra para sincronizar.
 * Mientras falte un audio, la escena usa una duración estimada y no suena.
 */
export const GUION = {
  s01: "[warmly] ¡Hola, maestra! ¡Hola, maestro! [short pause] En este tutorial vas a aprender, paso a paso, a completar tu perfil, a crear tu primera planeación, y a generar las actividades para tus clases. [pause] ¡Empecemos!",
  s02: "Abre la aplicación desde tu computadora. [pause] Escribe el usuario y la contraseña que te dio el administrador, [short pause] y haz clic en Entrar.",
  s03: "La primera vez, la página de inicio te pide dos cosas: tu nombre, y tu documento de contenidos. [pause] Haz clic en Ir a Perfil. [short pause] También puedes entrar desde el botón Perfil, en la barra de arriba.",
  s04: "En Nombre del docente, escribe tu nombre tal como quieres que aparezca en la planeación. [pause] Por ejemplo: Maestra Ana López.",
  s05: "Ahora, lo más importante: el documento de contenidos. [pause] Debe ser un archivo de Word, con extensión punto doc equis. [pause] Adentro, la primera tabla del documento debe tener cuatro columnas: [short pause] en la primera, el contenido; [short pause] y en las otras tres, los PDA de primero, segundo y tercer grado. [pause] Escribe cada PDA en su propio párrafo. [pause] Y si ya trabajaste un PDA, anota debajo las fechas, por ejemplo: trece a veinticinco SEP, [short pause] o Quincena uno. Así, la aplicación lo marcará como usado.",
  s06: "De regreso en tu perfil, haz clic en Seleccionar archivo, [short pause] y elige tu documento. [pause] Después, presiona Guardar.",
  s07: "¡Listo! Aparece el mensaje Guardado. [pause] Más abajo, en Contenidos cargados, verás tus PDA separados por grado. [short pause] Ábrelos para revisar que estén todos. [pause] Este paso se hace una sola vez. Si cambias tus contenidos, solo vuelve a subir el documento.",
  s08: "Ahora sí, vamos a crear una planeación. [short pause] En la página de inicio, haz clic en Nueva planeación. [pause] En Datos generales, elige el tipo: por clases, o por proyecto. [short pause] Luego selecciona tu escuela y el grado, [short pause] escribe tus grupos, [short pause] y elige las fechas de inicio y fin del periodo.",
  s09: "En la sección dos aparecen los PDA del grado que elegiste. [short pause] Marca uno o varios. [pause] Los que ya usaste tienen una etiqueta amarilla, para que no los repitas.",
  s10: "En la sección tres, escribe cuántas sesiones vas a dar, contando solo los días con clase. [pause] A cada sesión le puedes cambiar el tipo, por ejemplo: cálculo mental, o evaluación. [short pause] Y si quieres algo específico, escríbelo en su instrucción.",
  s11: "Cuando todo esté listo, haz clic en Generar planeación. [pause] La inteligencia artificial tarda alrededor de un minuto. [short pause] No cierres la página mientras trabaja.",
  s12: "¡Aquí está tu planeación! [pause] Revisa cada apartado: el propósito, las sesiones, y todo lo demás. Puedes corregir cualquier texto directamente. [pause] Cuando termines, presiona Guardar. [short pause] Y con Descargar punto doc equis, obtienes tu planeación en Word, con el formato de tu escuela.",
  s13: "Para las actividades, haz clic en Actividades por sesión, arriba de tu planeación. [pause] Verás la lista de sesiones y cuántos reactivos tendrá cada una. [short pause] Haz clic en Generar actividades.",
  s14: "En más o menos un minuto, tendrás una hoja de ejercicios para cada sesión, [short pause] con las respuestas resaltadas en amarillo. [pause] Puedes editar cualquier reactivo, guardar tus cambios, [short pause] y descargar las actividades en Word.",
  s15: "[warmly] ¡Y eso es todo! [pause] Recuerda: primero completa tu perfil, [short pause] luego crea tu planeación, [short pause] y al final, genera tus actividades. [pause] Todas tus planeaciones quedan guardadas en la página de inicio. [short pause] ¡Mucho éxito en tus clases!",
} as const;
export type IdEscena = keyof typeof GUION;
