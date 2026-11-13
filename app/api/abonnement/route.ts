// Abonnement artisan → Rénolien (Stripe Checkout). Ne concerne jamais les règlements client → artisan.
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { sbServer, sbAdmin } from "@/lib/supabase-server";
import { stripe } from "@/lib/stripe";
import { FORMULES } from "@/lib/formules";

export async function POST(req: Request) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY)
    return NextResponse.json({ error: "Le paiement en ligne n'est pas encore activé. Contactez Rénolien." }, { status: 503 });
  try {
    const { plan } = await req.json();
    const f = FORMULES.find((x) => x.id === plan && x.prix > 0);
    if (!f) return NextResponse.json({ error: "Formule inconnue" }, { status: 400 });
    const { data: { user } } = await sbServer().auth.getUser();
    if (!user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });
    const admin = sbAdmin();
    const { data: a } = await admin.from("artisans").select("*").eq("id", user.id).single();
    if (!a) return NextResponse.json({ error: "Profil artisan introuvable" }, { status: 404 });
    // Membres fondateurs : rien à payer pendant le lancement, puis remise à vie
    const { data: lanc } = await admin.from("reglages").select("valeur").eq("cle", "lancement").maybeSingle();
    const L = (lanc?.valeur || {}) as { actif?: boolean; fin?: string; remise?: number };
    const enLancement = !!L.actif && !!L.fin && new Date().toISOString().slice(0, 10) <= L.fin;
    if (a.fondateur && enLancement) return NextResponse.json({ error: "Vous êtes membre fondateur : tout est gratuit et illimité pendant le lancement, rien à payer." }, { status: 400 });
    const remise = a.fondateur ? Number(L.remise || 0) : 0;
    const montant = Math.round(f.prix * 100 * (100 - remise) / 100);
    const st = stripe();
    let customer = a.stripe_customer_id as string | null;
    if (!customer) {
      const c = await st.customers.create({ email: a.email || user.email!, name: a.raison_sociale || undefined, metadata: { artisan_id: a.id } });
      customer = c.id;
      await admin.from("artisans").update({ stripe_customer_id: customer }).eq("id", a.id);
    }
    const url = process.env.NEXT_PUBLIC_APP_URL || headers().get("origin");
    const session = await st.checkout.sessions.create({
      mode: "subscription",
      customer,
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "eur", unit_amount: montant, recurring: { interval: "month" },
          product_data: { name: `Rénolien ${f.nom} — ${f.quota ? `${f.quota} clients / mois` : "clients illimités"}${remise ? ` (membre fondateur -${remise} %)` : ""}` },
        },
      }],
      subscription_data: { metadata: { artisan_id: a.id, plan: f.id } },
      client_reference_id: a.id,
      allow_promotion_codes: true,
      locale: "fr",
      success_url: `${url}/artisan/abonnement?ok=1`,
      cancel_url: `${url}/artisan/abonnement`,
    });
    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: "Erreur Stripe : " + (e?.message || "inconnue") }, { status: 500 });
  }
}
