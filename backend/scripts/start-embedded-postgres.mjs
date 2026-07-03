import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import EmbeddedPostgres from 'embedded-postgres';

const databaseDir = resolve(
  process.env.EMBEDDED_POSTGRES_DATA_DIR ?? '.tmp/embedded-postgres',
);
const port = Number(process.env.EMBEDDED_POSTGRES_PORT ?? 55432);
const user = process.env.EMBEDDED_POSTGRES_USER ?? 'postgres';
const password = process.env.EMBEDDED_POSTGRES_PASSWORD ?? 'postgres';
const database = process.env.EMBEDDED_POSTGRES_DB ?? 'tmdtth';

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('EMBEDDED_POSTGRES_PORT must be a valid TCP port.');
}

const postgres = new EmbeddedPostgres({
  databaseDir,
  port,
  user,
  password,
  persistent: true,
  initdbFlags: ['--encoding=UTF8', '--locale=C'],
});

if (!existsSync(resolve(databaseDir, 'PG_VERSION'))) {
  await postgres.initialise();
}

await postgres.start();

try {
  await postgres.createDatabase(database);
} catch (error) {
  if (!(error && typeof error === 'object' && error.code === '42P04')) {
    throw error;
  }
}

console.log(
  `Embedded PostgreSQL ready: postgresql://${user}:${password}@localhost:${port}/${database}?schema=public`,
);
console.log('Press Ctrl+C to stop.');

await new Promise(() => undefined);
