"use client";
import { useEffect, useRef, useState } from "react";

// Saisie assistée : base officielle des communes (geo.api.gouv.fr) et des adresses (Base Adresse Nationale, IGN).
type Commune = { nom: string; codesPostaux: string[]; codeDepartement: string };
type Sugg = { label: string; adresse: string; cp: string; ville: string };

function useDebounce<T>(v: T, ms = 300) {
  const [d, setD] = useState(v);
  useEffect(() => { const t = setTimeout(() => setD(v), ms); return () => clearTimeout(t); }, [v, ms]);
  return d;
}

async function getJson(url: string) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 6000);
  try { const r = await fetch(url, { signal: ctrl.signal }); return r.ok ? await r.json() : null; }
  catch { return null; } finally { clearTimeout(t); }
}

function Liste({ items, onPick }: { items: { cle: string; texte: string }[]; onPick: (i: number) => void }) {
  if (!items.length) return null;
  return (
    <div className="absolute left-0 right-0 z-20 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
      {items.map((x, i) => (
        <button key={x.cle} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => onPick(i)}
          className="block w-full border-b border-slate-100 px-3 py-2.5 text-left text-sm last:border-0 hover:bg-flame-light">{x.texte}</button>
      ))}
    </div>
  );
}

/** Code postal + ville : la ville se remplit depuis le code postal (choix si plusieurs communes), et inversement. */
export function CpVille({ cp, ville, onChange }: { cp: string; ville: string; onChange: (cp: string, ville: string) => void }) {
  const [choixCp, setChoixCp] = useState<Commune[]>([]);
  const [choixVille, setChoixVille] = useState<{ nom: string; cp: string }[]>([]);
  const [focusVille, setFocusVille] = useState(false);
  const dernierCp = useRef(cp);
  const villeDeb = useDebounce(ville);

  useEffect(() => {
    if (cp.length !== 5 || cp === dernierCp.current) { if (cp.length !== 5) setChoixCp([]); return; }
    dernierCp.current = cp;
    getJson(`https://geo.api.gouv.fr/communes?codePostal=${cp}&fields=nom,codesPostaux,codeDepartement`).then((l: Commune[] | null) => {
      if (!l?.length) return setChoixCp([]);
      if (l.length === 1) { setChoixCp([]); onChange(cp, l[0].nom); }
      else { setChoixCp(l); if (!l.some((c) => c.nom === ville)) onChange(cp, ""); }
    });
  }, [cp]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!focusVille || villeDeb.trim().length < 2) return setChoixVille([]);
    getJson(`https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(villeDeb)}&fields=nom,codesPostaux&boost=population&limit=6`).then((l: Commune[] | null) => {
      setChoixVille((l || []).flatMap((c) => c.codesPostaux.slice(0, 3).map((p) => ({ nom: c.nom, cp: p }))).slice(0, 6));
    });
  }, [villeDeb, focusVille]);

  return (
    <div className="grid grid-cols-2 gap-2">
      <div><label className="label">Code postal</label>
        <input className="input" inputMode="numeric" maxLength={5} value={cp} onChange={(e) => onChange(e.target.value.replace(/\D/g, ""), ville)} /></div>
      <div className="relative"><label className="label">Ville</label>
        {choixCp.length > 1 ? (
          <select className="input" value={ville} onChange={(e) => onChange(cp, e.target.value)}>
            <option value="">Choisir…</option>
            {choixCp.map((c) => <option key={c.nom} value={c.nom}>{c.nom}</option>)}
          </select>
        ) : (
          <input className="input" value={ville} onFocus={() => setFocusVille(true)} onBlur={() => setTimeout(() => setFocusVille(false), 150)}
            onChange={(e) => onChange(cp, e.target.value)} />
        )}
        {focusVille && choixCp.length <= 1 && (
          <Liste items={choixVille.filter((x) => !(x.nom === ville && x.cp === cp)).map((x) => ({ cle: x.nom + x.cp, texte: `${x.nom} (${x.cp})` }))}
            onPick={(i) => { const x = choixVille.filter((y) => !(y.nom === ville && y.cp === cp))[i]; dernierCp.current = x.cp; onChange(x.cp, x.nom); setChoixVille([]); setFocusVille(false); }} />
        )}
      </div>
    </div>
  );
}

/** Adresse avec suggestions ; au choix, renvoie aussi le code postal et la ville. */
export function AdresseAuto({ value, onChange, onPick, cp, label = "Adresse", placeholder }: {
  value: string; onChange: (v: string) => void; onPick?: (s: Sugg) => void; cp?: string; label?: string; placeholder?: string;
}) {
  const [focus, setFocus] = useState(false);
  const [sugg, setSugg] = useState<Sugg[]>([]);
  const deb = useDebounce(value);
  useEffect(() => {
    if (!focus || deb.trim().length < 4) return setSugg([]);
    const filtre = cp && cp.length === 5 ? `&postcode=${cp}` : "";
    getJson(`https://data.geopf.fr/geocodage/search?q=${encodeURIComponent(deb)}&autocomplete=1&limit=5&index=address${filtre}`).then((j) => {
      setSugg(((j?.features || []) as any[]).filter((f) => ["housenumber", "street", "locality"].includes(f.properties?.type)).map((f) => ({
        label: f.properties.label, adresse: f.properties.name, cp: f.properties.postcode || "", ville: f.properties.city || "",
      })));
    });
  }, [deb, focus, cp]);
  return (
    <div className="relative"><label className="label">{label}</label>
      <input className="input" value={value} placeholder={placeholder} autoComplete="off"
        onFocus={() => setFocus(true)} onBlur={() => setTimeout(() => setFocus(false), 150)} onChange={(e) => onChange(e.target.value)} />
      {focus && <Liste items={sugg.map((s) => ({ cle: s.label, texte: s.label }))}
        onPick={(i) => { const s = sugg[i]; onChange(s.adresse); onPick?.(s); setSugg([]); setFocus(false); }} />}
    </div>
  );
}
