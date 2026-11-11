import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { METIERS_SEO, metierSeo } from "@/lib/seo";
import { PageSeo } from "@/components/PageSeo";

export const dynamicParams = false;
export function generateStaticParams() {
  return METIERS_SEO.map((m) => ({ metier: m.slug }));
}

export function generateMetadata({ params }: { params: { metier: string } }): Metadata {
  const m = metierSeo(params.metier);
  if (!m) return {};
  const P = m.pro[0].toUpperCase() + m.pro.slice(1);
  return {
    title: `${P} en Île-de-France : comparez jusqu'à 5 devis gratuits`,
    description: `${m.intro.split(":")[0]}. Décrivez votre projet, recevez jusqu'à 5 devis de ${m.pros} vérifiés. Gratuit et sans engagement.`.slice(0, 160),
    alternates: { canonical: `/travaux/${m.slug}` },
  };
}

export default function Page({ params }: { params: { metier: string } }) {
  const m = metierSeo(params.metier);
  if (!m) notFound();
  return <PageSeo m={m} />;
}
