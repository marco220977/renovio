import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

// Pages publiques indexables ; espaces privés exclus
const PRIVE = ["/client", "/artisan", "/admin", "/api", "/bienvenue", "/mot-de-passe", "/e/", "/p/", "/desinscription"];

// Robots des moteurs et assistants IA, autorisés explicitement (GEO)
const ROBOTS_IA = [
  "Googlebot", "Bingbot", "Google-Extended", "Applebot", "Applebot-Extended",
  "GPTBot", "OAI-SearchBot", "ChatGPT-User",
  "ClaudeBot", "Claude-SearchBot", "Claude-User",
  "PerplexityBot", "Perplexity-User", "MistralAI-User", "DuckAssistBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: ROBOTS_IA, allow: "/", disallow: PRIVE },
      { userAgent: "*", allow: "/", disallow: PRIVE },
    ],
    sitemap: `${SITE}/sitemap.xml`,
  };
}
