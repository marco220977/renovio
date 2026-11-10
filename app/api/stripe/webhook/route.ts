// Stripe → met à jour la formule de l'artisan (à déclarer dans Stripe : événements customer.subscription.*)
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
      stripe_subscription_id: sub.id,
    }).eq("stripe_customer_id", sub.customer as string);
  }
  return NextResponse.json({ received: true });
}
