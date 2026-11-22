import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell } from "@/components/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Acceso de administradora — CV" },
      { name: "description", content: "Acceso privado al panel de administración del CV." },
      { property: "og:title", content: "Acceso de administradora — CV" },
      { property: "og:description", content: "Acceso privado al panel de administración del CV." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup" | "forgot" | "check-email";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: adminExists } = useQuery({
    queryKey: ["admin-exists"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_exists");
      if (error) throw error;
      return data;
    },
  });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/admin" });
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/admin` },
        });
        if (error) throw error;
        if (data.session) navigate({ to: "/admin" });
        else setMode("check-email");
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Te enviamos un correo para cambiar tu contraseña.");
        setMode("signin");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Algo salió mal";
      toast.error(msg === "Invalid login credentials" ? "Correo o contraseña incorrectos" : msg);
    } finally {
      setBusy(false);
    }
  }

  if (mode === "check-email") {
    return (
      <AuthShell title="Revisa tu correo" subtitle={`Te enviamos un enlace a ${email} para confirmar tu cuenta.`}>
        <Button variant="outline" className="w-full" onClick={() => setMode("signin")}>
          Ya confirmé, iniciar sesión
        </Button>
      </AuthShell>
    );
  }

  const titles: Record<Exclude<Mode, "check-email">, [string, string]> = {
    signin: ["Iniciar sesión", "Solo la administradora puede entrar."],
    signup: ["Crear mi cuenta", "Esta será la única cuenta con acceso al panel."],
    forgot: ["Recuperar contraseña", "Te enviaremos un enlace a tu correo."],
  };
  const [title, subtitle] = titles[mode];

  return (
    <AuthShell title={title} subtitle={subtitle}>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Correo</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        {mode !== "forgot" && (
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        )}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Procesando…" : mode === "signin" ? "Entrar" : mode === "signup" ? "Crear cuenta" : "Enviar enlace"}
        </Button>
      </form>
      <div className="mt-4 flex flex-col items-center gap-1 text-sm">
        {mode === "signin" && (
          <Button variant="link" size="sm" onClick={() => setMode("forgot")}>
            ¿Olvidaste tu contraseña?
          </Button>
        )}
        {mode === "signin" && adminExists === false && (
          <Button variant="link" size="sm" onClick={() => setMode("signup")}>
            Primera vez: crear mi cuenta de administradora
          </Button>
        )}
        {mode !== "signin" && (
          <Button variant="link" size="sm" onClick={() => setMode("signin")}>
            Volver a iniciar sesión
          </Button>
        )}
      </div>
    </AuthShell>
  );
}
