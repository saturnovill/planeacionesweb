"use client";
import { useState } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, IndentDecrease, IndentIncrease, List } from "lucide-react";
import { jsonAMarkup, markupAHtml } from "@/lib/markup";
import { cn } from "@/lib/utils";

// Solo lo que el .docx sabe dibujar: párrafos, negritas y viñetas (dos niveles). Lo demás se descarta al pegar.
const extensiones = [
  StarterKit.configure({
    heading: false, blockquote: false, codeBlock: false, code: false, horizontalRule: false, orderedList: false,
    italic: false, strike: false, underline: false, link: false, hardBreak: false,
  }),
];

function Boton({ editor, activo, titulo, accion, children }: { editor: Editor; activo?: boolean; titulo: string; accion: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={titulo}
      aria-label={titulo}
      aria-pressed={activo}
      onMouseDown={(e) => e.preventDefault()} // conserva la selección del editor
      onClick={() => {
        accion();
        editor.commands.focus();
      }}
      className={cn("flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground", activo && "bg-accent text-accent-foreground")}
    >
      {children}
    </button>
  );
}

/** Campo de texto rico; envía el mini-formato en un input oculto con `name`. */
export function TextoRico({ name, labelId, valor }: { name: string; labelId: string; valor: string }) {
  const [markup, setMarkup] = useState(valor);
  const editor = useEditor({
    extensions: extensiones,
    content: markupAHtml(valor),
    immediatelyRender: false,
    shouldRerenderOnTransaction: true, // estado activo de los botones
    editorProps: { attributes: { role: "textbox", "aria-multiline": "true", "aria-labelledby": labelId, class: "min-h-16 px-2.5 py-2 outline-none" } },
    onUpdate: ({ editor }) => setMarkup(jsonAMarkup(editor.getJSON())),
  });

  return (
    <div className="rounded-lg border border-input text-base transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 md:text-sm dark:bg-input/30">
      <input type="hidden" name={name} value={markup} />
      {editor && (
        <div className="flex gap-0.5 border-b p-1">
          <Boton editor={editor} titulo="Negritas (Ctrl+B)" activo={editor.isActive("bold")} accion={() => editor.chain().toggleBold().run()}>
            <Bold className="size-4" />
          </Boton>
          <Boton editor={editor} titulo="Viñeta" activo={editor.isActive("bulletList")} accion={() => editor.chain().toggleBulletList().run()}>
            <List className="size-4" />
          </Boton>
          <Boton editor={editor} titulo="Sub-viñeta (Tab)" accion={() => editor.chain().sinkListItem("listItem").run()}>
            <IndentIncrease className="size-4" />
          </Boton>
          <Boton editor={editor} titulo="Quitar sangría (Shift+Tab)" accion={() => editor.chain().liftListItem("listItem").run()}>
            <IndentDecrease className="size-4" />
          </Boton>
        </div>
      )}
      <EditorContent
        editor={editor}
        className="min-h-16 [&_li>p]:my-0 [&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-6 [&_ul_ul]:list-[circle]"
      />
    </div>
  );
}
