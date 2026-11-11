import "./globals.css";
import type { Metadata, Viewport } from "next";

const APP = "Rénolien";

export const metadata: Metadata = {
  title: `${APP} — Vos travaux de rénovation, les devis des artisans de votre secteur`,
  description: "Décrivez vos travaux, l'IA prépare le cahier des charges et des artisans vérifiés vous envoient leur devis.",
  manifest: "/manifest.json",
};
export const viewport: Viewport = { themeColor: "#0f1b2d", width: "device-width", initialScale: 1, maximumScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
