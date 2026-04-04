#!/usr/bin/env node

/**
 * Setup script for media bucket in Supabase
 * Creates the 'media' bucket with proper configuration
 * 
 * Usage: node scripts/setup-media-bucket.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env from root
function loadEnv() {
  const envPath = resolve(__dirname, "../.env");
  try {
    const content = readFileSync(envPath, "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const [key, ...valueParts] = trimmed.split("=");
      const value = valueParts.join("=").replace(/^"|"$/g, "");
      process.env[key] = value;
    }
  } catch (err) {
    console.error("Failed to load .env:", err.message);
  }
}

loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌ Missing environment variables:");
  console.error("   - NEXT_PUBLIC_SUPABASE_URL");
  console.error("   - SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function setupMediaBucket() {
  try {
    console.log("🔧 Setting up media bucket...\n");

    // Check if bucket exists
    const { data: buckets, error: listError } = await adminClient.storage.listBuckets();

    if (listError) {
      console.error("❌ Failed to list buckets:", listError.message);
      process.exit(1);
    }

    const mediaExists = buckets?.some((b) => b.name === "media");

    if (mediaExists) {
      console.log("✅ Bucket 'media' already exists");
      
      // Get bucket info
      const { data: bucket } = await adminClient.storage.getBucket("media");
      console.log("   - Public:", bucket?.public ? "Yes" : "No");
      console.log("   - File size limit:", bucket?.file_size_limit ? `${bucket.file_size_limit / (1024 * 1024)}MB` : "Not set");
    } else {
      console.log("📦 Creating 'media' bucket...");
      
      const { data, error } = await adminClient.storage.createBucket("media", {
        public: false, // IMPORTANT: Set to false for signed URL access control
        // Note: fileSizeLimit is optional, Supabase has default limits
      });

      if (error) {
        console.error("❌ Failed to create bucket:", error.message);
        process.exit(1);
      }

      console.log("✅ Bucket 'media' created successfully");
      console.log("   - Public: No (uses signed URLs)");
      console.log("   - File size limit: Supabase default (100MB per file)");
    }

    console.log("\n✨ Media bucket is ready!");
    console.log("\nNext steps:");
    console.log("1. Run your app: pnpm dev");
    console.log("2. Upload a file from the tenant admin media page");
    console.log("3. Check Supabase Storage dashboard for the file");
    console.log("4. Verify the file appears in the media table");

  } catch (err) {
    console.error("❌ Unexpected error:", err);
    process.exit(1);
  }
}

setupMediaBucket();
