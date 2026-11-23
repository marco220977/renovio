import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { METIERS_SEO, metierSeo } from "@/lib/seo";
import { DEPS_SEO, depSeo, metaPro } from "@/lib/seo-pro";
import { PageEntreprise } from "@/components/PageEntreprise";

export const dynamicParams = false;
export const generateStaticParams = () => METIERS_SEO.flatMap((m) => DEPS_SEO.map((d) => ({ metier: m.slug, dep: d.slug })));

export function generateMetadata({ params }: { params: { metier: string; dep: string } }): Metadata {
  const m = metierSeo(params.metier), d = depSeo(params.dep);
  if (!m || !d) return {};
  const { title, description } = metaPro(m, d);
  return {
    title: { absolute: title },
    description,
    openGraph: { title, description },
    alternates: { canonical: `/entreprises/${m.slug}/${d.slug}` },
  };
}

export default function Page({ params }: { params: { metier: string; dep: string } }) {
  const m = metierSeo(params.metier), d = depSeo(params.dep);
  if (!m || !d) notFound();
  return <PageEntreprise m={m} d={d} />;
}
