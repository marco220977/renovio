// Fonction « prospection-mail » : envoie chaque jour les e-mails de prospection aux artisans (via Brevo).
// Appelée par la tâche planifiée (en-tête x-cron) ou par l'admin (bouton « Envoyer un test »).
// Secret requis : BREVO_API_KEY.
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const SITE = "https://www.renolien.fr";

// Métier lisible et exemples de chantiers, à partir du métier Sirene ou des domaines RGE
function metierDe(p: any): { pro: string; pros: string; ex: string } {
  const t = `${p.metier || ""} ${p.domaines_rge || ""}`.toLowerCase();
  if (/pompe|chauff|chaudi|clim|thermodyn|po[eê]le|bois|biomasse/.test(t)) return { pro: "chauffagiste", pros: "chauffagistes", ex: "remplacement de chaudière, pompe à chaleur, climatisation" };
  if (/plomb|sanitaire|eau chaude|ballon/.test(t)) return { pro: "plombier", pros: "plombiers", ex: "chauffe-eau, salle de bain, recherche de fuite" };
  if (/[ée]lectri|photovolta|solaire|borne/.test(t)) return { pro: "électricien", pros: "électriciens", ex: "tableau électrique, mise aux normes, borne de recharge" };
  if (/isol|comble|ite|iti|mur/.test(t)) return { pro: "artisan en isolation", pros: "artisans en isolation", ex: "isolation des combles, des murs et des planchers" };
  if (/fen[eê]tre|menuis|porte|volet|vitrage/.test(t)) return { pro: "menuisier", pros: "menuisiers", ex: "fenêtres, portes d'entrée, volets roulants" };
  if (/couvert|toit|charpente|zinguerie/.test(t)) return { pro: "couvreur", pros: "couvreurs", ex: "réfection de toiture, fuite, gouttières" };
  if (/peint|vitrerie/.test(t)) return { pro: "peintre", pros: "peintres", ex: "peinture de pièces, rénovation avant location" };
  if (/pl[aâ]tr|plaqu/.test(t)) return { pro: "plaquiste", pros: "plaquistes", ex: "cloisons, faux plafonds, doublages" };
  if (/carrel|sol/.test(t)) return { pro: "carreleur", pros: "carreleurs", ex: "carrelage, faïence, douche à l'italienne" };
  if (/ma[cç]on|gros|construction|terrass/.test(t)) return { pro: "maçon", pros: "maçons", ex: "ouverture de mur, dalle, extension" };
  if (/architect|audit|bureau|[ée]tude/.test(t)) return { pro: "professionnel de la rénovation", pros: "professionnels de la rénovation", ex: "rénovation énergétique, audits, travaux complets" };
  return { pro: "artisan", pros: "artisans", ex: "rénovation, réparations, petits travaux" };
}
const titre = (s: string) => (s || "").toLowerCase().replace(/(^|[\s'-])\S/g, (m) => m.toUpperCase())
  .replace(/([\s-])(Le|La|Les|De|Du|Des|Sur|Sous|En|Et|Lès)(?=[\s-])/g, (_m, sep, mot) => sep + mot.toLowerCase());
const majuscule = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// Version C : e-mail « recrutement membre fondateur » (plateforme en création, constitution du réseau d'artisans)
function versionC(m: { pros: string }, ville: string, etape: number, lien: string, offre: string, signature: string) {
  if (etape === 1) return {
    sujet: `Devenez membre fondateur de Rénolien – gratuit pour les artisans`,
    corps: [
      `Bonjour,`,
      `Je me permets de vous contacter au sujet du lancement de Rénolien (www.renolien.fr), une nouvelle plateforme qui met en relation les particuliers d'Île-de-France et les artisans de la rénovation.`,
      `Nous sommes actuellement en phase de création. Avant d'ouvrir la plateforme aux particuliers, nous constituons notre réseau d'entreprises qualifiées : quand les demandes de travaux arriveront, chaque client doit trouver un artisan sérieux près de chez lui. C'est pourquoi nous recrutons dès maintenant des ${m.pros} autour de ${ville}.`,
      `Comment fonctionne Rénolien pour vous :\n• Le client décrit son projet et une estimation est préparée automatiquement.\n• Vous consultez les demandes de votre secteur et envoyez votre offre (5 artisans maximum par chantier, pas d'enchères).\n• Vous échangez avec le client par messagerie et organisez la visite.\n• Vous ne payez que si le client vous choisit, 0 % de commission.\n• Le client vous règle directement, sans intermédiaire.`,
      `Notre offre de lancement : gratuit et illimité jusqu'au 1er janvier 2027, puis -30 % à vie. Les entreprises qui nous rejoignent maintenant obtiennent le statut de membre fondateur et seront les premières à recevoir les demandes de leur secteur.`,
      `Inscription en 2 minutes : ${lien}`,
      `Je reste à votre disposition pour toute question : répondez simplement à ce message.`,
      signature,
    ],
  };
  return {
    sujet: `Rénolien – plus que quelques semaines pour devenir membre fondateur`,
    corps: [
      `Bonjour,`,
      `Je reviens vers vous au sujet de Rénolien, la plateforme de mise en relation entre particuliers et artisans de la rénovation en Île-de-France, actuellement en phase de lancement.`,
      `Nous finalisons la constitution de notre réseau de professionnels avant l'ouverture aux clients. Les entreprises inscrites dès maintenant seront les premières à recevoir les demandes de travaux autour de ${ville}.`,
      `Pour rappel :\n• Gratuit et illimité jusqu'au 1er janvier 2027, puis -30 % à vie\n• Statut de membre fondateur\n• Aucun frais tant qu'un client ne vous a pas choisi\n• Paiement direct par vos clients, sans intermédiaire`,
      `Pour réserver votre place dans votre secteur : ${lien}`,
      `Si ce n'est pas pour vous, dites-le-moi simplement et je ne vous écrirai plus.`,
      signature,
    ],
  };
}

// E-mails courts, au ton personnel (moins « publicité », meilleure délivrabilité), terminés par une question.
// Version A : lien vers la page d'inscription. Version B : lien d'activation du profil préparé (pré-inscription).
// Version C : e-mail plus complet « recrutement membre fondateur », lien vers la page d'inscription.
function contenuCommun(p: any, etape: number, lien: string, stop: string, version: string) {
  const m = metierDe(p);
  const ville = titre(p.ville || "") || "votre secteur";
  const nom = titre(p.nom || "") || "votre entreprise";
  const de = /^[aeiouyhéèêàâîô]/i.test(nom) ? "d'" : "de ";
  // Objet : A = question courte ; B = profil prêt, personnalisé avec le nom de l'entreprise (ce qui fait ouvrir)
  const objet = version === "B" ? `${nom}, votre profil Rénolien est prêt` : `${majuscule(m.pro)} à ${ville}, une question rapide`;
  let sujet = etape === 1 ? objet : `Re : ${objet}`;
  const offre = `Pour les premiers inscrits : gratuit et illimité jusqu'au 1er janvier 2027, puis -30 % à vie.`;
  const signature = `Marco\nPlombier-chauffagiste, fondateur de Rénolien\nwww.renolien.fr`;
  let corps: string[];
  if (version === "C") {
    const c = versionC(m, ville, etape, lien, offre, signature);
    sujet = c.sujet; corps = c.corps;
  } else corps = etape === 1 ? (version === "B" ? [
    `Bonjour,`,
    `J'ai préparé le profil ${de}${nom} sur Rénolien, la nouvelle plateforme qui transmet aux artisans d'Île-de-France les demandes de travaux des particuliers de leur secteur. Il ne reste qu'à l'activer : rien n'est publié sans votre accord.`,
    `Concrètement : des demandes près de chez vous (${ville} et alentours), 5 artisans maximum par chantier, pas d'enchères, 0 % de commission. Vous ne payez que si un client vous choisit.`,
    offre,
    `Activer mon profil (1 clic) : ${lien}`,
    `Ça vous intéresse ? Répondez simplement à ce message.`,
    signature,
  ] : [
    `Bonjour,`,
    `Je suis Marco, plombier-chauffagiste et fondateur de Rénolien : les particuliers d'Île-de-France y publient leurs travaux, et jusqu'à 5 artisans du secteur leur répondent. Pas d'enchères, 0 % de commission, vous ne payez que si un client vous choisit.`,
    `Je recherche quelques ${m.pros} sérieux autour de ${ville}. ${offre}`,
    `Inscription en 2 minutes : ${lien}`,
    `Ça vous intéresse ? Répondez simplement à ce message.`,
    signature,
  ]) : (version === "B" ? [
    `Bonjour,`,
    `Je me permets de revenir vers vous une seule fois : le profil ${de}${nom} est toujours prêt sur Rénolien, il ne reste qu'à l'activer.`,
    `Les premières demandes de particuliers autour de ${ville} iront aux artisans déjà inscrits. ${offre}`,
    `Activer mon profil (1 clic) : ${lien}`,
    `Si ce n'est pas pour vous, dites-le-moi simplement et je ne vous écrirai plus.`,
    signature,
  ] : [
    `Bonjour,`,
    `Je me permets de revenir vers vous une seule fois : je constitue en ce moment le réseau des premiers ${m.pros} autour de ${ville} sur Rénolien.`,
    `Les premières demandes de particuliers du secteur iront aux artisans déjà inscrits. ${offre}`,
    `Inscription en 2 minutes : ${lien}`,
    `Si ce n'est pas pour vous, dites-le-moi simplement et je ne vous écrirai plus.`,
    signature,
  ]);
  const mention = `Vos coordonnées professionnelles proviennent des registres publics (Sirene, RGE de l'ADEME). Pour ne plus recevoir de message : ${stop}`;
  const texte = corps.join("\n\n") + "\n\n--\n" + mention;
  const esc = (x: string) => x.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const affiche = version === "B" ? `www.renolien.fr/p/${p.siret}` : "www.renolien.fr/entreprises";
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#111">` +
    corps.map((c) => `<p>${esc(c).replace(/\n/g, "<br>").replace(esc(lien), `<a href="${lien}">${affiche}</a>`)}</p>`).join("") +
    `<p style="font-size:12px;color:#666">${esc(mention).replace(esc(stop), `<a href="${stop}" style="color:#666">se désinscrire</a>`)}</p></div>`;
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

  async function envoyer(p: any, etape: number, a: string, version: string) {
    const { data: jeton } = await db.rpc("jeton_prospect", { p_siret: p.siret });
    // En test, le lien de pré-inscription ouvre un aperçu (aucun compte créé, aucun clic compté)
    const lien = version === "B" ? (a === p.email ? `${SITE}/p/${p.siret}/${jeton}` : `${SITE}/p/demo/demo`) : `${SITE}/e/${p.siret}/${jeton}`;
    const stop = `${SITE}/desinscription?s=${p.siret}&t=${jeton}`;
    const c = contenuCommun(p, etape, lien, stop, version);
    const r = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": cle!, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        sender: { email: R.expediteur, name: R.nom }, replyTo: { email: R.reponse },
        to: [{ email: a }], subject: c.sujet, textContent: c.texte, htmlContent: c.html,
        headers: { "List-Unsubscribe": `<${stop}>` }, tags: [`prospection-${etape}`, `version-${version}`],
      }),
    });
    const j = await r.json().catch(() => ({}));
    return r.ok ? { id: j.messageId as string } : { erreur: `${r.status} ${j.message || ""}`.trim() };
  }

  // Test : un e-mail d'exemple envoyé à l'administrateur
  if (!cron && body.test) {
    const { data: ex } = await db.from("prospects").select("*").not("email", "is", null).eq("dep", "94").limit(1).maybeSingle();
    const vt = body.version === "B" || body.version === "C" ? body.version : "A";
    const res = await envoyer(ex || { siret: "00000000000000", nom: "PLOMBERIE EXEMPLE", cp: "94000", ville: "Créteil", metier: "Plomberie" }, Number(body.etape) || 1, adminEmail, vt);
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
    .eq("desinscrit", false).eq("hors_cible", false).in("statut", ["a_contacter", "contacte"]).not("email", "is", null).limit(reste);
  for (const p of rel || []) cibles.push({ p, etape: 2 });
  reste -= cibles.length;
  // 2) Premiers e-mails, par ordre de départements
  for (const d of (R.ordre_deps || ["94", "77", "75", "93", "92", "91", "95"]) as string[]) {
    if (reste <= 0) break;
    const { data: nv } = await db.from("prospects").select("*").eq("dep", d).eq("email_etape", 0).eq("desinscrit", false).eq("hors_cible", false)
      .in("statut", ["a_contacter", "contacte", "interesse"]).not("email", "is", null).order("creation", { ascending: false, nullsFirst: false }).limit(reste);
    for (const p of nv || []) cibles.push({ p, etape: 1 });
    reste -= (nv || []).length;
  }

  // Test A/B/C : les nouveaux prospects sont répartis à parts égales entre les versions A, B et C, en alternant
  const mode = R.mode || "ab";
  const VERSIONS = ["A", "B", "C"];
  const compte: Record<string, number> = {};
  for (const v of VERSIONS) {
    const { count } = await db.from("prospects").select("siret", { count: "exact", head: true }).eq("version", v);
    compte[v] = count || 0;
  }
  const versionDe = (p: any, etape: number) => {
    if (etape > 1 && p.version) return p.version;
    if (VERSIONS.includes(mode)) return mode;
    const v = VERSIONS[tour % VERSIONS.length]; tour++; return v;
  };
  // Rotation A → B → C, en commençant par la version la moins envoyée
  let tour = VERSIONS.indexOf(VERSIONS.reduce((a, b) => (compte[b] < compte[a] ? b : a)));

  let ok = 0, ko = 0;
  for (const { p, etape } of cibles) {
    const version = versionDe(p, etape);
    const res = await envoyer(p, etape, p.email, version);
    await db.from("prospects_emails").insert({ siret: p.siret, etape, email: p.email, message_id: res.id || null, erreur: res.erreur || null });
    if (res.erreur) {
      ko++;
      await db.from("prospects").update({ email_erreur: res.erreur }).eq("siret", p.siret);
      if (/^(401|403)/.test(res.erreur)) break; // clé ou expéditeur refusé : on arrête
    } else {
      ok++;
      await db.from("prospects").update({ email_etape: etape, email_dernier: new Date().toISOString(), email_erreur: null, version,
        statut: p.statut === "a_contacter" ? "contacte" : p.statut }).eq("siret", p.siret);
    }
    await new Promise((r) => setTimeout(r, 120));
  }
  return json({ ok: true, envoyes: ok, erreurs: ko });
});
