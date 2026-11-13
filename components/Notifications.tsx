"use client";
// Notifications : activation sur le téléphone (Web Push), réglages e-mail / téléphone, bandeau d'invitation.
import { useEffect, useState } from "react";
import { sb } from "@/lib/supabase";

const supporte = () => typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

function cleVersOctets(b64: string) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const brut = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...brut].map((c) => c.charCodeAt(0)));
}

/** Active les notifications sur cet appareil et enregistre l'abonnement. Renvoie un message d'erreur ou "". */
export async function activerPush(): Promise<string> {
  if (!supporte()) return "Ce navigateur ne gère pas les notifications. Sur iPhone, ajoutez d'abord Rénolien à l'écran d'accueil.";
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return "Notifications refusées. Pour les autoriser : paramètres du navigateur → Notifications → renolien.fr.";
  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  const { data: cle } = await sb().rpc("cle_push");
  if (!cle) return "Service de notifications indisponible, réessayez plus tard.";
  let abo = await reg.pushManager.getSubscription();
  if (!abo) abo = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: cleVersOctets(cle as string) });
  const j = abo.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
  const { data: { user } } = await sb().auth.getUser();
  if (!user) return "Connectez-vous d'abord.";
  const { error } = await sb().from("push_abonnements").upsert(
    { user_id: user.id, endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth, appareil: navigator.userAgent.slice(0, 120) },
    { onConflict: "endpoint" });
  return error ? error.message : "";
}

/** Garde l'abonnement à jour à chaque ouverture de l'appli (si déjà autorisé) */
export function useRafraichirPush() {
  useEffect(() => {
    if (supporte() && Notification.permission === "granted") activerPush().catch(() => {});
  }, []);
}

/** Bandeau d'invitation dans les espaces client et artisan */
export function BandeauNotif({ role }: { role: "client" | "artisan" }) {
  const [voir, setVoir] = useState(false);
  const [msg, setMsg] = useState("");
  useEffect(() => {
    let masque = false;
    try { masque = localStorage.getItem("renolien-notif-masque") === "1"; } catch {}
    setVoir(supporte() && Notification.permission === "default" && !masque);
  }, []);
  if (!voir) return null;
  return (
    <div className="mb-4 rounded-2xl border border-flame/30 bg-flame-light p-3 text-sm">
      <p className="font-bold">🔔 Ne ratez rien</p>
      <p className="mt-0.5 text-slate-700">{role === "artisan" ? "Soyez prévenu sur votre téléphone dès qu'une demande arrive dans votre secteur." : "Soyez prévenu sur votre téléphone dès que vous recevez une offre ou un message."}</p>
      {msg && <p className="mt-1 text-red-700">{msg}</p>}
      <div className="mt-2 flex gap-2">
        <button className="btn-brand flex-1 !py-2" onClick={async () => { const e = await activerPush(); if (e) setMsg(e); else { setVoir(false); sb().rpc("notif_test"); } }}>Activer</button>
        <button className="btn-ghost !py-2" onClick={() => { try { localStorage.setItem("renolien-notif-masque", "1"); } catch {} setVoir(false); }}>Plus tard</button>
      </div>
    </div>
  );
}

/** Réglages dans « Mon compte » */
export default function NotifReglages() {
  const [p, setP] = useState<{ id: string; notif_email: boolean; notif_push: boolean } | null>(null);
  const [etat, setEtat] = useState<string>("");
  const [msg, setMsg] = useState("");
  useEffect(() => {
    (async () => {
      const { data: { user } } = await sb().auth.getUser();
      if (!user) return;
      const { data } = await sb().from("profils").select("id, notif_email, notif_push").eq("id", user.id).single();
      setP(data as any);
      setEtat(!supporte() ? "non" : Notification.permission);
    })();
  }, []);
  if (!p) return null;
  async function maj(champ: "notif_email" | "notif_push", v: boolean) {
    setP((x) => x && { ...x, [champ]: v });
    await sb().from("profils").update({ [champ]: v }).eq("id", p!.id);
  }
  return (
    <div className="card space-y-2 text-sm">
      <p className="font-bold">🔔 Notifications</p>
      <label className="flex items-center justify-between gap-2">Par e-mail
        <input type="checkbox" className="h-5 w-5" checked={p.notif_email} onChange={(e) => maj("notif_email", e.target.checked)} /></label>
      <label className="flex items-center justify-between gap-2">Sur le téléphone
        <input type="checkbox" className="h-5 w-5" checked={p.notif_push} onChange={(e) => maj("notif_push", e.target.checked)} /></label>
      {p.notif_push && (etat === "granted"
        ? <p className="text-xs text-green-700">✔ Activées sur cet appareil.</p>
        : etat === "non"
          ? <p className="text-xs text-slate-500">Ce navigateur ne gère pas les notifications. Sur iPhone, ajoutez Rénolien à l'écran d'accueil.</p>
          : <button className="btn-ghost w-full !py-2" onClick={async () => { const e = await activerPush(); setMsg(e || "C'est activé : une notification d'essai arrive."); if (!e) { setEtat("granted"); sb().rpc("notif_test"); } }}>Activer sur ce téléphone</button>)}
      {etat === "granted" && p.notif_push && <button className="text-xs text-brand" onClick={async () => { await sb().rpc("notif_test"); setMsg("Notification d'essai envoyée."); }}>Envoyer une notification d'essai</button>}
      {msg && <p className="text-xs text-slate-600">{msg}</p>}
    </div>
  );
}
