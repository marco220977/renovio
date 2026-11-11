import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { METIERS_SEO, metierSeo } from "@/lib/seo";
import { PageEntreprise } from "@/components/PageEntreprise";

export const dynamicParams = false;
export const generateStaticParams = () => METIERS_SEO.map((m) => ({ metier: m.slug }));

export function generateMetadata({ params }: { params: { metier: string } }): Metadata {
  const m = metierSeo(params.metier);
  if (!m) return {};
  const P = m.pro[0].toUpperCase() + m.pro.slice(1);
  return {
    title: `${P} : trouvez des chantiers en Île-de-France sans commission`,
    description: `${P}, recevez des demandes de particuliers près de chez vous et répondez en 1 clic avec vos tarifs. 2 mois de contacts illimités offerts aux 50 premiers inscrits.`.slice(0, 160),
    alternates: { canonical: `/entreprises/${m.slug}` },
  };
}

export default function Page({ params }: { params: { metier: string } }) {
  const m = metierSeo(params.metier);
  if (!m) notFound();
  return <PageEntreprise m={m} />;
}
