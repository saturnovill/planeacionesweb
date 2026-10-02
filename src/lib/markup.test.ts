import { test } from "node:test";
import assert from "node:assert/strict";
import { jsonAMarkup, markupAHtml, type Nodo } from "./markup.ts";

test("mini-formato → HTML", () => {
  assert.equal(
    markupAHtml("# Título\nTexto con **clave** y <x>\n- Uno\n-- ¿Qué?\n-- ¿Cómo?\n- Dos\nFin"),
    "<p><strong>Título</strong></p><p>Texto con <strong>clave</strong> y &lt;x&gt;</p>" +
      "<ul><li><p>Uno</p><ul><li><p>¿Qué?</p></li><li><p>¿Cómo?</p></li></ul></li><li><p>Dos</p></li></ul><p>Fin</p>",
  );
  assert.equal(markupAHtml("-- huérfana"), "<ul><li><p></p><ul><li><p>huérfana</p></li></ul></li></ul>");
});

const t = (text: string, bold = false): Nodo => ({ type: "text", text, ...(bold && { marks: [{ type: "bold" }] }) });
const p = (...content: Nodo[]): Nodo => ({ type: "paragraph", content });
const ul = (...items: Nodo[][]): Nodo => ({ type: "bulletList", content: items.map((content) => ({ type: "listItem", content })) });

test("editor → mini-formato", () => {
  const doc = {
    type: "doc",
    content: [
      p(t("Título", true)),
      p(t("Texto con "), t("cla", true), t("ve", true), t(" y más")),
      p(),
      ul([p(t("Uno")), ul([p(t("¿Qué?"))], [p(t("Profunda")), ul([p(t("Tercer nivel"))])])], [p(t("Dos"))]),
    ],
  };
  assert.equal(jsonAMarkup(doc), "# Título\nTexto con **clave** y más\n- Uno\n-- ¿Qué?\n-- Profunda\n-- Tercer nivel\n- Dos");
});
