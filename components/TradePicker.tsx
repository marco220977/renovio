"use client";
import { TRADES } from "@/lib/trades";

/** Choix des corps de métier (plusieurs possibles) */
export default function TradePicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  return (
    <div className="flex flex-wrap gap-1.5">
      {TRADES.map((t) => {
        const on = value.includes(t.id);
        return (
          <button type="button" key={t.id} onClick={() => toggle(t.id)}
            className={`chip border py-1.5 text-left ${on ? "border-ink bg-ink text-white" : "border-slate-200 bg-white text-slate-700"}`}>
            {t.emoji} {t.label}
          </button>
        );
      })}
    </div>
  );
}
