"use client";
// Cadre commun des espaces client et artisan : vérifie la connexion et le rôle, affiche l'en-tête et la navigation.
import { createContext, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { sb } from "@/lib/supabase";
import type { Profil, Role } from "@/lib/mer";

const Ctx = createContext<{ profil: Profil; recharger: () => Promise<void> } | null>(null);
export const useProfil = () => useContext(Ctx)!;

const NAV: Record<"client" | "artisan", [string, string, string][]> = {
  client: [["/client", "🏠", "Mes demandes"], ["/client/nouvelle", "➕", "Nouvelle"], ["/client/compte", "👤", "Compte"]],
  artisan: [["/artisan", "📥", "Demandes"], ["/artisan/offres", "📄", "Mes offres"], ["/artisan/tarifs", "💶", "Tarifs"], ["/artisan/profil", "🏢", "Profil"]],
};

export default function Espace({ role, children }: { role: "client" | "artisan"; children: React.ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const [profil, setProfil] = useState<Profil | null>(null);
  const [nonLus, setNonLus] = useState(0);

  async function charger() {
    const s = sb();
    const { data: { user } } = await s.auth.getUser();
    if (!user) return router.replace(`/connexion?role=${role}`);
    const { data } = await s.from("profils").select("*").eq("id", user.id).maybeSingle();
    if (!data) return router.replace(`/bienvenue?role=${role}`);
    const r = data.role as Role;
    if (r !== role && r !== "admin") return router.replace(r === "artisan" ? "/artisan" : "/client");
    setProfil(data as Profil);
    const q = s.from("messages").select("id", { count: "exact", head: true }).eq("lu", false).eq("auteur", role === "artisan" ? "client" : "artisan");
    const { count } = role === "artisan" ? await q.eq("artisan_id", user.id) : await q;
    setNonLus(count || 0);
  }
  useEffect(() => { charger(); }, [path]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!profil) return <div className="flex min-h-screen items-center justify-center text-slate-400">Chargement…</div>;

  const nav = NAV[role];
  const actif = (href: string) => href === `/${role}` ? path === href : path.startsWith(href);
  return (
    <Ctx.Provider value={{ profil, recharger: charger }}>
      <div className="min-h-screen pb-24">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
            <Link href={`/${role}`} className="text-xl font-extrabold">Réno<span className="text-flame">vio</span></Link>
            <div className="flex gap-1.5">
              {profil.role === "admin" && <Link href="/admin" className="chip bg-ink text-white">Admin</Link>}
              <span className="chip bg-slate-100 text-slate-600">{role === "artisan" ? "Espace artisan" : "Espace client"}</span>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-2xl px-4 py-5">{children}</main>
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white">
          <div className="mx-auto flex max-w-2xl">
            {nav.map(([href, ico, label]) => (
              <Link key={href} href={href} className={`flex flex-1 flex-col items-center py-2 text-[11px] font-semibold ${actif(href) ? "text-flame" : "text-slate-500"}`}>
                <span className="relative text-xl leading-none">{ico}
                  {nonLus > 0 && (href === "/client" || href === "/artisan/offres") && <span className="absolute -right-2 -top-1 rounded-full bg-red-600 px-1.5 text-[10px] font-bold text-white">{nonLus}</span>}
                </span>{label}
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </Ctx.Provider>
  );
}

export function Deconnexion() {
  const router = useRouter();
  return (
    <button className="btn-ghost w-full" onClick={async () => { await sb().auth.signOut(); router.replace("/"); }}>
      Se déconnecter
    </button>
  );
}

export function Erreur({ msg }: { msg: string }) {
  return msg ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{msg}</p> : null;
}

export function Info({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl bg-blue-50 p-3 text-sm text-blue-900">{children}</p>;
}
