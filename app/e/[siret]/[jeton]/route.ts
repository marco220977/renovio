import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/config";

// Lien des e-mails de prospection : note le clic puis redirige vers la page artisans
export async function GET(_req: Request, { params }: { params: { siret: string; jeton: string } }) {
  try {
    const s = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
    await s.rpc("prospect_action", { p_siret: params.siret, p_jeton: params.jeton, p_action: "clic" });
  } catch { /* le lien doit marcher même si le suivi échoue */ }
  return NextResponse.redirect("https://www.renolien.fr/entreprises?utm_source=email&utm_medium=prospection", 302);
}
