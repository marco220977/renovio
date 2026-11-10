// Fonction Supabase « travaux-ia » : l'IA de la mise en relation.
//  - action "questions" : comprend la demande du client et pose 3 à 6 questions
//  - action "cahier"    : rédige le cahier des charges + fourchette de budget
//  - action "devis"     : pré-remplit le devis de l'artisan à partir de ses tarifs
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) return json({ error: "Clé ANTHROPIC_API_KEY manquante (Supabase > Edge Functions > Secrets)" }, 500);
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "");
  const text = prompt(action, body);
  if (!text) return json({ error: "Action inconnue" }, 400);
  if (action !== "devis" && !String(body.description || "").trim()) return json({ error: "Décrivez vos travaux" }, 400);

  const content: any[] = [];
  for (const p of (body.photos || []).slice(0, 3)) {
    const m = /^data:(image\/\w+);base64,(.+)$/.exec(p || "");
    if (m) content.push({ type: "image", source: { type: "base64", media_type: m[1], data: m[2] } });
  }
  content.push({ type: "text", text });

  // Réponse forcée dans un « formulaire » (outil) : le JSON est toujours valide
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: Deno.env.get("ANTHROPIC_MODEL") || "claude-sonnet-5-5",
      max_tokens: action === "questions" ? 3000 : 16000,
      tools: [{ name: "repondre", description: "Donne la réponse au format demandé.", input_schema: SCHEMAS[action] }],
      tool_choice: { type: "tool", name: "repondre" },
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
    try { out = JSON.parse(txt.slice(txt.indexOf("{"), txt.lastIndexOf("}") + 1)); } catch { /* rien */ }
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
