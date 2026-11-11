import { NextResponse } from "next/server";

// Vérifie un SIRET dans le répertoire officiel (API Recherche d'entreprises, gratuite, données INSEE/RNE)
const FORMES: Record<string, string> = {
  "1000": "EI", "5498": "EURL", "5499": "SARL", "5410": "SARL", "5422": "SARL", "5426": "SARL", "5430": "SARL",
  "5710": "SAS", "5720": "SASU", "5505": "SA", "5510": "SA", "5599": "SA", "5306": "SCOP", "5385": "SCOP", "6540": "SCI",
  "5202": "SNC", "5203": "SNC", "5800": "Société européenne",
};

function cle(s: string) {
  if (s.startsWith("356000000")) return s.split("").reduce((t, c) => t + +c, 0) % 5 === 0;
  let t = 0;
  for (let i = 0; i < 14; i++) { let d = +s[i]; if (i % 2 === 0) { d *= 2; if (d > 9) d -= 9; } t += d; }
  return t % 10 === 0;
}

export async function GET(req: Request) {
  const siret = (new URL(req.url).searchParams.get("siret") || "").replace(/\D/g, "");
  if (siret.length !== 14) return NextResponse.json({ erreur: "Le SIRET doit faire 14 chiffres." }, { status: 400 });
  if (!cle(siret)) return NextResponse.json({ erreur: "Ce numéro de SIRET n'est pas valide : vérifiez les chiffres." }, { status: 400 });

  let data: any;
  try {
    const r = await fetch(`https://recherche-entreprises.api.gouv.fr/search?q=${siret}&per_page=1&limite_matching_etablissements=1`, {
      headers: { accept: "application/json" }, next: { revalidate: 86400 },
    });
    if (!r.ok) throw new Error(String(r.status));
    data = await r.json();
  } catch {
    return NextResponse.json({ erreur: "Le répertoire des entreprises ne répond pas. Réessayez dans quelques minutes." }, { status: 503 });
  }

  const u = data?.results?.[0];
  const e = [...(u?.matching_etablissements || []), u?.siege].find((x: any) => x?.siret === siret);
  if (!u || !e) return NextResponse.json({ erreur: "SIRET introuvable dans le répertoire des entreprises (INSEE). Vérifiez le numéro." }, { status: 404 });

  const rue = [e.numero_voie, e.indice_repetition, e.type_voie, e.libelle_voie].filter(Boolean).join(" ");
  const adresse = [e.complement_adresse, rue].filter(Boolean).join(", ");
  const titre = (s?: string) => (s || "").toLowerCase().replace(/(^|[\s'-])\S/g, (m) => m.toUpperCase());
  return NextResponse.json({
    siret,
    nom: u.nom_raison_sociale || u.nom_complet || "",
    nom_complet: u.nom_complet || "",
    forme: FORMES[String(u.nature_juridique)] || (u.complements?.est_entrepreneur_individuel ? "EI" : ""),
    adresse: titre(adresse),
    cp: e.code_postal || "",
    ville: titre(e.libelle_commune),
    actif: e.etat_administratif === "A" && u.etat_administratif !== "C",
    rge: !!u.complements?.est_rge,
    activite: u.activite_principale || "",
    creation: e.date_creation || u.date_creation || null,
  });
}
