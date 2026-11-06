"use client";
/** Fenêtre en bas d'écran. `tall` : hauteur fixe (88 % de l'écran) avec une zone qui défile, pour les longues listes. */
export default function Modal({ title, onClose, children, tall }: { title: string; onClose: () => void; children: React.ReactNode; tall?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div className={`w-full max-w-lg rounded-t-3xl bg-white p-5 sm:rounded-3xl ${tall ? "flex h-[88dvh] flex-col" : "max-h-[90dvh] overflow-y-auto"}`} onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex shrink-0 items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="text-2xl leading-none text-slate-400" aria-label="Fermer">×</button>
        </div>
        {tall ? <div className="flex min-h-0 flex-1 flex-col">{children}</div> : children}
      </div>
    </div>
  );
}
