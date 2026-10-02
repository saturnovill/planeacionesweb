/*
 * Conversión entre el mini-formato guardado (ver planeacion.ts) y el editor de texto rico.
 *   "# texto" ⇄ párrafo todo en negritas · "- " ⇄ viñeta · "-- " ⇄ sub-viñeta · "**x**" ⇄ negritas dentro del texto
 */

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const inline = (s: string) => esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

/** Mini-formato → HTML que entiende el editor. */
export function markupAHtml(texto: string) {
  let html = "";
  let nivel = 0; // listas abiertas: 0, 1 (viñeta) o 2 (sub-viñeta)
  const cerrarA = (n: number) => {
    for (; nivel > n; nivel--) html += "</li></ul>";
  };
  for (const l of texto.split("\n").map((l) => l.trim()).filter(Boolean)) {
    const sub = l.startsWith("-- ");
    const vin = !sub && /^[-•] /.test(l);
    if (sub || vin) {
      const n = sub ? 2 : 1;
      cerrarA(n);
      if (nivel === n) html += "</li>";
      // Una sub-viñeta sin viñeta previa se abre dentro de una viñeta vacía.
      for (; nivel < n; nivel++) html += nivel < n - 1 ? "<ul><li><p></p>" : "<ul>";
      html += `<li><p>${inline(l.slice(sub ? 3 : 2))}</p>`;
    } else {
      cerrarA(0);
      html += l.startsWith("# ") ? `<p><strong>${inline(l.slice(2))}</strong></p>` : `<p>${inline(l)}</p>`;
    }
  }
  cerrarA(0);
  return html;
}

export type Nodo = { type: string; text?: string; marks?: { type: string }[]; content?: Nodo[] };

/** Documento del editor (editor.getJSON()) → mini-formato. */
export function jsonAMarkup(doc: Nodo) {
  const lineas: string[] = [];
  const parrafo = (p: Nodo, prefijo: string) => {
    const ts = (p.content ?? []).filter((t) => t.text);
    const negrita = (t: Nodo) => t.marks?.some((m) => m.type === "bold");
    const texto = ts.map((t) => (negrita(t) && t.text!.trim() ? `**${t.text}**` : t.text)).join("").replace(/\*\*\*\*/g, "").trim();
    if (!texto) return;
    const todo = !prefijo && ts.every((t) => negrita(t) || !t.text!.trim());
    lineas.push(todo ? "# " + texto.replace(/\*\*/g, "") : prefijo + texto);
  };
  const bloques = (ns: Nodo[], nivel: number) => {
    for (const n of ns) {
      if (n.type === "paragraph") parrafo(n, nivel ? (nivel === 1 ? "- " : "-- ") : "");
      else if (n.type === "bulletList")
        for (const li of n.content ?? []) bloques(li.content ?? [], Math.min(nivel + 1, 2)); // Word solo tiene dos niveles
    }
  };
  bloques(doc.content ?? [], 0);
  return lineas.join("\n");
}
