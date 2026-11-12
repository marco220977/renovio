// Fonction « prospection-mail » : envoie chaque jour les e-mails de prospection aux artisans (via Brevo).
// Appelée par la tâche planifiée (en-tête x-cron) ou par l'admin (bouton « Envoyer un test »).
// Secret requis : BREVO_API_KEY.
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const SITE = "https://www.renolien.fr";

// Métier lisible et exemples de chantiers, à partir du métier Sirene ou des domaines RGE
function metierDe(p: any): { pro: string; ex: string } {
  const t = `${p.metier || ""} ${p.domaines_rge || ""}`.toLowerCase();
  if (/pompe|chauff|chaudi|clim|thermodyn|po[eê]le|bois|biomasse/.test(t)) return { pro: "chauffagiste", ex: "remplacement de chaudière, pompe à chaleur, climatisation" };
  if (/plomb|sanitaire|eau chaude|ballon/.test(t)) return { pro: "plombier", ex: "chauffe-eau, salle de bain, recherche de fuite" };
  if (/[ée]lectri|photovolta|solaire|borne/.test(t)) return { pro: "électricien", ex: "tableau électrique, mise aux normes, borne de recharge" };
  if (/isol|comble|ite|iti|mur/.test(t)) return { pro: "artisan en isolation", ex: "isolation des combles, des murs et des planchers" };
  if (/fen[eê]tre|menuis|porte|volet|vitrage/.test(t)) return { pro: "menuisier", ex: "fenêtres, portes d'entrée, volets roulants" };
  if (/couvert|toit|charpente|zinguerie/.test(t)) return { pro: "couvreur", ex: "réfection de toiture, fuite, gouttières" };
  if (/peint|vitrerie/.test(t)) return { pro: "peintre", ex: "peinture de pièces, rénovation avant location" };
  if (/pl[aâ]tr|plaqu/.test(t)) return { pro: "plaquiste", ex: "cloisons, faux plafonds, doublages" };
  if (/carrel|sol/.test(t)) return { pro: "carreleur", ex: "carrelage, faïence, douche à l'italienne" };
  if (/ma[cç]on|gros|construction|terrass/.test(t)) return { pro: "maçon", ex: "ouverture de mur, dalle, extension" };
  if (/architect|audit|bureau|[ée]tude/.test(t)) return { pro: "professionnel de la rénovation", ex: "rénovation énergétique, audits, travaux complets" };
  return { pro: "artisan", ex: "rénovation, réparations, petits travaux" };
}
const titre = (s: string) => (s || "").toLowerCase().replace(/(^|[\s'-])\S/g, (m) => m.toUpperCase());

function contenu(p: any, etape: number, lien: string, stop: string) {
  const m = metierDe(p);
  const ville = titre(p.ville || "");
  const sujet = etape === 1 ? `${titre(m.pro)} à ${ville} : des chantiers sans payer de pub` : `Re : des chantiers près de ${ville}`;
  const corps = etape === 1 ? [
    `Bonjour,`,
    `Je suis Marco, plombier-chauffagiste et fondateur de Rénolien, une plateforme qui met en relation les particuliers d'Île-de-France avec des artisans de leur secteur.`,
    `Des particuliers de votre secteur y décrivent leurs travaux (${m.ex}…), avec photos et cahier des charges. Vous recevez les demandes de votre métier près de ${ville}, et vous répondez avec un devis prérempli en 1 clic.`,
    `Ce qui change des autres plateformes :\n• vous ne payez que si un client vous choisit, pas pour un devis sans réponse ;\n• 5 artisans maximum par demande, pas d'enchère au moins cher ;\n• 0 % de commission : le client vous paie directement.`,
    `Pour le lancement, les 50 premiers inscrits ont 2 mois de formule Illimitée offerts, sans carte bancaire.`,
    `Découvrir et s'inscrire (2 minutes) : ${lien}`,
    `Une question ? Répondez simplement à ce message.\n\nMarco\nFondateur de Rénolien`,
  ] : [
    `Bonjour,`,
    `Je me permets de revenir vers vous : sur Rénolien, des particuliers de votre secteur cherchent un ${m.pro} pour leurs travaux.`,
    `L'inscription est gratuite, envoyer une offre aussi : vous ne payez que lorsqu'un client vous choisit. Les 2 mois illimités offerts aux premiers inscrits sont encore disponibles.`,
    `Voir les détails : ${lien}`,
    `Marco\nFondateur de Rénolien`,
  ];
  const mention = `Vos coordonnées professionnelles proviennent du registre public des entreprises RGE (ADEME) ou du répertoire Sirene. Pour ne plus recevoir de message de Rénolien : ${stop}`;
  const texte = corps.join("\n\n") + "\n\n—\n" + mention;
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.55;color:#0f172a;max-width:560px">` +
    corps.map((c) => `<p>${esc(c).replace(/\n/g, "<br>").replace(esc(lien), `<a href="${lien}" style="color:#ea580c;font-weight:bold">${etape === 1 ? "www.renolien.fr/entreprises" : "Voir les détails"}</a>`)}</p>`).join("") +
    `<p style="font-size:12px;color:#64748b;border-top:1px solid #e2e8f0;padding-top:10px">${esc(mention).replace(esc(stop), `<a href="${stop}" style="color:#64748b">se désinscrire</a>`)}</p></div>`;
  return { sujet, texte, html };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const body = await req.json().catch(() => ({}));

  // Autorisation : tâche planifiée (jeton secret) ou administrateur connecté (test)
  const { data: s } = await db.from("secrets_internes").select("valeur").eq("cle", "cron_prospection").single();
  const cron = req.headers.get("x-cron") === s?.valeur;
  let adminEmail = "";
  if (!cron) {
    const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: u } = await db.auth.getUser(jwt);
    const { data: pr } = u?.user ? await db.from("profils").select("role").eq("id", u.user.id).maybeSingle() : { data: null };
    if (pr?.role !== "admin") return json({ error: "Accès refusé" }, 403);
    adminEmail = u!.user!.email || "";
  }

  const cle = Deno.env.get("BREVO_API_KEY");
  if (!cle) return json({ error: "Clé BREVO_API_KEY manquante (Supabase > Edge Functions > Secrets)." }, 500);
  const { data: rg } = await db.from("reglages").select("valeur").eq("cle", "prospection").single();
  const R = rg!.valeur as any;

  async function envoyer(p: any, etape: number, a: string) {
    const { data: jeton } = await db.rpc("jeton_prospect", { p_siret: p.siret });
    const lien = `${SITE}/e/${p.siret}/${jeton}`;
    const stop = `${SITE}/desinscription?s=${p.siret}&t=${jeton}`;
    const c = contenu(p, etape, lien, stop);
    const r = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": cle!, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        sender: { email: R.expediteur, name: R.nom }, replyTo: { email: R.reponse },
        to: [{ email: a }], subject: c.sujet, textContent: c.texte, htmlContent: c.html,
        headers: { "List-Unsubscribe": `<${stop}>` }, tags: [`prospection-${etape}`],
      }),
    });
    const j = await r.json().catch(() => ({}));
    return r.ok ? { id: j.messageId as string } : { erreur: `${r.status} ${j.message || ""}`.trim() };
  }

  // Test : un e-mail d'exemple envoyé à l'administrateur
  if (!cron && body.test) {
    const { data: ex } = await db.from("prospects").select("*").not("email", "is", null).eq("dep", "94").limit(1).maybeSingle();
    const res = await envoyer(ex || { siret: "00000000000000", ville: "Créteil", metier: "Plomberie" }, Number(body.etape) || 1, adminEmail);
    return json(res.erreur ? { error: `Brevo : ${res.erreur}` } : { ok: true, a: adminEmail });
  }
  if (!R.actif) return json({ ok: true, message: "Prospection en pause" });

  // Quota du jour
  const debut = new Date(); debut.setUTCHours(0, 0, 0, 0);
  const { count: deja } = await db.from("prospects_emails").select("id", { count: "exact", head: true }).gte("envoye_le", debut.toISOString()).is("erreur", null);
  // Par appel : 80 e-mails maximum (la tâche planifiée appelle plusieurs fois dans la matinée)
  let reste = Math.min(80, Math.max(0, (R.par_jour || 250) - (deja || 0)));
  if (!reste) return json({ ok: true, envoyes: 0, message: "Quota du jour atteint" });

  const cibles: { p: any; etape: number }[] = [];
  // 1) Relances (étape 1 envoyée il y a plus de N jours, sans clic)
  const limite = new Date(Date.now() - (R.relance_jours || 5) * 86400000).toISOString();
  const { data: rel } = await db.from("prospects").select("*").eq("email_etape", 1).lt("email_dernier", limite).is("email_clic", null)
    .eq("desinscrit", false).in("statut", ["a_contacter", "contacte"]).not("email", "is", null).limit(reste);
  for (const p of rel || []) cibles.push({ p, etape: 2 });
  reste -= cibles.length;
  // 2) Premiers e-mails, par ordre de départements
  for (const d of (R.ordre_deps || ["94", "77", "75", "93", "92", "91", "95"]) as string[]) {
    if (reste <= 0) break;
    const { data: nv } = await db.from("prospects").select("*").eq("dep", d).eq("email_etape", 0).eq("desinscrit", false)
      .in("statut", ["a_contacter", "contacte", "interesse"]).not("email", "is", null).order("creation", { ascending: false, nullsFirst: false }).limit(reste);
    for (const p of nv || []) cibles.push({ p, etape: 1 });
    reste -= (nv || []).length;
  }

  let ok = 0, ko = 0;
  for (const { p, etape } of cibles) {
    const res = await envoyer(p, etape, p.email);
    await db.from("prospects_emails").insert({ siret: p.siret, etape, email: p.email, message_id: res.id || null, erreur: res.erreur || null });
    if (res.erreur) {
      ko++;
      await db.from("prospects").update({ email_erreur: res.erreur }).eq("siret", p.siret);
      if (/^(401|403)/.test(res.erreur)) break; // clé ou expéditeur refusé : on arrête
    } else {
      ok++;
      await db.from("prospects").update({ email_etape: etape, email_dernier: new Date().toISOString(), email_erreur: null,
        statut: p.statut === "a_contacter" ? "contacte" : p.statut }).eq("siret", p.siret);
    }
    await new Promise((r) => setTimeout(r, 120));
  }
  return json({ ok: true, envoyes: ok, erreurs: ko });
});
