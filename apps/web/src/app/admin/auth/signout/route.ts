import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@repo/lib/supabase/server";

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);
  
  // Sign out the user (clears session)
  await supabase.auth.signOut();
  
  // Get current host to maintain subdomain context
  const headersList = await headers();
  const host = headersList.get("host") || "localhost:3000";
  const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
  
  // Redirect to login on same domain
  return NextResponse.redirect(new URL("/admin/login", `${protocol}://${host}`));
}

