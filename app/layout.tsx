import "./globals.css";
import ApercuPdf from "@/components/ApercuPdf";
import { CaptureInstallation } from "@/components/InstallerApp";
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
  icons: { icon: [{ url: "/favicon.png", type: "image/png" }, { url: "/icon-192.png", sizes: "192x192", type: "image/png" }], apple: "/apple-touch-icon.png" },
  alternates: { canonical: "/" },
  openGraph: { type: "website", locale: "fr_FR", url: SITE, siteName: APP, title: TITRE, description: DESCRIPTION },
  twitter: { card: "summary_large_image", title: TITRE, description: DESCRIPTION },
  robots: { index: true, follow: true },
  verification: {
    ...(process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION ? { google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION } : {}),
    ...(process.env.NEXT_PUBLIC_BING_VERIFICATION ? { other: { "msvalidate.01": process.env.NEXT_PUBLIC_BING_VERIFICATION } } : {}),
  },
};
export const viewport: Viewport = { themeColor: "#0f1b2d", width: "device-width", initialScale: 1, maximumScale: 1 };

const organisation = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE}/#organisation`,
      name: APP,
      url: SITE,
      logo: `${SITE}/logo.png`,
      description: DESCRIPTION,
      email: "renolien.contact@gmail.com",
      sameAs: ["https://www.instagram.com/renolien.fr"],
      areaServed: [
        { "@type": "AdministrativeArea", name: "Paris" },
        { "@type": "AdministrativeArea", name: "Val-de-Marne" },
        { "@type": "AdministrativeArea", name: "Seine-et-Marne" },
      ],
      knowsAbout: ["rénovation", "plomberie", "chauffage", "électricité", "isolation", "devis de travaux", "MaPrimeRénov'", "artisans RGE"],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE}/#site`,
      name: APP,
      url: SITE,
      inLanguage: "fr-FR",
      publisher: { "@id": `${SITE}/#organisation` },
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organisation) }} />
        {children}
        <ApercuPdf />
        <CaptureInstallation />
      </body>
    </html>
  );
}
