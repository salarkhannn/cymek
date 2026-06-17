import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const sql = postgres(databaseUrl, { max: 1 });

async function run() {
  await sql`CREATE EXTENSION IF NOT EXISTS vector`;
  await sql`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`;

  const db = drizzle(sql);
  await migrate(db, { migrationsFolder: "drizzle" });

  console.log("Migrations complete");
  await sql.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
