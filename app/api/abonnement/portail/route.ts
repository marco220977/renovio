// Gérer / changer / résilier son abonnement (portail client Stripe)
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { sbServer, sbAdmin } from "@/lib/supabase-server";
import { stripe } from "@/lib/stripe";

export async function POST() {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY)
    return NextResponse.json({ error: "Le paiement en ligne n'est pas encore activé." }, { status: 503 });
  try {
    const { data: { user } } = await sbServer().auth.getUser();
    if (!user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });
    const { data: a } = await sbAdmin().from("artisans").select("stripe_customer_id").eq("id", user.id).single();
    if (!a?.stripe_customer_id) return NextResponse.json({ error: "Aucun abonnement" }, { status: 400 });
    const s = await stripe().billingPortal.sessions.create({
      customer: a.stripe_customer_id, return_url: `${process.env.NEXT_PUBLIC_APP_URL || headers().get("origin")}/artisan/abonnement`,
    });
    return NextResponse.json({ url: s.url });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: "Erreur Stripe : " + (e?.message || "inconnue") }, { status: 500 });
  }
}
