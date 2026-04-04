import { createAdminClient } from "./packages/lib/dist/supabase/admin.js";

const supabase = createAdminClient();

console.log("Testing Media Resolution...\n");

// Check media record
const { data: media, error: mediaError } = await supabase
  .from("media")
  .select("*")
  .eq("id", 15)
  .single();

console.log("Media record (id=15):", mediaError ? `ERROR: ${mediaError.message}` : JSON.stringify(media, null, 2));

// Check association
const { data: assoc, error: assocError } = await supabase
  .from("media_page_associations")
  .select("*")
  .eq("media_id", 15);

console.log("\nAssociations (media_id=15):", assocError ? `ERROR: ${assocError.message}` : JSON.stringify(assoc, null, 2));

// Check page 10
const { data: page, error: pageError } = await supabase
  .from("pages")
  .select("*")
  .eq("id", 10)
  .single();

console.log("\nPage 10:", pageError ? `ERROR: ${pageError.message}` : JSON.stringify(page, null, 2));

// Check sections on page 10
const { data: sections, error: sectionsError } = await supabase
  .from("sections")
  .select("*, blocks(*)")
  .eq("page_id", 10);

console.log("\nSections & blocks on page 10:", sectionsError ? `ERROR: ${sectionsError.message}` : JSON.stringify(sections, null, 2));
