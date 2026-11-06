"use client";
import { useCompany } from "@/components/CompanyContext";
import { TRADE, tradesOf } from "@/lib/trades";

/** Choix du métier d'un devis, chantier, SAV… (parmi ceux de l'entreprise). Masqué si l'entreprise n'a qu'un métier. */
export default function TradeSelect({ value, onChange, disabled }: { value?: string | null; onChange: (v: string | null) => void; disabled?: boolean }) {
  const { company } = useCompany();
  const list = tradesOf(company?.trades);
  if (value && !list.some((t) => t.id === value) && TRADE[value]) list.push(TRADE[value]);
  if (list.length < 2 && !value) return null;
  return (
    <div>
      <label className="label">Métier</label>
      <select className="input" disabled={disabled} value={value || ""} onChange={(e) => onChange(e.target.value || null)}>
        <option value="">Plusieurs métiers / non classé</option>
        {list.map((t) => <option key={t.id} value={t.id}>{t.emoji} {t.label}</option>)}
      </select>
    </div>
  );
}
