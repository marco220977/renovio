// Formule évolutive : appelé le 1er du mois par la base (pg_cron → debut_mois_credits).
// Passe à la formule supérieure les abonnés qui ont accepté l'option et ont dépassé leurs crédits le mois précédent.
import { NextResponse } from "next/server";
import { sbAdmin } from "@/lib/supabase-server";
import { stripe } from "@/lib/stripe";
import { FORMULES } from "@/lib/formules";

export async function POST(req: Request) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY)
    return NextResponse.json({ error: "Paiement non activé" }, { status: 503 });
  const admin = sbAdmin();
  const { data: s } = await admin.from("secrets_internes").select("valeur").eq("cle", "cron_evolution").maybeSingle();
  if (!s?.valeur || req.headers.get("x-cron") !== s.valeur) return NextResponse.json({ error: "Accès refusé" }, { status: 401 });

  const { data: lanc } = await admin.from("reglages").select("valeur").eq("cle", "lancement").maybeSingle();
  const remiseFondateur = Number((lanc?.valeur as { remise?: number } | null)?.remise || 0);
  const { data: liste } = await admin.from("artisans")
    .select("id, fondateur, montee_prevue, stripe_subscription_id")
    .not("montee_prevue", "is", null).eq("formule_evolutive", true).not("stripe_subscription_id", "is", null);

  const st = stripe();
  const res: { id: string; ok: boolean; erreur?: string }[] = [];
  for (const a of liste || []) {
    const f = FORMULES.find((x) => x.id === a.montee_prevue && x.prix > 0);
    if (!f) continue;
    try {
      const sub = await st.subscriptions.retrieve(a.stripe_subscription_id!);
      const remise = a.fondateur ? remiseFondateur : 0;
      const produit = await st.products.create({
        name: `Rénolien ${f.nom} — ${f.quota ? `${f.quota} clients / mois` : "clients illimités"}${remise ? ` (membre fondateur -${remise} %)` : ""}`,
      });
      await st.subscriptions.update(sub.id, {
        items: [{ id: sub.items.data[0].id, price_data: {
          currency: "eur", product: produit.id, recurring: { interval: "month" },
          unit_amount: Math.round(f.prix * 100 * (100 - remise) / 100),
        } }],
        metadata: { ...sub.metadata, plan: f.id },
        proration_behavior: "create_prorations",
      });
      // La formule est mise à jour par le webhook Stripe ; on efface la montée prévue et on prévient l'artisan
      await admin.from("artisans").update({ montee_prevue: null }).eq("id", a.id);
      await admin.rpc("notifier", {
        p_user: a.id, p_type: "montee", p_titre: `⬆️ Vous passez en formule ${f.nom}`,
        p_texte: `Vous avez été choisi par plus de clients que prévu le mois dernier : votre formule évolutive vous fait passer en ${f.nom} (${f.quota ? `${f.quota} clients par mois` : "clients illimités"}). Vous pouvez revenir à votre formule précédente à tout moment dans « Abonnement ».`,
        p_lien: "/artisan/abonnement",
      });
      res.push({ id: a.id, ok: true });
    } catch (e: any) {
      console.error(e);
      res.push({ id: a.id, ok: false, erreur: e?.message });
    }
  }
  return NextResponse.json({ traites: res });
}
