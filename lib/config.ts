// Clés publiques Supabase (faites pour être visibles côté navigateur, la sécurité est assurée par la RLS).
// À remplacer par celles du projet Supabase de Rénovio (Project Settings > API), ou à définir dans les variables d'environnement.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://A-REMPLACER.supabase.co";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "A-REMPLACER";
