import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { METIERS_SEO, metierSeo, metaSeo } from "@/lib/seo";
import { PageSeo } from "@/components/PageSeo";

export const dynamicParams = false;
export function generateStaticParams() {
  return METIERS_SEO.map((m) => ({ metier: m.slug }));
}

export function generateMetadata({ params }: { params: { metier: string } }): Metadata {
  const m = metierSeo(params.metier);
  if (!m) return {};
  const { title, description } = metaSeo(m);
  return {
    title: { absolute: title },
    description,
    openGraph: { title, description },
    alternates: { canonical: `/travaux/${m.slug}` },
  };
}

export default function Page({ params }: { params: { metier: string } }) {
  const m = metierSeo(params.metier);
  if (!m) notFound();
  return <PageSeo m={m} />;
}
