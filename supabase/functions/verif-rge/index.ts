// Fonction « verif-rge » : vérifie la mention RGE de l'artisan connecté dans le registre officiel de l'ADEME
// (jeu de données public « liste-des-entreprises-rge-2 », le même que l'annuaire France Rénov'), à partir de son SIRET.
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const API = "https://data.ademe.fr/data-fair/api/v1/datasets/liste-des-entreprises-rge-2/lines";

// Les noms de champs du registre ont varié : on cherche la date par motif
const champ = (l: any, motifs: RegExp[]) => {
  for (const m of motifs) for (const k of Object.keys(l)) if (m.test(k) && l[k]) return String(l[k]);
  return "";
};
const jour = (s: string) => (/^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : "");

async function lignes(qs: string) {
  const r = await fetch(`${API}?size=200&qs=${encodeURIComponent(qs)}`, { headers: { accept: "application/json" } });
  if (!r.ok) throw new Error(`ADEME ${r.status}`);
  const j = await r.json();
  return (j.results || []) as any[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: u } = await admin.auth.getUser(jwt);
  if (!u?.user) return json({ error: "Connectez-vous" }, 401);
  const { data: a } = await admin.from("artisans").select("id, siret").eq("id", u.user.id).maybeSingle();
  const siret = String(a?.siret || "").replace(/\D/g, "");
  if (siret.length !== 14) return json({ error: "Renseignez et enregistrez d'abord votre SIRET (14 chiffres)." }, 400);

  let res: any[];
  try {
    res = await lignes(`siret:"${siret}"`);
    if (!res.length) res = (await lignes(`siret:${siret.slice(0, 9)}*`)).filter((l) => String(l.siret || "").startsWith(siret.slice(0, 9)));
  } catch (e) {
    console.error(e);
    return json({ error: "Le registre RGE de l'ADEME ne répond pas. Réessayez dans quelques minutes." }, 503);
  }

  const auj = new Date().toISOString().slice(0, 10);
  const vus = new Set<string>();
  const certificats = res.map((l) => {
    const debut = jour(champ(l, [/date_debut/i, /debut/i]));
    const fin = jour(champ(l, [/date_fin/i, /fin/i]));
    return {
      siret: String(l.siret || ""),
      domaine: String(l.domaine || ""), meta_domaine: String(l.meta_domaine || ""),
      qualification: String(l.nom_qualification || l.nom_certificat || ""),
      organisme: String(l.organisme || ""),
      debut, fin, actif: (!debut || debut <= auj) && (!!fin && fin >= auj),
      url: String(l.url_qualification || ""),
    };
  }).filter((c) => { const k = `${c.domaine}|${c.qualification}|${c.fin}`; if (vus.has(k)) return false; vus.add(k); return true; })
    .sort((x, y) => Number(y.actif) - Number(x.actif) || y.fin.localeCompare(x.fin));

  const actifs = certificats.filter((c) => c.actif);
  const details = {
    verifie_le: new Date().toISOString(),
    siret,
    trouve: certificats.length > 0,
    autre_etablissement: certificats.length > 0 && !certificats.some((c) => c.siret === siret),
    fin: actifs.reduce((m, c) => (c.fin > m ? c.fin : m), "") || null,
    domaines: [...new Set(actifs.map((c) => c.domaine).filter(Boolean))],
    certificats: certificats.slice(0, 30),
  };
  const rge = actifs.length > 0;
  const { error } = await admin.from("artisans").update({ rge, rge_details: details }).eq("id", a!.id);
  if (error) { console.error(error); return json({ error: "Enregistrement impossible" }, 500); }
  return json({ rge, rge_details: details });
});
