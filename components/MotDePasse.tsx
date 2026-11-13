"use client";
// Champ mot de passe avec bouton 👁️ pour afficher / masquer ce qui est tapé.
import { useState } from "react";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">;

export default function MotDePasse({ className = "", ...props }: Props) {
  const [voir, setVoir] = useState(false);
  return (
    <div className="relative">
      <input {...props} type={voir ? "text" : "password"} autoCapitalize="none" autoCorrect="off" spellCheck={false}
        className={`input pr-12 ${className}`} />
      <button type="button" onClick={() => setVoir(!voir)} aria-label={voir ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-xl text-slate-500">
        {voir ? "🙈" : "👁️"}
      </button>
    </div>
  );
}
