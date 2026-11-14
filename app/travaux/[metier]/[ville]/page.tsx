import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { METIERS_SEO, VILLES_SEO, metierSeo, villeSeo, metaSeo } from "@/lib/seo";
import { PageSeo } from "@/components/PageSeo";

export const dynamicParams = false;
export function generateStaticParams() {
  return METIERS_SEO.flatMap((m) => VILLES_SEO.map((v) => ({ metier: m.slug, ville: v.slug })));
}

export function generateMetadata({ params }: { params: { metier: string; ville: string } }): Metadata {
  const m = metierSeo(params.metier), v = villeSeo(params.ville);
  if (!m || !v) return {};
  const { title, description } = metaSeo(m, v);
  return {
    title: { absolute: title },
    description,
    openGraph: { title, description },
    alternates: { canonical: `/travaux/${m.slug}/${v.slug}` },
  };
}

export default function Page({ params }: { params: { metier: string; ville: string } }) {
  const m = metierSeo(params.metier), v = villeSeo(params.ville);
  if (!m || !v) notFound();
  return <PageSeo m={m} v={v} />;
}
