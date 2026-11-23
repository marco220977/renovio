import type { Bloc } from "@/lib/articles";

export const ancre = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function Rendu({ b }: { b: Bloc }) {
  if (b.t === "h2") return <h2 id={ancre(b.x)} className="mt-10 scroll-mt-4 border-l-4 border-flame pl-3 text-2xl font-extrabold leading-tight">{b.x}</h2>;
  if (b.t === "p") return <p className="mt-4 text-[17px] leading-relaxed text-slate-700">{b.x}</p>;
  if (b.t === "ul") return (
    <ul className="mt-4 space-y-2">
      {b.x.map((l, i) => <li key={i} className="flex gap-3 text-[17px] leading-relaxed text-slate-700"><span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-flame-light text-xs font-bold text-flame">✓</span><span>{l}</span></li>)}
    </ul>
  );
  if (b.t === "astuce") return (
    <div className="mt-6 flex gap-3 rounded-2xl bg-ink p-5 text-white">
      <span className="text-2xl">💡</span>
      <p className="text-[15px] leading-relaxed"><b className="text-flame">Le conseil du pro · </b>{b.x}</p>
    </div>
  );
  return (
    <div className="mt-5 space-y-2">
      {b.lignes.map((l, i) => (
        <div key={i} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="min-w-0">
            <p className="font-bold">{l[0]}</p>
            {l.length > 2 && <p className="mt-0.5 text-sm text-slate-500">{l.slice(1, -1).join(" · ")}</p>}
          </div>
          <p className="shrink-0 rounded-xl bg-flame-light px-3 py-2 text-right text-sm font-extrabold text-flame">{l[l.length - 1]}</p>
        </div>
      ))}
    </div>
  );
}

