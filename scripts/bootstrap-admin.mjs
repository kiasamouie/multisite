#!/usr/bin/env node
/**
 * Bootstrap the first platform admin.
 *
 * Usage:
 *   node scripts/bootstrap-admin.mjs <email> [role]
 *
 * Role defaults to "super_admin". Allowed: "super_admin" | "platform_admin"
 *
 * The user must already exist in Supabase Auth (they can sign up via /admin/login).
 * This script inserts a row into platform_admins, bypassing RLS via the service_role key.
 *
 * Required env vars (load from .env automatically):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env from monorepo root
function loadEnv() {
  const envPath = resolve(__dirname, "../.env");
  try {
    const content = readFileSync(envPath, "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    // .env not found, rely on process.env
  }
}

loadEnv();

const email = process.argv[2];
const role = process.argv[3] ?? "super_admin";

if (!email) {
  console.error("Usage: node scripts/bootstrap-admin.mjs <email> [role]");
  process.exit(1);
}

if (!["super_admin", "platform_admin"].includes(role)) {
  console.error("Role must be 'super_admin' or 'platform_admin'");
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Find user by email
const { data: { users }, error: listError } = await admin.auth.admin.listUsers();
if (listError) {
  console.error("Failed to list users:", listError.message);
  process.exit(1);
}

const user = users.find((u) => u.email === email);
if (!user) {
  console.error(`No Supabase auth user found with email: ${email}`);
  console.error("The user must sign up first at /admin/login before running this script.");
  process.exit(1);
}

// Check if already a platform admin
const { data: existing } = await admin
  .from("platform_admins")
  .select("id, role")
  .eq("user_id", user.id)
  .single();

if (existing) {
  console.log(`User ${email} is already a platform admin with role: ${existing.role}`);
  process.exit(0);
}

// Insert platform admin
const { error: insertError } = await admin
  .from("platform_admins")
  .insert({ user_id: user.id, role });

if (insertError) {
  console.error("Failed to create platform admin:", insertError.message);
  process.exit(1);
}

console.log(`✓ Platform admin created: ${email} (${role})`);
console.log(`  User ID: ${user.id}`);
console.log(`  They can now log in at http://admin.localhost:3000/admin`);
