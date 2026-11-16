// Fonction « lien-connexion » : « mot de passe oublié » en français, envoyé par Brevo.
// Génère un lien de réinitialisation et l'envoie à l'adresse si un compte existe (réponse identique sinon).
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const SITE = "https://www.renolien.fr";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const b = await req.json().catch(() => ({}));
  const email = String(b.email || "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "Adresse e-mail invalide." }, 400);

  // Anti-abus : 3 envois maximum par adresse et par heure
  const { count } = await db.from("liens_envoyes").select("id", { count: "exact", head: true }).eq("email", email).gte("cree_le", new Date(Date.now() - 3600_000).toISOString());
  if ((count || 0) >= 3) return json({ error: "Trop de demandes pour cette adresse. Réessayez dans une heure." }, 429);
  await db.from("liens_envoyes").insert({ email });

  const { data, error } = await db.auth.admin.generateLink({ type: "recovery", email });
  const th = data?.properties?.hashed_token;
  if (error || !th) return json({ ok: true }); // pas de compte : on ne le dit pas

  const lien = `${SITE}/mot-de-passe?th=${th}`;
  const html = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#0f172a;font-size:15px;line-height:1.5">
    <p style="font-size:22px;font-weight:800;margin:0 0 16px">Réno<span style="color:#ea580c">lien</span></p>
    <p>Bonjour,</p><p>Pour choisir votre mot de passe Rénolien, appuyez sur le bouton ci-dessous :</p>
    <p><a href="${lien}" style="display:inline-block;background:#ea580c;color:#fff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:12px">Choisir mon mot de passe</a></p>
    <p style="font-size:13px;color:#64748b">Ce lien ne fonctionne qu'une fois. Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet e-mail.</p></div>`;
  await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST", headers: { "api-key": Deno.env.get("BREVO_API_KEY")!, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ sender: { email: "contact@renolien.fr", name: "Rénolien" }, replyTo: { email: "renolien.contact@gmail.com" }, to: [{ email }],
      subject: "Choisissez votre mot de passe Rénolien", htmlContent: html,
      textContent: `Bonjour,\n\nPour choisir votre mot de passe Rénolien, ouvrez ce lien :\n${lien}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.`, tags: ["mot-de-passe"] }),
  });
  return json({ ok: true });
});
