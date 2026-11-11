import "./globals.css";
import type { Metadata, Viewport } from "next";
import { SITE } from "@/lib/site";

const APP = "Rénolien";
const TITRE = `${APP} — Devis de travaux de rénovation par des artisans vérifiés`;
const DESCRIPTION = "Décrivez vos travaux en 2 minutes : l'IA prépare votre cahier des charges et une estimation, des artisans vérifiés de votre secteur vous envoient leur devis. Gratuit et sans engagement.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: TITRE, template: `%s | ${APP}` },
  description: DESCRIPTION,
  applicationName: APP,
  manifest: "/manifest.json",
  alternates: { canonical: "/" },
  openGraph: { type: "website", locale: "fr_FR", url: SITE, siteName: APP, title: TITRE, description: DESCRIPTION },
  twitter: { card: "summary_large_image", title: TITRE, description: DESCRIPTION },
  robots: { index: true, follow: true },
  ...(process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION ? { verification: { google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION } } : {}),
};
export const viewport: Viewport = { themeColor: "#0f1b2d", width: "device-width", initialScale: 1, maximumScale: 1 };

const organisation = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: APP,
  url: SITE,
  logo: `${SITE}/icon.svg`,
  description: DESCRIPTION,
  areaServed: "FR",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organisation) }} />
        {children}
      </body>
    </html>
  );
}
