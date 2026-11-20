import { readFile } from 'node:fs/promises';
import { createInterface } from 'node:readline/promises';
import pg from 'pg';

async function main() {
  const credentials = new URL('../.local/windows/credentials.json', import.meta.url);
  const { owner } = JSON.parse(await readFile(credentials, 'utf8'));
  const db = new pg.Client({
    host: '127.0.0.1',
    port: 55432,
    database: 'encore',
    user: 'postgres',
    password: owner,
    connectionTimeoutMillis: 4000,
  });

  await db.connect();
  const terminal = createInterface({ input: process.stdin, output: process.stdout });
  terminal.setPrompt('encore> ');
  console.log('Connected to Encore PostgreSQL. Enter one SQL command per line. Type \\q to quit.');
  terminal.prompt();

  try {
    for await (const line of terminal) {
      const sql = line.trim();
      if (sql === '\\q') break;
      if (sql) {
        try {
          const results = [await db.query(sql)].flat();
          for (const { rows, fields, command, rowCount } of results) {
            if (rows.length === 1 && fields.length === 1) {
              console.log(rows[0][fields[0].name]);
            } else if (rows.length) {
              console.table(rows);
            } else {
              console.log(rowCount === null ? command : command + ' ' + rowCount);
            }
          }
        } catch (error) {
          console.error(error.message);
        }
      }
      terminal.prompt();
    }
  } finally {
    terminal.close();
    await db.end();
  }
}

main().catch(error => {
  console.error('Could not open the Encore database. Keep Start-Encore.cmd running.');
  console.error(error.message);
  process.exitCode = 1;
});
