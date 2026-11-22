import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  Award,
  Briefcase,
  FileText,
  Globe,
  GraduationCap,
  Linkedin,
  Lock,
  Mail,
  MapPin,
  Phone,
  Terminal,
} from "lucide-react";
import type { ReactNode } from "react";
import { cvQueryOptions } from "@/lib/cv-query";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(cvQueryOptions),
  head: ({ loaderData }) => {
    const name = loaderData?.profile?.full_name || "Kayla Carrizal Betancourt";
    const headline = loaderData?.profile?.headline || "Ingeniería en Administración de Sistemas";
    const title = `${name} — CV | ${headline}`;
    const description =
      loaderData?.profile?.about?.slice(0, 155) || `Currículum de ${name}: ${headline}.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "profile" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: CvPage,
});

function SectionTitle({ index, label, icon }: { index: string; label: string; icon: ReactNode }) {
  return (
    <div className="mb-8 flex items-center gap-3">
      <span className="font-mono text-sm text-primary">{index}</span>
      <span className="font-mono text-sm text-muted-foreground">//</span>
      <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
        <span className="text-primary [&_svg]:size-5">{icon}</span>
        {label}
      </h2>
      <div className="ml-2 h-px flex-1 bg-gradient-to-r from-border to-transparent" />
    </div>
  );
}

function CvPage() {
  const { data } = useSuspenseQuery(cvQueryOptions);
  const { profile, experience, education, skills, recognitions } = data;
  const name = profile?.full_name || "Kayla Carrizal Betancourt";
  const handle = name.split(" ")[0]?.toLowerCase() ?? "cv";

  const skillGroups = skills.reduce<Record<string, string[]>>((acc, s) => {
    const key = s.category || "General";
    (acc[key] ??= []).push(s.name);
    return acc;
  }, {});

  const contacts = [
    profile?.email && { icon: <Mail />, label: profile.email, href: `mailto:${profile.email}` },
    profile?.phone && { icon: <Phone />, label: profile.phone, href: `tel:${profile.phone}` },
    profile?.location && { icon: <MapPin />, label: profile.location },
    profile?.linkedin && { icon: <Linkedin />, label: "LinkedIn", href: profile.linkedin },
    profile?.website && { icon: <Globe />, label: "Sitio web", href: profile.website },
  ].filter(Boolean) as { icon: ReactNode; label: string; href?: string }[];

  let n = 0;
  const next = () => String(++n).padStart(2, "0");

  return (
    <div className="min-h-screen bg-grid">
      <div className="bg-hero">
        <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2 font-mono text-sm">
            <Terminal className="size-4 text-terminal" />
            <span className="text-terminal">{handle}@cv</span>
            <span className="text-muted-foreground">:~$</span>
            <span className="caret-blink inline-block h-4 w-2 bg-primary" />
          </div>
          <Link
            to="/admin"
            aria-label="Panel de administración"
            className="rounded-md p-2 text-muted-foreground transition-colors hover:text-primary"
          >
            <Lock className="size-4" />
          </Link>
        </header>

        <section className="mx-auto grid max-w-5xl gap-10 px-6 pb-20 pt-10 md:grid-cols-[auto_1fr] md:items-center">
          <div className="fade-up relative mx-auto size-44 md:mx-0 md:size-52">
            <div className="absolute -inset-3 rounded-2xl border border-dashed border-primary/40" />
            <div className="absolute -left-3 -top-3 size-4 border-l-2 border-t-2 border-primary" />
            <div className="absolute -bottom-3 -right-3 size-4 border-b-2 border-r-2 border-primary" />
            {profile?.photo_signed_url ? (
              <img
                src={profile.photo_signed_url}
                alt={name}
                className="size-full rounded-xl object-cover shadow-glow"
              />
            ) : (
              <div className="flex size-full items-center justify-center rounded-xl bg-card font-mono text-5xl text-primary shadow-glow">
                {name
                  .split(" ")
                  .slice(0, 2)
                  .map((w) => w[0])
                  .join("")}
              </div>
            )}
          </div>

          <div className="fade-up text-center md:text-left" style={{ animationDelay: "120ms" }}>
            <p className="font-mono text-sm text-terminal">&gt; whoami</p>
            <h1 className="mt-2 text-4xl font-bold leading-tight tracking-tight md:text-6xl">
              {name}
            </h1>
            {profile?.headline && (
              <p className="text-glow mt-3 font-mono text-base text-primary md:text-lg">
                {profile.headline}
              </p>
            )}
            {profile?.about && (
              <p className="mt-5 max-w-2xl whitespace-pre-line leading-relaxed text-muted-foreground">
                {profile.about}
              </p>
            )}
            {contacts.length > 0 && (
              <ul className="mt-6 flex flex-wrap justify-center gap-2 md:justify-start">
                {contacts.map((c) => (
                  <li key={c.label}>
                    {c.href ? (
                      <a
                        href={c.href}
                        target={c.href.startsWith("http") ? "_blank" : undefined}
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-md border border-border bg-card/60 px-3 py-1.5 font-mono text-xs transition-colors hover:border-primary hover:text-primary [&_svg]:size-3.5"
                      >
                        {c.icon}
                        {c.label}
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-2 rounded-md border border-border bg-card/60 px-3 py-1.5 font-mono text-xs [&_svg]:size-3.5">
                        {c.icon}
                        {c.label}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      <main className="mx-auto max-w-5xl space-y-20 px-6 pb-24">
        {experience.length > 0 && (
          <section>
            <SectionTitle index={next()} label="Experiencia" icon={<Briefcase />} />
            <ol className="relative space-y-8 border-l border-border pl-8">
              {experience.map((e) => (
                <li key={e.id} className="relative">
                  <span className="absolute -left-[37px] top-1.5 size-3 rounded-full border-2 border-primary bg-background" />
                  <p className="font-mono text-xs text-terminal">
                    [{e.start_date || "—"} → {e.end_date || "actual"}]
                  </p>
                  <h3 className="mt-1 text-lg font-semibold">{e.role}</h3>
                  <p className="text-sm text-primary">
                    {[e.organization, e.location].filter(Boolean).join(" · ")}
                  </p>
                  {e.description && (
                    <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                      {e.description}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          </section>
        )}

        {education.length > 0 && (
          <section>
            <SectionTitle index={next()} label="Educación" icon={<GraduationCap />} />
            <div className="grid gap-4 md:grid-cols-2">
              {education.map((e) => (
                <article
                  key={e.id}
                  className="rounded-lg border border-border bg-card/70 p-5 transition-colors hover:border-primary/60"
                >
                  <p className="font-mono text-xs text-terminal">
                    [{e.start_date || "—"} → {e.end_date || "actual"}]
                  </p>
                  <h3 className="mt-1 font-semibold">{e.degree}</h3>
                  <p className="text-sm text-primary">{e.institution}</p>
                  {e.description && (
                    <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
                      {e.description}
                    </p>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}

        {skills.length > 0 && (
          <section>
            <SectionTitle index={next()} label="Habilidades" icon={<Terminal />} />
            <div className="space-y-5">
              {Object.entries(skillGroups).map(([group, items]) => (
                <div key={group} className="grid gap-3 md:grid-cols-[180px_1fr]">
                  <p className="font-mono text-sm text-muted-foreground">
                    <span className="text-primary">$</span> {group.toLowerCase()}
                  </p>
                  <ul className="flex flex-wrap gap-2">
                    {items.map((s) => (
                      <li
                        key={s}
                        className="rounded border border-primary/30 bg-primary/10 px-2.5 py-1 font-mono text-xs text-primary"
                      >
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}

        {recognitions.length > 0 && (
          <section>
            <SectionTitle index={next()} label="Reconocimientos" icon={<Award />} />
            <div className="grid gap-4 md:grid-cols-2">
              {recognitions.map((r) => (
                <article
                  key={r.id}
                  className="flex flex-col rounded-lg border border-border bg-card/70 p-5"
                >
                  <div className="flex items-start gap-3">
                    <div className="rounded-md bg-terminal/15 p-2 text-terminal">
                      <Award className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold">{r.title}</h3>
                      <p className="text-sm text-primary">
                        {[r.issuer, r.issued_date].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                  </div>
                  {r.description && (
                    <p className="mt-3 text-sm text-muted-foreground">{r.description}</p>
                  )}
                  {r.file_url && (
                    <Button asChild variant="terminal" size="sm" className="mt-4 self-start">
                      <a href={r.file_url} target="_blank" rel="noreferrer">
                        <FileText />
                        ver_documento.pdf
                      </a>
                    </Button>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}

        {experience.length + education.length + skills.length + recognitions.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-10 text-center font-mono text-sm text-muted-foreground">
            <span className="text-terminal">&gt;</span> CV en construcción. Vuelve pronto.
          </div>
        )}
      </main>

      <footer className="border-t border-border py-6 text-center font-mono text-xs text-muted-foreground">
        <span className="text-terminal">●</span> sistema en línea · © {new Date().getFullYear()} {name}
      </footer>
    </div>
  );
}
