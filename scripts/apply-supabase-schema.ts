// One-off script to bring Supabase's schema up to date with new local
// features (chat requests, usernames) without touching any existing rows.
// drizzle-kit push refuses to run non-interactively when it wants to confirm
// a unique constraint against a non-empty table, so this applies the same
// DDL directly instead. Safe to re-run - every statement is idempotent.
import "dotenv/config";
import postgres from "postgres";

async function main() {
  const url = process.env.SUPABASE_DATABASE_URL;
  if (!url) throw new Error("Set SUPABASE_DATABASE_URL before running this script.");

  const sql = postgres(url, { prepare: false });

  try {
    await sql`
      DO $$ BEGIN
        CREATE TYPE chat_request_status AS ENUM ('pending','accepted','rejected','cancelled');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS chat_requests (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        mentee_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        mentor_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status chat_request_status NOT NULL DEFAULT 'pending',
        message text,
        created_at timestamp NOT NULL DEFAULT now(),
        reviewed_at timestamp
      );
    `;

    await sql`CREATE INDEX IF NOT EXISTS chat_requests_mentor_idx ON chat_requests (mentor_user_id, status);`;
    await sql`CREATE INDEX IF NOT EXISTS chat_requests_mentee_idx ON chat_requests (mentee_user_id, status);`;

    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS username text;`;

    const constraintExists = await sql`
      SELECT 1 FROM pg_constraint WHERE conname = 'users_username_unique';
    `;
    if (constraintExists.length === 0) {
      await sql`ALTER TABLE users ADD CONSTRAINT users_username_unique UNIQUE (username);`;
    }

    console.log("Supabase schema is up to date.");
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
