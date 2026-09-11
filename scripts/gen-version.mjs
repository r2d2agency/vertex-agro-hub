// Gera um identificador de versão a cada build (rodado via "prebuild" no
// package.json) e grava o MESMO valor em dois lugares:
//   - public/version.json      -> lido em runtime pelo cliente (fetch)
//   - src/lib/app-version.ts   -> embutido no bundle JS (import estático)
// O cliente compara os dois pra saber se existe uma versão mais nova
// publicada no servidor (ver src/lib/app-update.ts).
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const version = process.env.SOURCE_COMMIT || process.env.GIT_COMMIT || new Date().toISOString();

mkdirSync(join(root, "public"), { recursive: true });
writeFileSync(
  join(root, "public", "version.json"),
  JSON.stringify({ version, builtAt: new Date().toISOString() }, null, 2) + "\n",
);

mkdirSync(join(root, "src", "lib"), { recursive: true });
writeFileSync(
  join(root, "src", "lib", "app-version.ts"),
  `// Gerado automaticamente em build por scripts/gen-version.mjs — não editar à mão.\nexport const APP_VERSION = ${JSON.stringify(version)};\n`,
);

console.log(`[gen-version] APP_VERSION = ${version}`);
