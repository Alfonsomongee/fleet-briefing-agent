import { createClient } from "@supabase/supabase-js";

// These are public values — safe to embed (anon key is read-only via RLS).
// Writes require the service_role key, which lives only in GitHub Actions secrets.
const SUPABASE_URL =
  process.env.SUPABASE_URL ?? "https://ppqbfizsnmugzsqpjowz.supabase.co";

const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwcWJmaXpzbm11Z3pzcXBqb3d6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4NzAxMjMsImV4cCI6MjEwMTQ0NjEyM30.lYgowbDTVszgPgJ224wirRTyODaHItz6rPBd0ucdr7o";

export function createServerClient() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
