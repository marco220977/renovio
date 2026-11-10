// Suppression du compte de l'utilisateur connecté (client ou artisan).
// Annule d'abord l'abonnement Stripe éventuel, efface les fichiers, puis supprime le compte et ses données.
import { NextResponse } from "next/server";
import { sbServer, sbAdmin } from "@/lib/supabase-server";
import { stripe } from "@/lib/stripe";

export async function POST() {
  const s = sbServer();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  const admin = process.env.SUPABASE_SERVICE_ROLE_KEY ? sbAdmin() : null;
  try {
    const { data: a } = await s.from("artisans").select("stripe_subscription_id").eq("id", user.id).maybeSingle();
    if (a?.stripe_subscription_id && process.env.STRIPE_SECRET_KEY && admin) {
      try { await stripe().subscriptions.cancel(a.stripe_subscription_id); } catch (e) { console.error("Stripe", e); }
      await admin.from("artisans").update({ abonnement: "gratuit", abonnement_fin: null, stripe_subscription_id: null }).eq("id", user.id);
    }
    // Fichiers (photos des demandes, attestations)
    if (admin) {
      for (const bucket of ["demandes", "attestations"]) {
        const { data: files } = await admin.storage.from(bucket).list(user.id, { limit: 1000 });
        if (files?.length) await admin.storage.from(bucket).remove(files.map((f) => `${user.id}/${f.name}`));
      }
    }
    const { error } = await s.rpc("supprimer_mon_compte_mer");
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    await s.auth.signOut();
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message || "Erreur" }, { status: 500 });
  }
}
