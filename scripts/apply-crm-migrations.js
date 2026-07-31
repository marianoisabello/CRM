'use strict';
/**
 * Aplica scripts/migrations/001–007 en orden vía DATABASE_URL / SUPABASE_DB_URL.
 * Uso (desde raíz del CRM):
 *   node scripts/apply-crm-migrations.js
 *
 * Requiere: pg, dotenv, y DATABASE_URL (Postgres de Supabase).
 * NO corre contra producción a menos que esa URL sea la de prod — verificar antes.
 */
require('dotenv').config({ path: '.env.pulled' });
require('dotenv').config({ path: '.env.qa.local' });
require('dotenv').config({ path: '.env.local' });

const fs = require('fs');
const path = require('path');

const FILES = [
  '001_companies.sql',
  '002_contacts.sql',
  '003_pipeline_stages_deals.sql',
  '004_activities.sql',
  '005_agent_decisions.sql',
  '006_alter_existing.sql',
  '007_indexes_notes.sql',
];

async function main() {
  const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  if (!dbUrl) {
    console.error('Missing DATABASE_URL or SUPABASE_DB_URL');
    console.error('Set it in .env.local (Postgres connection string from Supabase → Settings → Database).');
    console.error('Or paste each file from scripts/migrations/ into the Supabase SQL Editor (local/staging).');
    process.exit(3);
  }

  // Safety: refuse obvious production markers unless ALLOW_PROD_MIGRATIONS=1
  const allowProd = process.env.ALLOW_PROD_MIGRATIONS === '1';
  const host = (dbUrl.match(/@([^/:]+)/) || [])[1] || '';
  if (!allowProd && /pooler\.supabase\.com|db\.[a-z0-9]+\.supabase\.co/i.test(host) && !/localhost|127\.0\.0\.1/i.test(dbUrl)) {
    console.error('Refusing to run: DATABASE_URL looks like hosted Supabase.');
    console.error('Host:', host);
    console.error('If this IS your local/staging project and you accept the risk, set ALLOW_PROD_MIGRATIONS=1');
    process.exit(4);
  }

  let pg;
  try {
    pg = require('pg');
  } catch {
    console.error('Install pg: npm i pg');
    process.exit(2);
  }

  const dir = path.join(__dirname, 'migrations');
  const client = new pg.Client({ connectionString: dbUrl, ssl: /localhost|127\.0\.0\.1/i.test(dbUrl) ? false : { rejectUnauthorized: false } });
  await client.connect();
  console.log('Connected. Applying migrations…');

  try {
    for (const file of FILES) {
      const sqlPath = path.join(dir, file);
      const sql = fs.readFileSync(sqlPath, 'utf8');
      process.stdout.write(`→ ${file} … `);
      await client.query(sql);
      console.log('OK');
    }

    const check = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('companies','contacts','pipeline_stages','deals','activities','agent_decisions')
      ORDER BY table_name
    `);
    console.log('Tables:', check.rows.map((r) => r.table_name).join(', '));

    const stages = await client.query(`SELECT key, name, position FROM pipeline_stages ORDER BY position`);
    console.log('Stages:', stages.rows.map((r) => r.key).join(' → '));
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
