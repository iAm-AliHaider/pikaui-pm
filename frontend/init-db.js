const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = 'postgresql://neondb_owner:npg_laesRAW8Dui1@ep-plain-sound-aib5z9bz-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require';
const schemaPath = path.join(__dirname, '..', 'agent', 'schema.sql');

async function runSchema() {
  const client = new Client({ connectionString });
  try {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await client.connect();
    console.log('Connected to Neon DB.');
    await client.query(schemaSql);
    console.log('Schema successfully applied!');
  } catch (err) {
    console.error('Error applying schema:', err);
  } finally {
    await client.end();
  }
}

runSchema();
