import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, FileText, Pencil, Plus, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type Field = {
  key: string;
  label: string;
  type?: "text" | "textarea";
  placeholder?: string;
  required?: boolean;
};

type Table = "cv_experience" | "cv_education" | "cv_skills" | "cv_recognitions";
type Row = Record<string, string | number | null> & { id: string; sort_order: number };

// Loosely typed access so one manager can edit every CV list table.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as unknown as { from: (t: Table) => any };

export function ItemsManager({
  table,
  fields,
  itemTitle,
  itemSubtitle,
  withPdf = false,
  addLabel,
}: {
  table: Table;
  fields: Field[];
  itemTitle: (r: Row) => string;
  itemSubtitle?: (r: Row) => string;
  withPdf?: boolean;
  addLabel: string;
}) {
  const qc = useQueryClient();
  const queryKey = ["admin", table];
  const { data: rows = [], isLoading } = useQuery({
    queryKey,
    queryFn: async (): Promise<Row[]> => {
      const { data, error } = await db.from(table).select("*").order("sort_order").order("created_at");
      if (error) throw error;
      return data as Row[];
    },
  });

  const empty = Object.fromEntries(fields.map((f) => [f.key, ""])) as Record<string, string>;
  const [editing, setEditing] = useState<{ id: string | null; values: Record<string, string> } | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = () => qc.invalidateQueries();

  function startEdit(r?: Row) {
    setFile(null);
    setEditing(
      r
        ? { id: r.id, values: Object.fromEntries(fields.map((f) => [f.key, String(r[f.key] ?? "")])) }
        : { id: null, values: { ...empty } },
    );
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      const payload: Record<string, string | number> = { ...editing.values };
      if (withPdf && file) {
        if (file.type !== "application/pdf") throw new Error("El archivo debe ser PDF");
        const path = `recognitions/${crypto.randomUUID()}.pdf`;
        const { error } = await supabase.storage
          .from("cv-files")
          .upload(path, file, { contentType: "application/pdf" });
        if (error) throw error;
        payload["file_path"] = path;
        const old = rows.find((r) => r.id === editing.id)?.["file_path"];
        if (old) await supabase.storage.from("cv-files").remove([String(old)]);
      }
      if (editing.id) {
        const { error } = await db.from(table).update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        payload["sort_order"] = rows.reduce((m, r) => Math.max(m, r.sort_order), 0) + 1;
        const { error } = await db.from(table).insert(payload);
        if (error) throw error;
      }
      toast.success("Guardado");
      setEditing(null);
      refresh();
    } catch (err) {
      toast.error("No se pudo guardar: " + (err instanceof Error ? err.message : "error"));
    } finally {
      setSaving(false);
    }
  }

  async function remove(r: Row) {
    if (!confirm(`¿Eliminar "${itemTitle(r)}"?`)) return;
    const { error } = await db.from(table).delete().eq("id", r.id);
    if (error) {
      toast.error("No se pudo eliminar: " + error.message);
      return;
    }
    if (withPdf && r["file_path"]) await supabase.storage.from("cv-files").remove([String(r["file_path"])]);
    toast.success("Eliminado");
    refresh();
  }

  async function move(index: number, dir: -1 | 1) {
    const a = rows[index];
    const b = rows[index + dir];
    if (!a || !b) return;
    const aOrder = a.sort_order === b.sort_order ? b.sort_order - dir : b.sort_order;
    await Promise.all([
      db.from(table).update({ sort_order: aOrder }).eq("id", a.id),
      db.from(table).update({ sort_order: a.sort_order }).eq("id", b.id),
    ]);
    refresh();
  }

  async function openPdf(path: string) {
    const { data } = await supabase.storage.from("cv-files").createSignedUrl(path, 600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  }

  return (
    <div className="space-y-4">
      {isLoading ? (
        <p className="font-mono text-sm text-muted-foreground">Cargando…</p>
      ) : rows.length === 0 && !editing ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-center font-mono text-sm text-muted-foreground">
          Aún no hay nada aquí.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r, i) => (
            <li key={r.id} className="flex items-center gap-3 rounded-lg border border-border bg-background/50 p-3">
              <div className="flex flex-col">
                <Button variant="ghost" size="icon" className="size-6" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Subir">
                  <ArrowUp />
                </Button>
                <Button variant="ghost" size="icon" className="size-6" disabled={i === rows.length - 1} onClick={() => move(i, 1)} aria-label="Bajar">
                  <ArrowDown />
                </Button>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{itemTitle(r)}</p>
                {itemSubtitle && <p className="truncate text-sm text-muted-foreground">{itemSubtitle(r)}</p>}
              </div>
              {withPdf && r["file_path"] && (
                <Button variant="terminal" size="sm" onClick={() => openPdf(String(r["file_path"]))}>
                  <FileText /> PDF
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={() => startEdit(r)} aria-label="Editar">
                <Pencil />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => remove(r)} aria-label="Eliminar" className="text-destructive">
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {editing ? (
        <form onSubmit={save} className="space-y-4 rounded-lg border border-primary/40 bg-background/50 p-4">
          <div className="flex items-center justify-between">
            <p className="font-mono text-sm text-primary">{editing.id ? "> editar" : "> nuevo"}</p>
            <Button type="button" variant="ghost" size="icon" onClick={() => setEditing(null)} aria-label="Cerrar">
              <X />
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {fields.map((f) => (
              <div key={f.key} className={f.type === "textarea" ? "space-y-2 md:col-span-2" : "space-y-2"}>
                <Label htmlFor={`${table}-${f.key}`}>{f.label}</Label>
                {f.type === "textarea" ? (
                  <Textarea
                    id={`${table}-${f.key}`}
                    rows={4}
                    placeholder={f.placeholder}
                    value={editing.values[f.key] ?? ""}
                    onChange={(e) => setEditing({ ...editing, values: { ...editing.values, [f.key]: e.target.value } })}
                  />
                ) : (
                  <Input
                    id={`${table}-${f.key}`}
                    required={f.required}
                    placeholder={f.placeholder}
                    value={editing.values[f.key] ?? ""}
                    onChange={(e) => setEditing({ ...editing, values: { ...editing.values, [f.key]: e.target.value } })}
                  />
                )}
              </div>
            ))}
            {withPdf && (
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor={`${table}-pdf`}>Documento PDF {editing.id ? "(opcional, reemplaza el actual)" : ""}</Label>
                <Input
                  id={`${table}-pdf`}
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>
            )}
          </div>
          <Button type="submit" disabled={saving}>
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </form>
      ) : (
        <Button variant="terminal" onClick={() => startEdit()}>
          <Plus /> {addLabel}
        </Button>
      )}
    </div>
  );
}
