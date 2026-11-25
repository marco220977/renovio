import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";
import { METIERS_SEO, VILLES_SEO } from "@/lib/seo";
import { DEPS_SEO } from "@/lib/seo-pro";
import { GUIDES_PRO } from "@/lib/guides-pro";
import { ARTICLES } from "@/lib/articles";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/config";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const maj = new Date();
  const seo: MetadataRoute.Sitemap = [
    { url: `${SITE}/travaux`, lastModified: maj, changeFrequency: "weekly", priority: 0.8 },
    ...METIERS_SEO.map((m) => ({ url: `${SITE}/travaux/${m.slug}`, lastModified: maj, changeFrequency: "monthly" as const, priority: 0.7 })),
    ...METIERS_SEO.flatMap((m) => VILLES_SEO.map((v) => ({ url: `${SITE}/travaux/${m.slug}/${v.slug}`, lastModified: maj, changeFrequency: "monthly" as const, priority: 0.6 }))),
    { url: `${SITE}/conseils`, lastModified: maj, changeFrequency: "weekly", priority: 0.8 },
    ...ARTICLES.map((a) => ({ url: `${SITE}/conseils/${a.slug}`, lastModified: new Date(a.date), changeFrequency: "monthly" as const, priority: 0.8 })),
    { url: `${SITE}/entreprises`, lastModified: maj, changeFrequency: "weekly", priority: 0.9 },
    ...METIERS_SEO.map((m) => ({ url: `${SITE}/entreprises/${m.slug}`, lastModified: maj, changeFrequency: "monthly" as const, priority: 0.7 })),
    { url: `${SITE}/entreprises/guides`, lastModified: maj, changeFrequency: "weekly", priority: 0.8 },
    ...GUIDES_PRO.map((g) => ({ url: `${SITE}/entreprises/guides/${g.slug}`, lastModified: new Date(g.date), changeFrequency: "monthly" as const, priority: 0.8 })),
    ...DEPS_SEO.map((d) => ({ url: `${SITE}/entreprises/chantiers/${d.slug}`, lastModified: maj, changeFrequency: "monthly" as const, priority: 0.8 })),
    ...METIERS_SEO.flatMap((m) => DEPS_SEO.map((d) => ({ url: `${SITE}/entreprises/${m.slug}/${d.slug}`, lastModified: maj, changeFrequency: "monthly" as const, priority: 0.6 }))),
  ];
  // Vitrines des artisans vérifiés (hors comptes de test)
  let vitrines: MetadataRoute.Sitemap = [];
  try {
    const { data } = await createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } }).rpc("vitrines_publiques");
    vitrines = ((data as { slug: string; maj: string }[]) || []).map((v) => ({ url: `${SITE}/pro/${v.slug}`, lastModified: new Date(v.maj), changeFrequency: "weekly" as const, priority: 0.7 }));
  } catch { /* plan du site sans les vitrines si la base ne répond pas */ }
  return [
    ...seo,
    ...vitrines,
    { url: `${SITE}/`, lastModified: maj, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/particuliers`, lastModified: maj, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE}/legal/cgu`, lastModified: maj, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE}/legal/cgv`, lastModified: maj, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE}/legal/confidentialite`, lastModified: maj, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE}/legal/mentions-legales`, lastModified: maj, changeFrequency: "yearly", priority: 0.2 },
  ];
}
