import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type Tables = Database["public"]["Tables"];
export type CvProfile = Tables["cv_profile"]["Row"] & { photo_signed_url: string | null };
export type CvExperience = Tables["cv_experience"]["Row"];
export type CvEducation = Tables["cv_education"]["Row"];
export type CvSkill = Tables["cv_skills"]["Row"];
export type CvRecognition = Tables["cv_recognitions"]["Row"] & { file_url: string | null };

export type CvData = {
  profile: CvProfile | null;
  experience: CvExperience[];
  education: CvEducation[];
  skills: CvSkill[];
  recognitions: CvRecognition[];
};

const SIGNED_URL_SECONDS = 60 * 60 * 24;

// Public, read-only: the CV is meant to be seen by everyone.
export const getCv = createServerFn({ method: "GET" }).handler(async (): Promise<CvData> => {
  const serverUrl = process.env["SUPABASE_URL"]!.replace(/\/+$/, "");
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const publicUrl = (import.meta.env["VITE_SUPABASE_URL"] || serverUrl).replace(/\/+$/, "");
  const sb = createClient<Database>(serverUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });

  const [profile, experience, education, skills, recognitions] = await Promise.all([
    sb.from("cv_profile").select("*").eq("id", 1).maybeSingle(),
    sb.from("cv_experience").select("*").order("sort_order").order("created_at"),
    sb.from("cv_education").select("*").order("sort_order").order("created_at"),
    sb.from("cv_skills").select("*").order("sort_order").order("created_at"),
    sb.from("cv_recognitions").select("*").order("sort_order").order("created_at"),
  ]);

  const paths = [
    ...(profile.data?.photo_url ? [profile.data.photo_url] : []),
    ...(recognitions.data ?? []).map((r) => r.file_path).filter(Boolean),
  ];
  const urlByPath = new Map<string, string>();
  if (paths.length) {
    const { data } = await sb.storage.from("cv-files").createSignedUrls(paths, SIGNED_URL_SECONDS);
    for (const item of data ?? []) {
      if (item.path && item.signedUrl) {
        // Browser must reach the public backend address, not the server-side one.
        urlByPath.set(item.path, item.signedUrl.replace(serverUrl, publicUrl));
      }
    }
  }

  return {
    profile: profile.data
      ? { ...profile.data, photo_signed_url: urlByPath.get(profile.data.photo_url) ?? null }
      : null,
    experience: experience.data ?? [],
    education: education.data ?? [],
    skills: skills.data ?? [],
    recognitions: (recognitions.data ?? []).map((r) => ({
      ...r,
      file_url: urlByPath.get(r.file_path) ?? null,
    })),
  };
});
