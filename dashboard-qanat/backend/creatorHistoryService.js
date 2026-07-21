import pg from "pg";

const pool = new pg.Pool({
  connectionString:
    process.env.LUMIERA_DATABASE_URL ||
    "postgresql://lumiera@127.0.0.1:5432/lumiera",
});

export async function ensureCreatorHistoryDatabase() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS creator_history (
        id SERIAL PRIMARY KEY,
        mode VARCHAR(100) NOT NULL,
        title TEXT NOT NULL,
        state_payload JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch (err) {
    console.error(
      "[CreatorHistory] Erro ao assegurar tabela no PostgreSQL:",
      err
    );
  } finally {
    client.release();
  }
}

export async function saveCreatorHistory(mode, title, statePayload) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Insert the new record
    await client.query(
      `INSERT INTO creator_history (mode, title, state_payload) VALUES ($1, $2, $3)`,
      [mode, title, JSON.stringify(statePayload)]
    );

    // Keep up to 50 most recent records for this mode in PostgreSQL
    await client.query(
      `DELETE FROM creator_history 
       WHERE mode = $1 
       AND id NOT IN (
         SELECT id FROM creator_history 
         WHERE mode = $1 
         ORDER BY created_at DESC 
         LIMIT 50
       )`,
      [mode]
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[CreatorHistory] Erro ao salvar historico:", err);
    throw err;
  } finally {
    client.release();
  }
}

export async function getCreatorHistory(mode) {
  const client = await pool.connect();
  try {
    const res = await client.query(
      `SELECT id, mode, title, state_payload, created_at 
       FROM creator_history 
       WHERE mode = $1 
       ORDER BY created_at DESC 
       LIMIT 50`,
      [mode]
    );
    return res.rows;
  } catch (err) {
    console.error("[CreatorHistory] Erro ao buscar historico:", err);
    throw err;
  } finally {
    client.release();
  }
}
