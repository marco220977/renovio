import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const maj = new Date();
  return [
    { url: `${SITE}/`, lastModified: maj, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/particuliers`, lastModified: maj, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE}/connexion?mode=signup&role=artisan`, lastModified: maj, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/legal/cgu`, lastModified: maj, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE}/legal/cgv`, lastModified: maj, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE}/legal/confidentialite`, lastModified: maj, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE}/legal/mentions-legales`, lastModified: maj, changeFrequency: "yearly", priority: 0.2 },
  ];
}
