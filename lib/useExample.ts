"use client";
import { useCompany } from "@/components/CompanyContext";
import { example, type Trade } from "@/lib/trades";

/** Exemple de saisie adapté au premier métier de l'entreprise */
export function useExample() {
  const { company } = useCompany();
  return (key: keyof Trade["ex"]) => example(company?.trades, key);
}
