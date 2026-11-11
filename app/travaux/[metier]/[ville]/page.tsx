import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { METIERS_SEO, VILLES_SEO, metierSeo, villeSeo, aVille } from "@/lib/seo";
import { PageSeo } from "@/components/PageSeo";

export const dynamicParams = false;
export function generateStaticParams() {
  return METIERS_SEO.flatMap((m) => VILLES_SEO.map((v) => ({ metier: m.slug, ville: v.slug })));
}

export function generateMetadata({ params }: { params: { metier: string; ville: string } }): Metadata {
  const m = metierSeo(params.metier), v = villeSeo(params.ville);
  if (!m || !v) return {};
  const P = m.pro[0].toUpperCase() + m.pro.slice(1);
  return {
    title: `${P} ${aVille(v.nom)} (${v.dep}) : devis gratuits`,
    description: `Besoin d'un ${m.pro} ${aVille(v.nom)} ? Décrivez ${m.sujet} en 2 minutes et recevez jusqu'à 5 devis d'artisans vérifiés du secteur. Gratuit, sans engagement.`.slice(0, 160),
    alternates: { canonical: `/travaux/${m.slug}/${v.slug}` },
  };
}

export default function Page({ params }: { params: { metier: string; ville: string } }) {
  const m = metierSeo(params.metier), v = villeSeo(params.ville);
  if (!m || !v) notFound();
  return <PageSeo m={m} v={v} />;
}
