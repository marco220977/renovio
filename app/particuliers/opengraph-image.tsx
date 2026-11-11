import { ImageResponse } from "next/og";

// Image d'aperçu quand le lien est partagé (WhatsApp, Facebook, SMS…)
export const runtime = "edge";
export const alt = "Rénolien — vos travaux décrits en 2 minutes, les devis viennent à vous";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 80,
        background: "linear-gradient(135deg, #0f1b2d 0%, #1e3a8a 60%, #ea7a0c 140%)", color: "white", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", fontSize: 64, fontWeight: 800 }}>Réno<span style={{ color: "#fb923c" }}>lien</span></div>
        <div style={{ display: "flex", marginTop: 40, fontSize: 64, fontWeight: 800, lineHeight: 1.15, maxWidth: 1000 }}>
          Vos travaux décrits en 2 minutes, les devis viennent à vous
        </div>
        <div style={{ display: "flex", marginTop: 36, fontSize: 32, color: "#cbd5e1" }}>
          Artisans vérifiés · Gratuit et sans engagement
        </div>
      </div>
    ),
    size,
  );
}
