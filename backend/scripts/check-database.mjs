import 'dotenv/config';
import { Client } from 'pg';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required.');
}

const client = new Client({ connectionString: databaseUrl });

await client.connect();

try {
  const result = await client.query(`
    SELECT COUNT(*)::int AS "tableCount"
    FROM information_schema.tables
    WHERE table_schema = current_schema()
      AND table_type = 'BASE TABLE'
  `);

  console.log(JSON.stringify(result.rows[0]));
} finally {
  await client.end();
}
