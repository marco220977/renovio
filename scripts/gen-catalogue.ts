// Génère supabase/catalogue.sql à partir de data/catalogue.ts
import { writeFileSync } from "fs";
import { CATALOGUE } from "../data/catalogue";
const q = (s?: string) => (s == null ? "null" : `'${s.replace(/'/g, "''")}'`);
const rows: string[] = [];
for (const [trade, items] of Object.entries(CATALOGUE))
  for (const [cat, label, unit, price, vat, cost, desc] of items)
    rows.push(`  (${q(trade)}, ${q(cat)}, ${q(label)}, ${q(desc)}, ${q(unit)}, ${price}, ${vat}, ${cost})`);
const sql = `-- Catalogue de départ par métier (généré par npm run catalogue — ne pas modifier à la main)
truncate starter_catalog restart identity;
insert into starter_catalog (trade, category, label, description, unit, unit_price, vat_rate, cost_price) values
${rows.join(",\n")};
`;
writeFileSync(new URL("../supabase/catalogue.sql", import.meta.url), sql);
console.log(`${rows.length} articles écrits dans supabase/catalogue.sql`);
