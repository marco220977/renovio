"use client";
// Installation de Rénolien sur l'écran d'accueil (application web, sans store).
// Android/Chrome : la fenêtre d'installation native s'ouvre en un clic. iPhone : explication Partager → Sur l'écran d'accueil.
import { useEffect, useState } from "react";
import Modal from "@/components/Modal";

type BIP = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
declare global { interface Window { __renolienInstall?: BIP | null } }

/** À placer une fois dans la mise en page : garde l'événement d'installation de Chrome pour nos boutons */
export function CaptureInstallation() {
  useEffect(() => {
    const garder = (e: Event) => { e.preventDefault(); window.__renolienInstall = e as BIP; window.dispatchEvent(new Event("renolien-install")); };
    const installe = () => { window.__renolienInstall = null; window.dispatchEvent(new Event("renolien-install")); };
    window.addEventListener("beforeinstallprompt", garder);
    window.addEventListener("appinstalled", installe);
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
    return () => { window.removeEventListener("beforeinstallprompt", garder); window.removeEventListener("appinstalled", installe); };
  }, []);
  return null;
}

const enApp = () => typeof window !== "undefined" &&
  (window.matchMedia?.("(display-mode: standalone)").matches || (navigator as any).standalone === true);
const surIphone = () => typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);
const CLE = "renolien_install_plus_tard";

export default function InstallerApp({ variante = "carte", pour = "" }: { variante?: "carte" | "bandeau"; pour?: "artisan" | "client" | "" }) {
  const [pret, setPret] = useState(false);
  const [installee, setInstallee] = useState(true);
  const [natif, setNatif] = useState(false);
  const [aide, setAide] = useState(false);
  const [cache, setCache] = useState(false);

  useEffect(() => {
    const maj = () => { setInstallee(enApp()); setNatif(!!window.__renolienInstall); };
    maj(); setPret(true);
    try { const t = Number(localStorage.getItem(CLE) || 0); setCache(Date.now() - t < 14 * 86400000); } catch { /* rien */ }
    window.addEventListener("renolien-install", maj);
    return () => window.removeEventListener("renolien-install", maj);
  }, []);

  if (!pret || installee || (variante === "bandeau" && cache)) return null;

  async function installer() {
    const e = window.__renolienInstall;
    if (!e) return setAide(true);
    await e.prompt();
    const { outcome } = await e.userChoice.catch(() => ({ outcome: "" }));
    window.__renolienInstall = null; setNatif(false);
    if (outcome === "accepted") setInstallee(true);
  }
  const plusTard = () => { try { localStorage.setItem(CLE, String(Date.now())); } catch { /* rien */ } setCache(true); };

  const avantage = pour === "artisan" ? "Recevez les nouvelles demandes de votre secteur en direct, comme un SMS."
    : pour === "client" ? "Suivez vos devis et répondez aux artisans en un geste."
    : "Gratuite, sans store, elle ne prend presque pas de place.";
  const ios = surIphone();

  return (
    <>
      {variante === "bandeau" ? (
        <div className="card flex items-center gap-3 !p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon-192.png" alt="" className="h-10 w-10 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-bold">Installez l'appli Rénolien</p>
            <p className="text-xs text-slate-500">{avantage}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <button className="btn-brand !px-3 !py-1.5 text-sm" onClick={installer}>Installer</button>
            <button className="text-[11px] text-slate-400" onClick={plusTard}>Plus tard</button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-gradient-to-br from-flame to-orange-600 p-5 text-white shadow-sm">
          <div className="flex items-start gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon-192.png" alt="" className="h-12 w-12 shrink-0 rounded-xl bg-white" />
            <div>
              <p className="text-lg font-extrabold">L'application mobile, gratuite</p>
              <p className="text-sm text-white/90">Sur l'écran d'accueil de votre téléphone, sans passer par un store. {avantage}</p>
            </div>
          </div>
          <button className="mt-4 w-full rounded-full bg-white py-3 font-bold text-ink" onClick={installer}>⬇️ Installer l'application{natif ? "" : ios ? " (iPhone)" : ""}</button>
        </div>
      )}
      {aide && (
        <Modal title="Installer Rénolien" onClose={() => setAide(false)}>
          <div className="space-y-3 text-sm">
            {(ios ? [
              ["1", "Touchez le bouton Partager", "Le carré avec une flèche vers le haut, en bas de Safari (ou en haut sur iPad)."],
              ["2", "« Sur l'écran d'accueil »", "Faites défiler la liste si besoin, puis touchez « Ajouter »."],
            ] : [
              ["1", "Ouvrez le menu du navigateur", "Le bouton ⋮ en haut à droite de Chrome (ou ≡ en bas sur Samsung Internet)."],
              ["2", "« Installer l'application »", "Ou « Ajouter à l'écran d'accueil » selon le navigateur, puis confirmez."],
            ]).map(([n, t, d]) => (
              <div key={n} className="flex gap-3 rounded-xl bg-slate-50 p-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-flame font-bold text-white">{n}</span>
                <div><p className="font-bold">{t}</p><p className="text-slate-600">{d}</p></div>
              </div>
            ))}
            {ios && <p className="text-xs text-slate-500">Sur iPhone, l'installation n'est possible que depuis Safari.</p>}
            <button className="btn-primary w-full" onClick={() => setAide(false)}>J'ai compris</button>
          </div>
        </Modal>
      )}
    </>
  );
}
