import { DEPARTEMENTS, VILLES_SEO } from "@/lib/seo";
export type DepSeo = { slug: string; code: string; nom: string };
export const DEPS_SEO: DepSeo[] = Object.entries(DEPARTEMENTS).map(([code, nom]) => ({
  code, nom, slug: `${nom.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-")}-${code}`,
}));
export const depSeo = (slug: string) => DEPS_SEO.find((d) => d.slug === slug);
export const villesDuDep = (code: string) => VILLES_SEO.filter((v) => v.dep === code);
/** « à Paris », « en Seine-et-Marne », « dans le Val-de-Marne » */
export const dansDep = (d: DepSeo) => d.code === "75" ? "à Paris" : d.nom.startsWith("Val") ? `dans le ${d.nom}` : `en ${d.nom}`;
