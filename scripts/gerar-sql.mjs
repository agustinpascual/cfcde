/* Concatena supabase/migrations/*.sql em TUDO.sql e no arquivo TS embutido. */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dir = "supabase/migrations";
const sql = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()
  .map((f) => readFileSync(join(dir, f), "utf8").trim()).join("\n\n");

writeFileSync("supabase/TUDO.sql", sql + "\n");
writeFileSync("src/lib/sql-instalacao.ts",
  `import "server-only";\n\n/* O SQL de instalação vive aqui como string para ir junto no deploy.\n   Gerado de supabase/migrations/*.sql — rode \`npm run sql\` para refazer. */\nexport const SQL_INSTALACAO = ${JSON.stringify(sql)};\n`);
console.log(`gerado: ${sql.length} caracteres`);
