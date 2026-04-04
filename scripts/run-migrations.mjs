import pg from "pg";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const password = process.env.SUPABASE_DATABASE_PASSWORD;
const ref = "ysxhnfsvvxfimezgdfby";

// Try direct host first, then various pooler regions 
const ENDPOINTS = [
  `postgresql://postgres:${encodeURIComponent(password)}@db.${ref}.supabase.co:5432/postgres`,
  `postgresql://postgres.${ref}:${encodeURIComponent(password)}@aws-0-eu-west-2.pooler.supabase.com:6543/postgres`,
  `postgresql://postgres.${ref}:${encodeURIComponent(password)}@aws-0-eu-west-2.pooler.supabase.com:5432/postgres`,
  `postgresql://postgres.${ref}:${encodeURIComponent(password)}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`,
  `postgresql://postgres.${ref}:${encodeURIComponent(password)}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`,
  `postgresql://postgres.${ref}:${encodeURIComponent(password)}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`,
];

async function tryConnect() {
  for (const url of ENDPOINTS) {
    const region = url.match(/aws-0-([^.]+)/)?.[1] || "unknown";
    try {
      console.log(`Trying region: ${region}...`);
      const client = new pg.Client({ connectionString: url, connectionTimeoutMillis: 8000 });
      await client.connect();
      console.log(`Connected via ${region}`);
      return client;
    } catch (e) {
      console.log(`  Failed: ${e.message}`);
    }
  }
  throw new Error("Could not connect to any Supabase pooler endpoint");
}

async function main() {
  const client = await tryConnect();

  const migrationsDir = join(process.cwd(), "supabase", "migrations");
  const files = readdirSync(migrationsDir).sort();

  console.log(`\nRunning ${files.length} migrations...\n`);

  for (const file of files) {
    const sql = readFileSync(join(migrationsDir, file), "utf-8");
    try {
      await client.query(sql);
      console.log(`✓ ${file}`);
    } catch (err) {
      console.error(`✗ ${file}: ${err.message}`);
      // Continue - some may already exist
    }
  }

  console.log("\nDone!");
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
