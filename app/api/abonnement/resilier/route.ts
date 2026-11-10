// Résiliation de l'abonnement artisan : prend effet à la fin du mois payé.
import { NextResponse } from "next/server";
import { sbServer, sbAdmin } from "@/lib/supabase-server";
import { stripe } from "@/lib/stripe";

export async function POST(req: Request) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY)
    return NextResponse.json({ error: "Le paiement en ligne n'est pas encore activé." }, { status: 503 });
  try {
    const { annuler } = await req.json().catch(() => ({ annuler: false }));
    const { data: { user } } = await sbServer().auth.getUser();
    if (!user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });
    const { data: a } = await sbAdmin().from("artisans").select("stripe_subscription_id").eq("id", user.id).single();
    if (!a?.stripe_subscription_id) return NextResponse.json({ error: "Aucun abonnement payant" }, { status: 400 });
    const sub = await stripe().subscriptions.update(a.stripe_subscription_id, { cancel_at_period_end: !annuler });
    const fin = (sub as any).current_period_end ?? (sub as any).items?.data?.[0]?.current_period_end;
    return NextResponse.json({ ok: true, fin: fin ? new Date(fin * 1000).toISOString() : null, resilie: sub.cancel_at_period_end });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: "Erreur Stripe : " + (e?.message || "inconnue") }, { status: 500 });
  }
}
