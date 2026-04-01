const { Client } = require('pg');

const SQL = `
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY, username VARCHAR ( 255 ), text VARCHAR ( 255 ), added VARCHAR ( 255 ));

`;

async function main() {
  console.log('seeding...');
  console.log(process.env.DATABASE_URL);
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  await client.connect();
  await client.query(SQL);
  await client.end();
  console.log('done');
}

main();
