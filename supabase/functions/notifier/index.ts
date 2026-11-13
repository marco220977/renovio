// Fonction « notifier » : envoie les notifications en attente par e-mail (Brevo) et sur le téléphone (Web Push).
// Réveillée par la base à chaque nouvelle notification (en-tête x-cron). Secret requis : BREVO_API_KEY.
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const SITE = "https://www.renolien.fr";
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { "Content-Type": "application/json" } });
const esc = (s: string) => (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

Deno.serve(async (req) => {
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data: sec } = await db.from("secrets_internes").select("cle, valeur").in("cle", ["cron_notifier", "vapid_public", "vapid_private"]);
  const S = Object.fromEntries((sec || []).map((x: any) => [x.cle, x.valeur]));
  if (req.headers.get("x-cron") !== S.cron_notifier) return json({ error: "Accès refusé" }, 403);

  webpush.setVapidDetails("mailto:renolien.contact@gmail.com", S.vapid_public, S.vapid_private);
  const cle = Deno.env.get("BREVO_API_KEY");

  const { data: liste } = await db.from("notifications").select("*").eq("traite", false).order("id").limit(40);
  let n = 0;
  for (const nf of liste || []) {
    // Verrou : une seule exécution traite chaque notification
    const { data: pris } = await db.from("notifications").update({ traite: true }).eq("id", nf.id).eq("traite", false).select("id");
    if (!pris?.length) continue;
    const { data: p } = await db.from("profils").select("email, nom, notif_email, notif_push").eq("id", nf.user_id).maybeSingle();
    const lien = SITE + (nf.lien || "/");
    let emailOk: boolean | null = null, pushOk = 0; const erreurs: string[] = [];

    // Téléphone
    if (p?.notif_push !== false) {
      const { data: abos } = await db.from("push_abonnements").select("*").eq("user_id", nf.user_id);
      for (const a of abos || []) {
        try {
          await webpush.sendNotification({ endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } },
            JSON.stringify({ titre: nf.titre, texte: nf.type === "bienvenue" ? "Merci de nous rejoindre ! Ouvrez votre espace pour bien démarrer." : nf.texte, lien: nf.lien || "/", tag: nf.cle || undefined }), { TTL: 86400 });
          pushOk++;
        } catch (e: any) {
          if (e?.statusCode === 404 || e?.statusCode === 410) await db.from("push_abonnements").delete().eq("id", a.id);
          else erreurs.push(`push ${e?.statusCode || ""} ${e?.message || e}`.slice(0, 120));
        }
      }
    }

    // E-mail
    if (p?.email && p.notif_email !== false && cle) {
      const html = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#0f172a">
        <p style="font-size:22px;font-weight:800;margin:0 0 16px">Réno<span style="color:#ea580c">lien</span></p>
        <p style="font-size:18px;font-weight:bold;margin:0 0 8px">${esc(nf.titre)}</p>
        <p style="font-size:15px;line-height:1.5;margin:0 0 20px">${esc(nf.texte || "").replace(/\n/g, "<br>")}</p>
        <p><a href="${lien}" style="display:inline-block;background:#ea580c;color:#fff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:12px">${nf.type === "bienvenue" ? "Ouvrir mon espace" : "Ouvrir dans Rénolien"}</a></p>
        <p style="font-size:12px;color:#64748b;margin-top:28px">Vous recevez cet e-mail car vous avez un compte Rénolien. Vous pouvez désactiver les e-mails de notification dans « Mon compte ».</p></div>`;
      try {
        const r = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST", headers: { "api-key": cle, "content-type": "application/json", accept: "application/json" },
          body: JSON.stringify({
            sender: { email: "contact@renolien.fr", name: nf.type === "bienvenue" ? "Marco - Rénolien" : "Rénolien" }, replyTo: { email: "renolien.contact@gmail.com" },
            to: [{ email: p.email, name: p.nom || undefined }], subject: nf.titre,
            textContent: `${nf.titre}\n\n${nf.texte || ""}\n\nOuvrir : ${lien}`, htmlContent: html, tags: [`notif-${nf.type}`],
          }),
        });
        emailOk = r.ok;
        if (!r.ok) erreurs.push(`email ${r.status} ${(await r.text()).slice(0, 100)}`);
      } catch (e) { emailOk = false; erreurs.push(`email ${e}`.slice(0, 120)); }
    }
    await db.from("notifications").update({ email_ok: emailOk, push_ok: pushOk, erreur: erreurs.join(" | ") || null }).eq("id", nf.id);
    n++;
  }
  return json({ ok: true, traitees: n });
});
