// Stripe → met à jour la formule de l'artisan et offre le mois sans client (à déclarer dans Stripe : événements customer.subscription.* et invoice.created)
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { sbAdmin } from "@/lib/supabase-server";
import { stripe } from "@/lib/stripe";

export async function POST(req: Request) {
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(body, req.headers.get("stripe-signature")!, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (e: any) {
    return NextResponse.json({ error: `Signature invalide: ${e.message}` }, { status: 400 });
  }
  if (event.type.startsWith("customer.subscription.")) {
    const sub = event.data.object as Stripe.Subscription;
    const actif = ["active", "trialing", "past_due"].includes(sub.status) && event.type !== "customer.subscription.deleted";
    const plan = sub.metadata?.plan;
    const fin = (sub as any).current_period_end ?? (sub as any).items?.data?.[0]?.current_period_end;
    await sbAdmin().from("artisans").update({
      abonnement: actif && plan ? plan : "gratuit",
      abonnement_fin: actif && fin ? new Date(fin * 1000 + 3 * 864e5).toISOString() : null, // 3 jours de marge
      stripe_subscription_id: actif ? sub.id : null,
      abonnement_resilie: actif && !!sub.cancel_at_period_end,
    }).eq("stripe_customer_id", sub.customer as string);
  }
  // « Pas de client, pas de facture » : renouvellement offert si aucun client sur la période écoulée (et au moins 3 offres)
  if (event.type === "invoice.created") {
    const inv = event.data.object as Stripe.Invoice;
    if (inv.billing_reason === "subscription_cycle" && inv.status === "draft" && inv.customer && inv.period_start && inv.period_end) {
      const { data: offert } = await sbAdmin().rpc("verifier_mois_offert", {
        p_customer: inv.customer as string, p_invoice: inv.id,
        p_debut: new Date(inv.period_start * 1000).toISOString(), p_fin: new Date(inv.period_end * 1000).toISOString(),
      });
      if (offert) {
        const st = stripe();
        const COUPON = "renolien-mois-offert";
        try { await st.coupons.retrieve(COUPON); }
        catch { await st.coupons.create({ id: COUPON, percent_off: 100, duration: "once", name: "Pas de client, pas de facture" }); }
        await st.invoices.update(inv.id!, { discounts: [{ coupon: COUPON }] });
      }
    }
  }
  return NextResponse.json({ received: true });
}
