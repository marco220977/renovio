// Vitrine publique d'un artisan : présentation, contrôles, réalisations, avis, et demande de devis directe.
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { cache } from "react";
import Link from "next/link";
import { sbServer } from "@/lib/supabase-server";
import { DEPARTEMENTS } from "@/lib/seo";
import { TRADE, tradesOf } from "@/lib/trades";
import { photoUrl, type Realisation } from "@/lib/realisations";
import BadgesConfiance from "@/components/BadgesConfiance";
import Galerie from "@/components/Galerie";
import BoutonDevisArtisan from "@/components/BoutonDevisArtisan";
import LogoMark from "@/components/LogoMark";
import SignalerContenu from "@/components/SignalerContenu";
import type { Artisan } from "@/lib/mer";

export const dynamic = "force-dynamic";

type Vitrine = {
  id: string; slug: string; raison_sociale: string; forme?: string; ville?: string; cp?: string; metiers: string[]; departements: string[];
  presentation?: string; membre_depuis: string; verifie: boolean; siret: boolean; rge: boolean; fondateur: boolean;
  decennale_analyse?: any; decennale_fin?: string | null; rcpro_analyse?: any; rcpro_fin?: string | null;
  apercu: boolean; test: boolean; note: number | null; nb_avis: number; chantiers: number;
  avis: { note: number; commentaire?: string; created_at: string; ville?: string; titre?: string }[];
  realisations: Realisation[];
};

const charger = cache(async (slug: string): Promise<Vitrine | null> => {
  const { data } = await sbServer().rpc("vitrine", { p_slug: slug });
  return (data as Vitrine) || null;
});

const nomPropre = (s: string) => (s || "Artisan").replace(/\s*\(.*\)\s*/g, " ").trim();
const villeTitre = (s?: string) => (s || "").toLowerCase().replace(/(^|[\s'-])\S/g, (m) => m.toUpperCase());
const metierPrincipal = (v: Vitrine) => TRADE[v.metiers?.[0]]?.label.split(",")[0].toLowerCase() || "rénovation";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const v = await charger(params.slug);
  if (!v) return { title: "Artisan introuvable", robots: { index: false } };
  const nom = nomPropre(v.raison_sociale), ville = villeTitre(v.ville);
  const title = `${nom} – ${metierPrincipal(v).charAt(0).toUpperCase() + metierPrincipal(v).slice(1)}${ville ? ` à ${ville}` : ""} | Rénolien`;
  const description = `${nom}${ville ? `, ${ville}` : ""} : ${tradesOf(v.metiers).map((t) => t.label.toLowerCase()).join(", ")}. Entreprise contrôlée par Rénolien (SIRET, décennale${v.rge ? ", RGE" : ""}).${v.nb_avis ? ` ${v.note}/5 sur ${v.nb_avis} avis.` : ""} Demandez votre devis gratuit.`;
  const image = v.realisations?.[0] ? photoUrl(v.realisations[0].chemin) : undefined;
  return {
    title: { absolute: title }, description,
    alternates: { canonical: `/pro/${v.slug}` },
    openGraph: { title, description, ...(image ? { images: [image] } : {}) },
    robots: v.apercu || v.test ? { index: false, follow: false } : undefined,
  };
}

export default async function Page({ params }: { params: { slug: string } }) {
  const v = await charger(params.slug);
  if (!v) notFound();
  const nom = nomPropre(v.raison_sociale), ville = villeTitre(v.ville);
  // BadgesConfiance attend une fiche artisan : le SIRET n'est jamais envoyé ici, seulement le fait qu'il soit valide
  const pourBadges = { ...v, created_at: v.membre_depuis, statut: "actif", siret: v.siret ? "00000000000000" : "" } as unknown as Artisan;
  const depuis = new Date(v.membre_depuis).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const jsonLd = {
    "@context": "https://schema.org", "@type": "HomeAndConstructionBusiness", name: nom,
    address: { "@type": "PostalAddress", addressLocality: ville, postalCode: v.cp, addressCountry: "FR" },
    areaServed: v.departements.map((d) => DEPARTEMENTS[d] || `Département ${d}`),
    ...(v.realisations[0] ? { image: photoUrl(v.realisations[0].chemin) } : {}),
    ...(v.nb_avis ? { aggregateRating: { "@type": "AggregateRating", ratingValue: v.note, reviewCount: v.nb_avis } } : {}),
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-orange-50">
      {!v.apercu && !v.test && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />}
      <div className="mx-auto max-w-2xl space-y-4 px-4 pb-28">
        <nav className="flex items-center justify-between py-4">
          <Link href="/" className="text-xl font-extrabold text-ink"><LogoMark />Réno<span className="text-flame">lien</span></Link>
          <Link href="/particuliers" className="text-sm font-semibold text-brand">Comment ça marche ?</Link>
        </nav>

        {v.apercu && (
          <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            👁️ <b>Aperçu de votre vitrine.</b> Elle sera visible par les clients et sur Google dès que votre compte sera vérifié par Rénolien.
          </p>
        )}

        <section className="card space-y-2">
          <div className="flex items-start gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-flame text-xl font-extrabold text-white">
              {nom.split(/\s+/).filter((w) => !/^(sarl|sas|sasu|eurl|ei|sa)$/i.test(w)).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "R"}
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-extrabold leading-tight">{nom}</h1>
              <p className="text-sm text-slate-600">{tradesOf(v.metiers).map((t) => `${t.emoji} ${t.label}`).join(" · ")}</p>
              <p className="text-sm text-slate-500">📍 {[ville, v.cp].filter(Boolean).join(" ")}</p>
            </div>
          </div>
          <BadgesConfiance a={pourBadges} dates />
          <div className="grid grid-cols-3 gap-2 pt-1 text-center">
            <div className="rounded-xl bg-slate-50 p-2"><p className="text-lg font-extrabold">{v.nb_avis ? `${v.note}★` : "—"}</p><p className="text-[11px] text-slate-500">{v.nb_avis} avis</p></div>
            <div className="rounded-xl bg-slate-50 p-2"><p className="text-lg font-extrabold">{v.chantiers}</p><p className="text-[11px] text-slate-500">chantier{v.chantiers > 1 ? "s" : ""} via Rénolien</p></div>
            <div className="rounded-xl bg-slate-50 p-2"><p className="text-sm font-extrabold leading-7">{depuis}</p><p className="text-[11px] text-slate-500">membre depuis</p></div>
          </div>
        </section>

        <BoutonDevisArtisan id={v.id} nom={nom} slug={v.slug} />

        {v.presentation && (
          <section className="card space-y-1">
            <h2 className="font-bold">Présentation</h2>
            <p className="whitespace-pre-line text-sm text-slate-700">{v.presentation}</p>
          </section>
        )}

        {v.realisations.length > 0 && (
          <section className="space-y-2">
            <h2 className="font-bold">📷 Réalisations</h2>
            <Galerie photos={v.realisations} />
          </section>
        )}

        <section className="card space-y-2">
          <h2 className="font-bold">Zone d'intervention</h2>
          <div className="flex flex-wrap gap-1.5">
            {v.departements.map((d) => <span key={d} className="chip bg-slate-100 text-slate-700">{DEPARTEMENTS[d] ? `${DEPARTEMENTS[d]} (${d})` : `Département ${d}`}</span>)}
          </div>
        </section>

        <section className="card space-y-2">
          <h2 className="font-bold">Avis clients {v.nb_avis > 0 && <span className="font-normal text-slate-500">· {v.note}/5</span>}</h2>
          {v.avis.length ? v.avis.map((x, i) => (
            <div key={i} className="border-t border-slate-100 pt-2 text-sm first:border-0 first:pt-0">
              <p><span className="text-amber-500">{"★".repeat(x.note)}{"☆".repeat(5 - x.note)}</span> <span className="text-xs text-slate-500">{[x.titre, x.ville, new Date(x.created_at).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })].filter(Boolean).join(" · ")}</span></p>
              {x.commentaire && <p className="text-slate-700">{x.commentaire}</p>}
            </div>
          )) : <p className="text-sm text-slate-500">Pas encore d'avis. Sur Rénolien, seuls les clients ayant signé un devis avec l'artisan peuvent laisser un avis.</p>}
        </section>

        <section className="card space-y-2 text-sm">
          <h2 className="font-bold">Comment ça marche ?</h2>
          <ol className="list-decimal space-y-1 pl-5 text-slate-700">
            <li>Vous décrivez vos travaux en quelques minutes : l'IA prépare un cahier des charges chiffré.</li>
            <li>{nom} est prévenu en priorité ; d'autres artisans contrôlés de votre secteur peuvent aussi vous répondre (5 maximum).</li>
            <li>Vous comparez les devis poste par poste et choisissez. Gratuit, sans engagement : vous payez l'artisan directement.</li>
          </ol>
        </section>

        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 p-3 backdrop-blur">
          <div className="mx-auto max-w-2xl"><BoutonDevisArtisan id={v.id} nom={nom} slug={v.slug} className="!py-3" /></div>
        </div>
        <p className="text-center text-xs text-slate-400">Informations publiées par l'entreprise et contrôlées par Rénolien. <Link href="/legal/cgu" className="underline">CGU</Link></p>
        <p className="text-center"><SignalerContenu quoi="cet artisan ou un avis" nom={nom} lien={`https://www.renolien.fr/pro/${v.slug}`} /></p>
      </div>
    </main>
  );
}
