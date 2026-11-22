import { useEffect, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const FIELDS = [
  { key: "full_name", label: "Nombre completo" },
  { key: "headline", label: "Título profesional", placeholder: "Ingeniería en Administración de Sistemas" },
  { key: "email", label: "Correo de contacto" },
  { key: "phone", label: "Teléfono" },
  { key: "location", label: "Ciudad / País" },
  { key: "linkedin", label: "LinkedIn (enlace)" },
  { key: "website", label: "Sitio web / GitHub (enlace)" },
] as const;

type ProfileState = Record<(typeof FIELDS)[number]["key"] | "about" | "photo_url", string>;

export function ProfileForm() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "profile"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cv_profile").select("*").eq("id", 1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const [form, setForm] = useState<ProfileState | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!data) return;
    setForm({
      full_name: data.full_name,
      headline: data.headline,
      about: data.about,
      email: data.email,
      phone: data.phone,
      location: data.location,
      linkedin: data.linkedin,
      website: data.website,
      photo_url: data.photo_url,
    });
    if (data.photo_url) {
      supabase.storage
        .from("cv-files")
        .createSignedUrl(data.photo_url, 3600)
        .then(({ data: s }) => setPhotoPreview(s?.signedUrl ?? null));
    }
  }, [data]);

  if (isLoading || !form) return <p className="font-mono text-sm text-muted-foreground">Cargando…</p>;

  async function uploadPhoto(file: File) {
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `photo/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("cv-files").upload(path, file, { contentType: file.type });
    setUploading(false);
    if (error) {
      toast.error("No se pudo subir la foto: " + error.message);
      return;
    }
    setForm((f) => (f ? { ...f, photo_url: path } : f));
    setPhotoPreview(URL.createObjectURL(file));
    toast.success("Foto lista. Recuerda guardar los cambios.");
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    const { error } = await supabase.from("cv_profile").upsert({ id: 1, ...form });
    setSaving(false);
    if (error) {
      toast.error("No se pudo guardar: " + error.message);
      return;
    }
    toast.success("Perfil guardado");
    qc.invalidateQueries();
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <div className="flex items-center gap-5">
        <div className="size-24 overflow-hidden rounded-lg border border-border bg-muted">
          {photoPreview ? (
            <img src={photoPreview} alt="Foto de perfil" className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center font-mono text-xs text-muted-foreground">sin foto</div>
          )}
        </div>
        <div>
          <Label htmlFor="photo" className="cursor-pointer">
            <span className="inline-flex items-center gap-2 rounded-md border border-primary/40 bg-primary/10 px-3 py-2 font-mono text-sm text-primary hover:bg-primary hover:text-primary-foreground">
              <Upload className="size-4" /> {uploading ? "Subiendo…" : "Subir foto"}
            </span>
          </Label>
          <input
            id="photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadPhoto(f);
              e.target.value = "";
            }}
          />
          <p className="mt-2 text-xs text-muted-foreground">JPG, PNG o WEBP. Máx. 20 MB.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {FIELDS.map((f) => (
          <div key={f.key} className="space-y-2">
            <Label htmlFor={f.key}>{f.label}</Label>
            <Input
              id={f.key}
              value={form[f.key]}
              placeholder={"placeholder" in f ? f.placeholder : undefined}
              onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
            />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <Label htmlFor="about">Sobre mí</Label>
        <Textarea id="about" rows={5} value={form.about} onChange={(e) => setForm({ ...form, about: e.target.value })} />
      </div>
      <Button type="submit" disabled={saving}>
        {saving ? "Guardando…" : "Guardar perfil"}
      </Button>
    </form>
  );
}
