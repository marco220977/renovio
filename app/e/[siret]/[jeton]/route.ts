import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/config";

// Antivirus et aperçus de liens qui ouvrent les liens des e-mails à la place du destinataire
const ROBOTS = /bot|crawl|spider|preview|scan|python|curl|wget|java\/|go-http|okhttp|axios|node-fetch|headless|phantom|barracuda|mimecast|proofpoint|safelinks|trendmicro|symantec|sophos|fortinet|forcepoint|cisco|zscaler|vade|mailscanner|bitdefender|kaspersky|eset/i;

async function noter(req: Request, siret: string, jeton: string) {
  try {
    const ua = req.headers.get("user-agent") || "";
    const robot = req.method === "HEAD" || !ua || ROBOTS.test(ua);
    const s = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
    // La base classe aussi en robot tout clic arrivé moins de 3 minutes après l'envoi
    await s.rpc("prospect_action", { p_siret: siret, p_jeton: jeton, p_action: "clic", p_robot: robot });
  } catch { /* le lien doit marcher même si le suivi échoue */ }
}

const CIBLE = "https://www.renolien.fr/entreprises?utm_source=email&utm_medium=prospection";

// Lien des e-mails de prospection : note le clic (humain ou robot) puis redirige vers la page artisans
export async function GET(req: Request, { params }: { params: { siret: string; jeton: string } }) {
  await noter(req, params.siret, params.jeton);
  return NextResponse.redirect(CIBLE, 302);
}
export async function HEAD(req: Request, { params }: { params: { siret: string; jeton: string } }) {
  await noter(req, params.siret, params.jeton);
  return NextResponse.redirect(CIBLE, 302);
}
