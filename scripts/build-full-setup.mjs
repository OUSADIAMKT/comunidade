// Gera supabase/FULL_SETUP.sql = migrations (ordem numérica) + seed.sql, em uma única transação.
// Uso: npm run db:bundle
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "supabase");
const read = (p) => readFileSync(p, "utf8").replace(/^﻿/, "").trimEnd();

const migrations = readdirSync(join(root, "migrations"))
  .filter((f) => /^\d{4}_.+\.sql$/.test(f))
  .sort();

const parts = [
  `-- ============================================================================
-- FULL_SETUP.sql — Creators da Amazônia
-- Gerado por "npm run db:bundle". NÃO edite à mão: edite as migrations e gere de novo.
--
-- Conteúdo, em ordem: ${migrations.join(", ")}, seed.sql
--
-- COMO USAR: cole TUDO no SQL Editor do Supabase e rode UMA vez, em um projeto novo/vazio.
-- Tudo roda em uma transação: se algo falhar, nada é aplicado e você vê o erro.
-- Depois, vire admin (trocando o e-mail):
--   UPDATE public.users SET is_admin = TRUE WHERE email = 'seu-email@exemplo.com';
-- ============================================================================

BEGIN;`,
];
for (const f of migrations) {
  parts.push(`-- ---------------------------------------------------------------------------\n-- >>> ${f}\n-- ---------------------------------------------------------------------------\n${read(join(root, "migrations", f))}`);
}
parts.push(`-- ---------------------------------------------------------------------------\n-- >>> seed.sql\n-- ---------------------------------------------------------------------------\n${read(join(root, "seed.sql"))}`);
parts.push("COMMIT;");

writeFileSync(join(root, "FULL_SETUP.sql"), parts.join("\n\n") + "\n", "utf8");
console.log(`FULL_SETUP.sql gerado (${migrations.length} migrations + seed).`);
