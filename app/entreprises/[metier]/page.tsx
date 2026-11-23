import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { METIERS_SEO, metierSeo } from "@/lib/seo";
import { metaPro } from "@/lib/seo-pro";
import { PageEntreprise } from "@/components/PageEntreprise";

export const dynamicParams = false;
export const generateStaticParams = () => METIERS_SEO.map((m) => ({ metier: m.slug }));

export function generateMetadata({ params }: { params: { metier: string } }): Metadata {
  const m = metierSeo(params.metier);
  if (!m) return {};
  const { title, description } = metaPro(m);
  return {
    title: { absolute: title },
    description,
    openGraph: { title, description },
    alternates: { canonical: `/entreprises/${m.slug}` },
  };
}

export default function Page({ params }: { params: { metier: string } }) {
  const m = metierSeo(params.metier);
  if (!m) notFound();
  return <PageEntreprise m={m} />;
}
