import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { importTemplateCatalogDatabase } from "../dashboard-qanat/backend/remotionTemplatePostgres.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CATALOG_PATH = path.resolve(
  __dirname,
  "../dashboard-qanat/backend/data/remotion-template-catalog.json"
);

async function main() {
  if (!fs.existsSync(CATALOG_PATH)) {
    console.error(`Catalogo JSON nao encontrado: ${CATALOG_PATH}`);
    process.exit(1);
  }
  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"));
  console.log("Importando catalogo em disco para o PostgreSQL...");
  const result = await importTemplateCatalogDatabase(catalog);
  console.log("Sincronizado com sucesso:", result);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
