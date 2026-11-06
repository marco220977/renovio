"use client";
import { sb } from "./supabase";
import type { CatalogItem } from "./types";

/** Tout le catalogue de l'entreprise, par paquets de 1000 (limite de Supabase par requête) */
export async function loadCatalog(): Promise<CatalogItem[]> {
  const all: CatalogItem[] = [];
  for (let from = 0; from < 50000; from += 1000) {
    const { data, error } = await sb().from("catalog_items").select("*").order("category").order("label").range(from, from + 999);
    if (error || !data) break;
    all.push(...(data as CatalogItem[]));
    if (data.length < 1000) break;
  }
  return all;
}

export const itemText = (i: CatalogItem) => `${i.label} ${i.category} ${i.ref || ""} ${i.supplier || ""} ${i.description || ""}`.toLowerCase();
