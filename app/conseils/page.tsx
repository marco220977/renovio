import Link from "next/link";
import type { Metadata } from "next";
import { ARTICLES } from "@/lib/articles";
import { Entete, Pied } from "@/components/PageSeo";

export const metadata: Metadata = {
  title: { absolute: "Conseils travaux : prix, devis et choix d'un artisan | Rénolien" },
  description: "Prix des travaux en 2026, aides, choix d'un artisan fiable : les guides pratiques de Rénolien pour réussir vos travaux en Île-de-France.",
  alternates: { canonical: "/conseils" },
};

export default function Conseils() {
  const liste = [...ARTICLES].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-orange-50">
      <div className="mx-auto max-w-3xl px-5 pb-28">
        <Entete />
        <h1 className="mt-4 text-3xl font-extrabold">Conseils travaux</h1>
        <p className="mt-2 text-slate-600">Prix, aides, choix de l'artisan : nos guides pour préparer vos travaux sereinement, écrits avec des artisans du métier.</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {liste.map((a) => (
            <Link key={a.slug} href={`/conseils/${a.slug}`} className="block overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="flex h-28 items-center justify-center bg-gradient-to-br from-ink to-slate-800 text-6xl">{a.emoji}</div>
              <div className="space-y-2 p-4">
                <p className="text-lg font-extrabold leading-snug">{a.h1}</p>
                <p className="line-clamp-3 text-sm text-slate-600">{a.chapo}</p>
                <p className="flex items-center justify-between text-xs text-slate-400"><span>{a.lecture} min de lecture</span><span className="font-bold text-flame">Lire →</span></p>
              </div>
            </Link>
          ))}
        </div>
        <Pied />
      </div>
    </main>
  );
}
