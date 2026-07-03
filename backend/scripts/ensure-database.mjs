import 'dotenv/config';
import { Client } from 'pg';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required.');
}

const targetUrl = new URL(databaseUrl);
const targetDatabase =
  process.env.POSTGRES_DB ?? decodeURIComponent(targetUrl.pathname.slice(1));
const adminDatabase = process.env.POSTGRES_ADMIN_DB ?? 'postgres';

if (!targetDatabase) {
  throw new Error('PostgreSQL database name is required in DATABASE_URL or POSTGRES_DB.');
}

const adminUrl = new URL(databaseUrl);
adminUrl.pathname = `/${encodeURIComponent(adminDatabase)}`;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function connectWithRetry(connectionString, maxAttempts = 36) {
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const client = new Client({ connectionString });

    try {
      await client.connect();
      return client;
    } catch (error) {
      lastError = error;
      await client.end().catch(() => {});
      await delay(5000);
    }
  }

  throw lastError;
}

function quoteIdentifier(identifier) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

const client = await connectWithRetry(adminUrl.toString());

try {
  const result = await client.query(
    'SELECT 1 FROM pg_database WHERE datname = $1',
    [targetDatabase],
  );

  if (result.rowCount > 0) {
    console.log(`Database ${targetDatabase} already exists.`);
  } else {
    await client.query(`CREATE DATABASE ${quoteIdentifier(targetDatabase)}`);
    console.log(`Database ${targetDatabase} created.`);
  }
} finally {
  await client.end();
}
