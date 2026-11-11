import { createClient } from "npm:@supabase/supabase-js@2";
// Fonction Supabase « travaux-ia » : l'IA de la mise en relation.
//  - action "questions" : comprend la demande du client et pose 3 à 6 questions
//  - action "cahier"    : rédige le cahier des charges + fourchette de budget
//  - action "devis"     : pré-remplit le devis de l'artisan à partir de ses tarifs
//  - action "attestation" : lit l'attestation décennale déposée par l'artisan et la compare à sa fiche
// Secret requis : ANTHROPIC_API_KEY (Supabase > Edge Functions > Secrets). Optionnel : ANTHROPIC_MODEL.
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const METIERS = `plomberie (plomberie, sanitaire), chauffage (chauffage, climatisation, PAC), electricite, maconnerie (gros œuvre),
platrerie (plaquiste, cloisons, faux plafonds), isolation, peinture (peinture, revêtements muraux), carrelage (carrelage, faïence),
sols (parquet, sols souples), menuiserie (fenêtres, portes, volets), couverture (toiture, charpente, zinguerie), facade (ravalement),
agencement (cuisine, salle de bain clé en main), exterieur (terrassement, VRD, terrasse, allée), multiservice (petits travaux)`;
const IDS = ["plomberie", "chauffage", "electricite", "maconnerie", "platrerie", "isolation", "peinture", "carrelage", "sols",
  "menuiserie", "couverture", "facade", "agencement", "exterieur", "multiservice"];

const BASE = `Tu es un conducteur de travaux expérimenté en rénovation de l'habitat en France. Tu aides des particuliers à décrire leurs travaux
et des artisans à chiffrer. Tu écris en français simple. Tu réponds en remplissant l'outil « repondre ». Sois concis : désignations courtes, pas de phrases inutiles.
Identifiants de métiers autorisés : ${METIERS}. Utilise seulement ces identifiants (avant les parenthèses).`;


const str = { type: "string" };
const num = { type: "number" };
const arr = (items: unknown) => ({ type: "array", items });
const SCHEMAS: Record<string, unknown> = {
  questions: { type: "object", required: ["titre", "metiers", "questions"], properties: {
    titre: str, metiers: arr(str), resume: str,
    questions: arr({ type: "object", required: ["id", "question", "type"], properties: {
      id: str, question: str, type: { type: "string", enum: ["choix", "texte", "nombre"] }, options: arr(str), unite: str } }) } },
  cahier: { type: "object", required: ["titre", "metiers", "resume", "lots", "budget_min", "budget_max"], properties: {
    titre: str, metiers: arr(str), resume: str, budget_min: num, budget_max: num,
    points_attention: arr(str), hypotheses: arr(str),
    lots: arr({ type: "object", required: ["titre", "postes"], properties: {
      titre: str, metier: str,
      postes: arr({ type: "object", required: ["designation"], properties: { designation: str, quantite: num, unite: str, precisions: str } }) } }) } },
  devis: { type: "object", required: ["lignes"], properties: {
    hypotheses: arr(str), delai_jours: num, duree_jours: num,
    lignes: arr({ type: "object", required: ["label", "qty", "unit", "unit_price", "vat_rate"], properties: {
      kind: { type: "string", enum: ["section", "ligne"] }, label: str, description: str, qty: num, unit: str, unit_price: num, vat_rate: num } }) } },
};

function prompt(action: string, b: any): string {
  if (action === "questions") return `${BASE}
Demande du client (code postal ${b.cp || "?"}) :
"""${b.description}"""
${b.photos?.length ? "Des photos du lieu sont jointes." : ""}
Comprends le projet et pose entre 3 et 6 questions courtes, utiles pour chiffrer (surfaces, dimensions, état existant, équipements souhaités,
gamme de finition, accès, étage…). Ne repose pas une question dont la réponse est déjà dans la description. Propose des choix quand c'est possible.
Format : {"titre":"titre court du projet (6 mots max)","metiers":["id",...],"resume":"une phrase","questions":[{"id":"q1","question":"…","type":"choix|texte|nombre","options":["…"],"unite":"m² (si nombre)"}]}`;

  if (action === "cahier") return `${BASE}
Demande du client (code postal ${b.cp || "?"}, délai souhaité : ${b.delai || "?"}) :
"""${b.description}"""
Réponses du client aux questions :
${(b.reponses || []).map((r: any) => `- ${r.question} → ${r.reponse || "(sans réponse)"}`).join("\n")}
${b.photos?.length ? "Des photos du lieu sont jointes." : ""}
Rédige le cahier des charges : le projet découpé en lots (un lot par corps de métier ou grande étape), chaque lot avec ses postes et des quantités
estimées (indique "à confirmer" dans precisions si tu estimes). Donne une fourchette de budget TTC réaliste au prix du marché français actuel
(fourniture et pose, gamme moyenne), en restant prudent : budget_min et budget_max en euros, nombres entiers.
Format : {"titre":"…","metiers":["id",...],"resume":"2 phrases","lots":[{"titre":"Lot 1 — …","metier":"id","postes":[{"designation":"…","quantite":12,"unite":"m²|ml|u|forfait|h","precisions":"…"}]}],
"budget_min":0,"budget_max":0,"points_attention":["à vérifier lors de la visite…"],"hypotheses":["…"]}`;

  if (action === "devis") return `${BASE}
Tu prépares le devis d'un artisan pour ce cahier des charges :
${JSON.stringify(b.cahier)}
Tarifs habituels de l'artisan (libellé | unité | prix HT | TVA %) :
${(b.tarifs || []).slice(0, 400).map((t: any) => `${t.libelle} | ${t.unite} | ${t.prix_ht} | ${t.tva}`).join("\n") || "(aucun tarif saisi)"}
${b.tva_franchise ? "L'artisan est en franchise de TVA : mets vat_rate à 0 partout." : `TVA : 10 % pour des travaux dans un logement de plus de 2 ans, 5,5 % pour l'amélioration énergétique (isolation, PAC, chaudière à haute performance…), 20 % sinon.`}
Règles :
- Une ligne de titre par lot : {"kind":"section","label":"Lot 1 — …","qty":0,"unit":"","unit_price":0,"vat_rate":0}.
- Utilise en priorité les tarifs de l'artisan (même libellé, même prix). S'il n'y a pas de tarif adapté, estime un prix HT réaliste du marché
  et ajoute "(prix estimé, à vérifier)" dans description.
- Inclus la main d'œuvre, les fournitures, la dépose/évacuation et le déplacement si pertinent. Quantités reprises du cahier des charges.
Format : {"lignes":[{"kind":"section"?,"label":"…","description":"…","qty":1,"unit":"u","unit_price":0,"vat_rate":10}],"hypotheses":["…"],"delai_jours":14,"duree_jours":5}`;
  return "";
}

function frError(msg: string, status: number): string {
  const m = (msg || "").toLowerCase();
  if (m.includes("credit balance")) return "Service IA momentanément indisponible (crédit épuisé). Prévenez l'administrateur.";
  if (status === 401 || m.includes("api key") || m.includes("authentication")) return "Clé IA invalide. Prévenez l'administrateur.";
  if (status === 429 || m.includes("rate limit")) return "Trop de demandes en même temps, réessayez dans une minute.";
  if (status === 529 || m.includes("overloaded")) return "Service IA surchargé, réessayez dans un instant.";
  return "L'IA n'a pas pu répondre, réessayez.";
}

// ---------- Lecture de l'attestation décennale ----------

const SCHEMA_ATTESTATION = { type: "object", required: ["est_attestation_decennale", "lisible"], properties: {
  est_attestation_decennale: { type: "boolean" }, lisible: { type: "boolean" },
  assureur: str, numero_contrat: str, entreprise: str, siret: str, adresse: str,
  date_debut: str, date_fin: str, activites: arr(str), metiers_couverts: arr(str), zone: str, remarques: arr(str) } };

const PROMPT_ATTESTATION = `Tu contrôles une attestation d'assurance pour une plateforme française de mise en relation avec des artisans du bâtiment.
Lis le document joint et remplis l'outil « repondre » :
- est_attestation_decennale : true seulement si c'est une attestation d'assurance de responsabilité civile décennale (pas une RC pro seule, pas un devis d'assurance, pas une facture).
- lisible : false si le document est flou, coupé ou illisible.
- assureur, numero_contrat, entreprise (nom de l'assuré), siret (14 chiffres, ou SIREN 9 chiffres si seul présent), adresse.
- date_debut et date_fin : période de validité de l'attestation, au format AAAA-MM-JJ. Vide si absente.
- activites : les activités couvertes, telles qu'écrites.
- metiers_couverts : parmi ces identifiants, ceux réellement couverts par les activités : ${METIERS}. Seulement les identifiants avant les parenthèses.
- zone : zone géographique couverte (ex : France métropolitaine).
- remarques : anomalies visibles (incohérences de dates, texte qui semble modifié, mentions obligatoires absentes, activités exclues…). Liste vide si rien.
N'invente rien : laisse un champ vide si l'information n'est pas sur le document.`;

const norm = (s: string) => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .replace(/\b(sarl|sas|sasu|eurl|ei|eirl|sa|sci|snc|ets|entreprise|societe|ste|et|de|du|la|le|les)\b/g, " ").replace(/[^a-z0-9]+/g, " ").trim();
function memeNom(a: string, b: string) {
  const x = norm(a).split(" ").filter((w) => w.length > 2), y = new Set(norm(b).split(" ").filter((w) => w.length > 2));
  return x.length > 0 && x.some((w) => y.has(w));
}

async function analyserAttestation(req: Request, body: any, key: string) {
  const url = Deno.env.get("SUPABASE_URL")!, service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const admin = createClient(url, service, { auth: { persistSession: false } });
  const { data: u } = await admin.auth.getUser(jwt);
  if (!u?.user) return json({ error: "Connectez-vous" }, 401);
  const { data: a } = await admin.from("artisans").select("*").eq("id", u.user.id).maybeSingle();
  if (!a?.decennale_doc) return json({ error: "Aucune attestation envoyée" }, 400);
  if (!String(a.decennale_doc).startsWith(`${u.user.id}/`)) return json({ error: "Accès refusé" }, 403);

  const { data: f, error: e } = await admin.storage.from("attestations").download(a.decennale_doc);
  if (e || !f) return json({ error: "Attestation introuvable" }, 404);
  const buf = new Uint8Array(await f.arrayBuffer());
  let bin = ""; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  const b64 = btoa(bin);
  const ext = String(a.decennale_doc).split(".").pop()!.toLowerCase();
  const type = f.type && f.type !== "application/octet-stream" ? f.type
    : ext === "pdf" ? "application/pdf" : ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
  let doc: any;
  if (type === "application/pdf") doc = { type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } };
  else if (["image/jpeg", "image/png", "image/webp", "image/gif"].includes(type)) doc = { type: "image", source: { type: "base64", media_type: type, data: b64 } };
  else return json({ error: "Format non lu automatiquement : envoyez une photo JPG/PNG ou un PDF." }, 400);

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: Deno.env.get("ANTHROPIC_MODEL") || "claude-sonnet-5-5", max_tokens: 3000,
      tools: [{ name: "repondre", description: "Donne la réponse au format demandé.", input_schema: SCHEMA_ATTESTATION }],
      tool_choice: { type: "auto" },
      messages: [{ role: "user", content: [doc, { type: "text", text: PROMPT_ATTESTATION + "\n\nRéponds uniquement en appelant l'outil « repondre »." }] }],
    }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { console.error("Anthropic error", r.status, j?.error?.message); return json({ error: frError(j?.error?.message || "", r.status) }, 502); }
  let out: any = j.content?.find((c: any) => c.type === "tool_use")?.input;
  if (!out) { const t: string = j.content?.find((c: any) => c.type === "text")?.text || ""; try { out = JSON.parse(t.slice(t.indexOf("{"), t.lastIndexOf("}") + 1)); } catch { /* rien */ } }
  if (!out) return json({ error: "Lecture de l'attestation impossible, réessayez." }, 502);

  // Comparaison avec la fiche de l'artisan
  const alertes: string[] = [];
  const ok: string[] = [];
  const auj = new Date().toISOString().slice(0, 10);
  const dateOk = (d?: string) => /^\d{4}-\d{2}-\d{2}$/.test(d || "");
  if (!out.lisible) alertes.push("Document peu lisible : envoyez une photo plus nette ou le PDF.");
  if (!out.est_attestation_decennale) alertes.push("Ce document ne semble pas être une attestation d'assurance décennale.");
  const siretDoc = String(out.siret || "").replace(/\D/g, ""), siret = String(a.siret || "").replace(/\D/g, "");
  if (siretDoc && siret) {
    if (siretDoc.slice(0, 9) === siret.slice(0, 9)) ok.push("SIRET identique à la fiche");
    else alertes.push(`SIRET différent de la fiche (attestation : ${siretDoc}).`);
  } else if (out.entreprise) {
    if (memeNom(out.entreprise, a.raison_sociale || "")) ok.push("Nom de l'entreprise identique à la fiche");
    else alertes.push(`Nom de l'assuré différent de la fiche (« ${out.entreprise} »).`);
  } else alertes.push("Nom de l'assuré et SIRET absents de l'attestation.");
  if (!dateOk(out.date_fin)) alertes.push("Date de fin de validité introuvable.");
  else if (out.date_fin < auj) alertes.push(`Attestation expirée depuis le ${out.date_fin.split("-").reverse().join("/")}.`);
  else ok.push(`Valable jusqu'au ${out.date_fin.split("-").reverse().join("/")}`);
  if (dateOk(out.date_debut) && out.date_debut > auj) alertes.push("La période de validité n'a pas encore commencé.");
  const couverts: string[] = Array.isArray(out.metiers_couverts) ? out.metiers_couverts.filter((m: string) => IDS.includes(m)) : [];
  const nonCouverts = (a.metiers || []).filter((m: string) => !couverts.includes(m));
  if (nonCouverts.length) alertes.push(`Métiers cochés non couverts par l'assurance : ${nonCouverts.join(", ")}.`);
  else if ((a.metiers || []).length) ok.push("Tous les métiers cochés sont couverts");
  for (const rq of (out.remarques || []).slice(0, 5)) alertes.push(`À vérifier : ${rq}`);

  const analyse = {
    ...out, metiers_couverts: couverts, date_fin: dateOk(out.date_fin) ? out.date_fin : null, date_debut: dateOk(out.date_debut) ? out.date_debut : null,
    alertes, ok, doc: a.decennale_doc, analyse_le: new Date().toISOString(),
  };
  const maj: Record<string, unknown> = { decennale_analyse: analyse };
  if (analyse.date_fin) maj.decennale_fin = analyse.date_fin;
  if (!a.decennale && out.assureur) maj.decennale = [out.assureur, out.numero_contrat && `n° ${out.numero_contrat}`].filter(Boolean).join(" ");
  const { error: e2 } = await admin.from("artisans").update(maj).eq("id", a.id);
  if (e2) { console.error(e2); return json({ error: "Enregistrement de l'analyse impossible" }, 500); }
  return json({ analyse, decennale: maj.decennale ?? a.decennale, decennale_fin: maj.decennale_fin ?? a.decennale_fin });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) return json({ error: "Clé ANTHROPIC_API_KEY manquante (Supabase > Edge Functions > Secrets)" }, 500);
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "");
  if (action === "attestation") return await analyserAttestation(req, body, key);
  const text = prompt(action, body);
  if (!text) return json({ error: "Action inconnue" }, 400);
  if (action !== "devis" && !String(body.description || "").trim()) return json({ error: "Décrivez vos travaux" }, 400);

  const content: any[] = [];
  for (const p of (body.photos || []).slice(0, 3)) {
    const m = /^data:(image\/\w+);base64,(.+)$/.exec(p || "");
    if (m) content.push({ type: "image", source: { type: "base64", media_type: m[1], data: m[2] } });
  }
  content.push({ type: "text", text: text + "\n\nRéponds uniquement en appelant l'outil « repondre »." });

  // Réponse forcée dans un « formulaire » (outil) : le JSON est toujours valide
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: Deno.env.get("ANTHROPIC_MODEL") || "claude-sonnet-5-5",
      max_tokens: action === "questions" ? 3000 : 16000,
      tools: [{ name: "repondre", description: "Donne la réponse au format demandé.", input_schema: SCHEMAS[action] }],
      tool_choice: { type: "auto" },
      messages: [{ role: "user", content }],
    }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    console.error("Anthropic error", r.status, j?.error?.message);
    return json({ error: frError(j?.error?.message || "", r.status) }, 502);
  }
  let out: any = j.content?.find((c: any) => c.type === "tool_use")?.input;
  if (!out) {
    const txt: string = j.content?.find((c: any) => c.type === "text")?.text || "";
    const brut = txt.replace(/```(json)?/g, "");
    try { out = JSON.parse(brut.slice(brut.indexOf("{"), brut.lastIndexOf("}") + 1)); }
    catch { try { out = JSON.parse(brut.slice(brut.indexOf("{"), brut.lastIndexOf("}") + 1).replace(/,\s*([}\]])/g, "$1")); } catch { /* rien */ } }
  }
  if (!out || typeof out !== "object") {
    console.error("Réponse illisible", j.stop_reason, JSON.stringify(j.content)?.slice(0, 2000));
    return json({ error: j.stop_reason === "max_tokens" ? "Projet trop long pour l'IA, simplifiez la description et réessayez." : "Réponse de l'IA illisible, réessayez." }, 502);
  }
  if (Array.isArray(out.metiers)) out.metiers = out.metiers.filter((m: string) => IDS.includes(m));
  if (Array.isArray(out.lignes)) {
    out.lignes = out.lignes.map((l: any) => l.kind === "section"
      ? { kind: "section", label: String(l.label || "Lot"), qty: 0, unit: "", unit_price: 0, vat_rate: 0 }
      : { label: String(l.label || ""), description: l.description || "", qty: Number(l.qty) || 1, unit: l.unit || "u",
          unit_price: Math.max(0, Number(l.unit_price) || 0), vat_rate: Number(l.vat_rate) || 0 });
  }
  return json(out);
});
