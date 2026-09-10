// One-off script to bring Supabase's schema up to date with new local
// features without touching any existing rows. drizzle-kit push refuses to
// run non-interactively when it wants to confirm a destructive-looking
// change (column rename, unique constraint on a non-empty table), so this
// applies the same DDL directly instead. Safe to re-run - every statement
// is idempotent.
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
        mentee_user_id uuid REFERENCES users(id) ON DELETE CASCADE,
        mentor_user_id uuid REFERENCES users(id) ON DELETE CASCADE,
        status chat_request_status NOT NULL DEFAULT 'pending',
        message text,
        created_at timestamp NOT NULL DEFAULT now(),
        reviewed_at timestamp
      );
    `;

    // The requester/recipient rename: mentee_user_id -> requester_user_id,
    // mentor_user_id -> recipient_user_id (requester can be a mentee or a
    // mentor networking with another mentor; recipient is always a mentor).
    await sql`ALTER TABLE chat_requests RENAME COLUMN mentee_user_id TO requester_user_id;`.catch(() => {});
    await sql`ALTER TABLE chat_requests RENAME COLUMN mentor_user_id TO recipient_user_id;`.catch(() => {});
    await sql`ALTER TABLE chat_requests ALTER COLUMN requester_user_id SET NOT NULL;`;
    await sql`ALTER TABLE chat_requests ALTER COLUMN recipient_user_id SET NOT NULL;`;

    await sql`DROP INDEX IF EXISTS chat_requests_mentor_idx;`;
    await sql`DROP INDEX IF EXISTS chat_requests_mentee_idx;`;
    await sql`CREATE INDEX IF NOT EXISTS chat_requests_recipient_idx ON chat_requests (recipient_user_id, status);`;
    await sql`CREATE INDEX IF NOT EXISTS chat_requests_requester_idx ON chat_requests (requester_user_id, status);`;

    await sql`
      CREATE TABLE IF NOT EXISTS public.messages (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        chat_request_id uuid NOT NULL REFERENCES chat_requests(id) ON DELETE CASCADE,
        sender_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        body text NOT NULL,
        created_at timestamp NOT NULL DEFAULT now(),
        read_at timestamp
      );
    `;
    await sql`CREATE INDEX IF NOT EXISTS messages_chat_request_idx ON public.messages (chat_request_id, created_at);`;

    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS username text;`;

    const constraintExists = await sql`
      SELECT 1 FROM pg_constraint WHERE conname = 'users_username_unique';
    `;
    if (constraintExists.length === 0) {
      await sql`ALTER TABLE users ADD CONSTRAINT users_username_unique UNIQUE (username);`;
    }

    await sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS connections_viewed_at timestamp;`;
    await sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS show_university boolean NOT NULL DEFAULT true;`;
    await sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS show_city boolean NOT NULL DEFAULT true;`;
    await sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS show_bio boolean NOT NULL DEFAULT true;`;

    await sql`
      CREATE TABLE IF NOT EXISTS site_settings (
        id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
        mentee_message_rate_limit_enabled boolean NOT NULL DEFAULT false,
        contact_request_message_enabled boolean NOT NULL DEFAULT false,
        homepage_title text,
        homepage_description text,
        contact_request_guidance text,
        contact_request_examples text
      );
    `;
    await sql`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS contact_request_message_enabled boolean NOT NULL DEFAULT false;`;
    await sql`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS homepage_title text;`;
    await sql`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS homepage_description text;`;
    await sql`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS contact_request_guidance text;`;
    await sql`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS contact_request_examples text;`;
    await sql`
      INSERT INTO site_settings (id, mentee_message_rate_limit_enabled)
      VALUES (1, false)
      ON CONFLICT (id) DO NOTHING;
    `;

    console.log("Supabase schema is up to date.");
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
