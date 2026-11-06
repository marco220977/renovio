// Fonction Supabase « lire-catalogue » : extrait les articles d'un tarif fournisseur en PDF ou en photo.
// Secret requis : ANTHROPIC_API_KEY.
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const PROMPT = `Ce document est un tarif ou un catalogue de fournisseur du bâtiment (matériel, fournitures).
Extrais TOUS les articles qui ont un prix. Réponds UNIQUEMENT avec un tableau JSON, sans texte autour, une ligne par article :
[["référence","désignation complète (marque, modèle, dimensions)","unité (u, m, ml, m², kg, l, boîte, lot…)",prix_HT_nombre,"famille ou rubrique"]]
Règles : prix en euros HT, nombre avec un point décimal (ex : 12.5). S'il y a plusieurs prix (public et net), prends le prix net / remisé.
Référence vide "" si absente. Ignore les lignes sans prix. Ne commente pas.`;

function frError(msg: string, status: number): string {
  const m = (msg || "").toLowerCase();
  if (m.includes("credit balance")) return "Lecture IA indisponible (crédit épuisé). Prévenez l'administrateur.";
  if (status === 401 || m.includes("api key")) return "Clé IA invalide. Prévenez l'administrateur.";
  if (status === 429 || m.includes("rate limit")) return "Trop de lectures en même temps, réessayez dans une minute.";
  if (status === 529 || m.includes("overloaded")) return "Service surchargé, réessayez dans un instant.";
  if (m.includes("page") || m.includes("too large") || m.includes("too long")) return "Document trop long : envoyez quelques pages à la fois, ou le fichier Excel du fournisseur.";
  return "Lecture impossible pour le moment, réessayez.";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) return json({ error: "Clé ANTHROPIC_API_KEY manquante (Supabase > Edge Functions > Secrets)" }, 500);
  const { file } = await req.json().catch(() => ({}));
  const m = /^data:([\w/+.-]+);base64,(.+)$/.exec(file || "");
  if (!m) return json({ error: "Fichier invalide" }, 400);
  const isPdf = m[1] === "application/pdf";
  const block = isPdf
    ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: m[2] } }
    : { type: "image", source: { type: "base64", media_type: m[1], data: m[2] } };
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: Deno.env.get("ANTHROPIC_MODEL") || "claude-sonnet-5-5",
      max_tokens: 16000,
      messages: [{ role: "user", content: [block, { type: "text", text: PROMPT }] }],
    }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    console.error("Anthropic error", r.status, j?.error?.message);
    return json({ error: frError(j?.error?.message || "", r.status) }, 502);
  }
  const txt: string = j.content?.find((c: any) => c.type === "text")?.text || "[]";
  let rows: any[] = [];
  try { rows = JSON.parse(txt.slice(txt.indexOf("["), txt.lastIndexOf("]") + 1)); } catch {
    // réponse coupée (document long) : on garde les lignes complètes
    const cut = txt.slice(txt.indexOf("["), txt.lastIndexOf("],") + 1) + "]";
    try { rows = JSON.parse(cut); } catch { rows = []; }
  }
  const items = rows.filter((x) => Array.isArray(x) && x[1] && Number(x[3]) > 0)
    .map((x) => ({ ref: String(x[0] || ""), label: String(x[1]), unit: String(x[2] || "u"), price: Number(x[3]), category: String(x[4] || "") }));
  return json({ items, truncated: j.stop_reason === "max_tokens" });
});
