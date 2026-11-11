import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";
import { METIERS_SEO, VILLES_SEO } from "@/lib/seo";
import { DEPS_SEO } from "@/lib/seo-pro";

export default function sitemap(): MetadataRoute.Sitemap {
  const maj = new Date();
  const seo: MetadataRoute.Sitemap = [
    { url: `${SITE}/travaux`, lastModified: maj, changeFrequency: "weekly", priority: 0.8 },
    ...METIERS_SEO.map((m) => ({ url: `${SITE}/travaux/${m.slug}`, lastModified: maj, changeFrequency: "monthly" as const, priority: 0.7 })),
    ...METIERS_SEO.flatMap((m) => VILLES_SEO.map((v) => ({ url: `${SITE}/travaux/${m.slug}/${v.slug}`, lastModified: maj, changeFrequency: "monthly" as const, priority: 0.6 }))),
    { url: `${SITE}/entreprises`, lastModified: maj, changeFrequency: "weekly", priority: 0.9 },
    ...METIERS_SEO.map((m) => ({ url: `${SITE}/entreprises/${m.slug}`, lastModified: maj, changeFrequency: "monthly" as const, priority: 0.7 })),
    ...METIERS_SEO.flatMap((m) => DEPS_SEO.map((d) => ({ url: `${SITE}/entreprises/${m.slug}/${d.slug}`, lastModified: maj, changeFrequency: "monthly" as const, priority: 0.6 }))),
  ];
  return [
    ...seo,
    { url: `${SITE}/`, lastModified: maj, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/particuliers`, lastModified: maj, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE}/connexion?mode=signup&role=artisan`, lastModified: maj, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/legal/cgu`, lastModified: maj, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE}/legal/cgv`, lastModified: maj, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE}/legal/confidentialite`, lastModified: maj, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE}/legal/mentions-legales`, lastModified: maj, changeFrequency: "yearly", priority: 0.2 },
  ];
}
