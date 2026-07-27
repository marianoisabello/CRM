'use strict';
require('dotenv').config({ path: '.env.pulled' });
require('dotenv').config({ path: '.env.local' });

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
    process.exit(1);
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  // Probe: try select; if table missing, instruct to run SQL
  const { error: e1 } = await supabase.from('reuniones').select('id').limit(1);
  const { error: e2 } = await supabase.from('user_integrations').select('id').limit(1);

  if (!e1 && !e2) {
    console.log('OK: reuniones + user_integrations already exist');
    return;
  }

  console.log('reuniones probe:', e1 ? e1.message : 'ok');
  console.log('user_integrations probe:', e2 ? e2.message : 'ok');

  const sqlPath = path.join(__dirname, '../supabase_reuniones.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  // Prefer Database URL if present (direct Postgres)
  const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  if (dbUrl) {
    let pg;
    try {
      pg = require('pg');
    } catch {
      console.error('Install pg to apply SQL: npm i pg');
      process.exit(2);
    }
    const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
    await client.connect();
    await client.query(sql);
    await client.end();
    console.log('SQL applied via DATABASE_URL');
    return;
  }

  console.log('NO_DB_URL: run supabase_reuniones.sql in Supabase SQL Editor');
  console.log('SQL file:', sqlPath);
  process.exit(3);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
