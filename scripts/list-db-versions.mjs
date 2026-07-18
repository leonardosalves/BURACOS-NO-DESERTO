import pg from "pg";
const { Pool } = pg;

async function main() {
  const pool = new Pool({
    connectionString: "postgresql://lumiera@127.0.0.1:5432/lumiera",
  });
  const res = await pool.query(
    "SELECT id, niche_key, template_count, reason, created_at FROM remotion_template_catalog_versions ORDER BY id DESC LIMIT 15"
  );
  console.log(JSON.stringify(res.rows, null, 2));
  await pool.end();
}

main().catch(console.error);
