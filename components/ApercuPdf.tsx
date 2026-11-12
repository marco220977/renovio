"use client";
// Aperçu d'un PDF dans l'appli (pages affichées en images, lisible sur téléphone), avec Télécharger / Partager.
import { useEffect, useState } from "react";

type Ouvrir = { blob: Blob; nom: string; titre?: string };
const EVT = "renolien-apercu-pdf";

/** Ouvre l'aperçu (le composant <ApercuPdf /> est monté une fois dans la mise en page) */
export function ouvrirApercu(o: Ouvrir) {
  window.dispatchEvent(new CustomEvent<Ouvrir>(EVT, { detail: o }));
}

export default function ApercuPdf() {
  const [doc, setDoc] = useState<Ouvrir | null>(null);
  const [pages, setPages] = useState<string[]>([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    const f = (e: Event) => { setPages([]); setErr(""); setDoc((e as CustomEvent<Ouvrir>).detail); };
    window.addEventListener(EVT, f);
    return () => window.removeEventListener(EVT, f);
  }, []);

  useEffect(() => {
    if (!doc) return;
    let annule = false;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";
        const pdf = await pdfjs.getDocument({ data: new Uint8Array(await doc.blob.arrayBuffer()) }).promise;
        const out: string[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const vp = page.getViewport({ scale: 2 });
          const c = document.createElement("canvas");
          c.width = vp.width; c.height = vp.height;
          await page.render({ canvasContext: c.getContext("2d")!, viewport: vp }).promise;
          out.push(c.toDataURL("image/jpeg", 0.9));
          if (annule) return;
          setPages([...out]);
        }
      } catch (e) {
        console.error(e);
        if (!annule) setErr("Aperçu impossible sur cet appareil. Utilisez « Télécharger ».");
      }
    })();
    return () => { annule = true; };
  }, [doc]);

  if (!doc) return null;
  const fichier = () => new File([doc.blob], doc.nom, { type: "application/pdf" });
  const telecharger = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(doc.blob); a.download = doc.nom; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
  };
  const nav = typeof navigator !== "undefined" ? (navigator as any) : null;
  const partageable = !!nav?.canShare && nav.canShare({ files: [fichier()] });

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-slate-900/95">
      <div className="flex items-center justify-between gap-2 px-4 py-3 text-white">
        <p className="truncate font-bold">📄 {doc.titre || doc.nom}</p>
        <button className="rounded-full bg-white/15 px-3 py-1 text-sm" onClick={() => setDoc(null)}>Fermer ✕</button>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 pb-3">
        {err && <p className="rounded-xl bg-white p-4 text-center text-sm">{err}</p>}
        {!err && !pages.length && <p className="pt-10 text-center text-sm text-white/80">Préparation de l'aperçu…</p>}
        {pages.map((src, i) => <img key={i} src={src} alt={`Page ${i + 1}`} className="mx-auto w-full max-w-2xl rounded-lg bg-white shadow-lg" />)}
      </div>
      <div className="flex gap-2 border-t border-white/10 px-4 py-3">
        <button className="btn-brand flex-1" onClick={telecharger}>⬇️ Télécharger</button>
        {partageable && <button className="btn-ghost flex-1 !bg-white" onClick={() => nav.share({ files: [fichier()], title: doc.titre || doc.nom }).catch(() => {})}>📤 Partager</button>}
      </div>
    </div>
  );
}
