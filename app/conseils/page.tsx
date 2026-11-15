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
        <div className="mt-6 space-y-3">
          {liste.map((a) => (
            <Link key={a.slug} href={`/conseils/${a.slug}`} className="card block space-y-1">
              <p className="text-lg font-bold">{a.emoji} {a.h1}</p>
              <p className="text-sm text-slate-600">{a.chapo}</p>
              <p className="text-xs text-slate-400">{a.lecture} min de lecture</p>
            </Link>
          ))}
        </div>
        <Pied />
      </div>
    </main>
  );
}
