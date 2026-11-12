import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

// Pages publiques indexables ; espaces privés exclus
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/client", "/artisan", "/admin", "/api", "/bienvenue", "/mot-de-passe", "/e/", "/desinscription"] }],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
