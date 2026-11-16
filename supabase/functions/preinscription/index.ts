// Fonction « preinscription » : l'artisan valide le profil préparé pour lui (lien personnel signé reçu par e-mail).
// Crée son compte (e-mail confirmé), sa fiche artisan préremplie, et le marque inscrit. Public (le jeton fait foi).
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const METIERS = ["plomberie", "chauffage", "electricite", "maconnerie", "platrerie", "isolation", "peinture", "carrelage", "sols", "menuiserie", "couverture", "facade", "agencement", "exterieur", "multiservice"];
const DEPS = ["75", "77", "78", "91", "92", "93", "94", "95"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const b = await req.json().catch(() => ({}));
  const siret = String(b.siret || "").replace(/\D/g, "");
  const { data: jeton } = await db.rpc("jeton_prospect", { p_siret: siret });
  if (!siret || !b.jeton || jeton !== b.jeton) return json({ error: "Ce lien n'est pas valide. Inscrivez-vous depuis www.renolien.fr/entreprises." }, 400);

  const { data: p } = await db.from("prospects").select("*").eq("siret", siret).maybeSingle();
  if (!p) return json({ error: "Profil introuvable." }, 404);
  const { count } = await db.from("artisans").select("id", { count: "exact", head: true }).or(`siret.eq.${siret},siret.like.${siret.slice(0, 9)}%`);
  if (count) return json({ error: "Cette entreprise a déjà un compte Rénolien. Connectez-vous depuis www.renolien.fr/connexion." }, 409);

  const email = String(b.email || "").trim().toLowerCase();
  // Mot de passe facultatif : sans mot de passe, on en génère un au hasard et l'artisan choisira le sien ensuite
  const mdp = String(b.mot_de_passe || "") || crypto.randomUUID() + "Aa1!";
  const metiers = (Array.isArray(b.metiers) ? b.metiers : []).filter((m: string) => METIERS.includes(m));
  const deps = (Array.isArray(b.departements) ? b.departements : []).filter((d: string) => DEPS.includes(d));
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "Adresse e-mail invalide." }, 400);
  if (mdp.length < 6) return json({ error: "Le mot de passe doit faire au moins 6 caractères." }, 400);
  if (!metiers.length) return json({ error: "Choisissez au moins un métier." }, 400);
  if (!deps.length) return json({ error: "Choisissez au moins un département." }, 400);
  const nom = String(b.contact || p.dirigeant || "").slice(0, 80);
  const tel = String(b.telephone || p.telephone || "").slice(0, 20);
  const raison = String(b.raison_sociale || p.nom || "").slice(0, 120);

  const { data: u, error: e1 } = await db.auth.admin.createUser({
    email, password: mdp, email_confirm: true,
    user_metadata: { app: "mer", role: "artisan", full_name: nom, phone: tel, company_name: raison, trades: metiers, source: "preinscription" },
  });
  if (e1 || !u?.user) {
    const deja = /already|registered|exists/i.test(e1?.message || "");
    return json({ error: deja ? "Un compte existe déjà avec cette adresse e-mail. Connectez-vous ou utilisez « Mot de passe oublié »." : "Création du compte impossible : " + (e1?.message || "erreur") }, 400);
  }

  // Marque la pré-inscription avant d'enregistrer le SIRET (le message « nouvel artisan » le mentionne)
  await db.from("prospects").update({ pre_valide: new Date().toISOString() }).eq("siret", siret);
  const { error: e2 } = await db.from("artisans").update({
    siret, raison_sociale: raison, forme: p.forme || null, adresse: b.adresse || p.adresse || null, cp: b.cp || p.cp || null,
    ville: b.ville || p.ville || null, telephone: tel || null, email, metiers, departements: deps,
  }).eq("id", u.user.id);
  if (e2) {
    await db.auth.admin.deleteUser(u.user.id);
    await db.from("prospects").update({ pre_valide: null }).eq("siret", siret);
    return json({ error: "Enregistrement impossible : " + e2.message }, 400);
  }
  // Connexion immédiate : jeton à usage unique que la page échange contre une session
  const { data: lien } = await db.auth.admin.generateLink({ type: "magiclink", email });
  return json({ ok: true, token_hash: lien?.properties?.hashed_token || null });
});
