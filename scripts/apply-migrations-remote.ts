import dotenv from "dotenv";
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local", override: true });

import fs from "node:fs";
import path from "node:path";

async function main() {
  const url = process.env.REMOTE_DATABASE_URL;
  const authToken = process.env.REMOTE_DATABASE_AUTH_TOKEN;
  if (!url || !authToken) {
    throw new Error("請設定 REMOTE_DATABASE_URL 與 REMOTE_DATABASE_AUTH_TOKEN 環境變數");
  }

  const { createClient } = await import("@libsql/client");
  const client = createClient({ url, authToken });

  const migrationsDir = path.join(__dirname, "..", "prisma", "migrations");
  const dirs = fs
    .readdirSync(migrationsDir)
    .filter((d) => fs.statSync(path.join(migrationsDir, d)).isDirectory())
    // 可指定只套用某幾個 migration：npm run db:migrate-remote -- 20261007031523_push
    .filter((d) => process.argv.length <= 2 || process.argv.slice(2).includes(d))
    .sort();

  for (const dir of dirs) {
    const sqlPath = path.join(migrationsDir, dir, "migration.sql");
    if (!fs.existsSync(sqlPath)) continue;
    const sql = fs.readFileSync(sqlPath, "utf-8");
    console.log(`Applying ${dir} ...`);
    await client.executeMultiple(sql);
  }

  console.log("All migrations applied to remote database.");
  client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
