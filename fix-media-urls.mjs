import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Load .env.local
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "apps/web/.env.local");
const envContent = fs.readFileSync(envPath, "utf-8");

const env = {};
envContent.split("\n").forEach((line) => {
  const match = line.match(/^([^=]+)="?([^"]*)"?/);
  if (match && !line.startsWith("#")) {
    env[match[1].trim()] = match[2].trim();
  }
});

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

console.log("Fixing media URLs with double media/ prefix...\n");

// Find all media records with url starting with media/
const { data: allMedia, error: fetchError } = await supabase
  .from("media")
  .select("id, url, filename")
  .like("url", "media/%");

if (fetchError) {
  console.error("Error fetching media:", fetchError.message);
  process.exit(1);
}

console.log(`Found ${allMedia.length} media records. Checking which need fixing...\n`);

for (const media of allMedia) {
  const hasDoublePrefix = media.url.includes("media/media/");
  
  if (hasDoublePrefix) {
    console.log(`❌ ${media.id}: ${media.url} (has double prefix)`);
    
    // Fix it
    const newUrl = media.url.replace("media/media/", "media/");
    const { error: updateError } = await supabase
      .from("media")
      .update({ url: newUrl })
      .eq("id", media.id);
    
    if (updateError) {
      console.log(`   Error updating: ${updateError.message}`);
    } else {
      console.log(`   ✅ Fixed to: ${newUrl}`);
    }
  } else if (media.url.startsWith("media/")) {
    console.log(`✅ ${media.id}: ${media.url} (OK)`);
  }
}

console.log("\nDone!");
