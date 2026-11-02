import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function verifyAdmin() {
  const supabase = createAdminClient();
  const userClient = await createClient();
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) return null;

  const { data: adminCheck } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  return adminCheck ? user : null;
}

export async function GET() {
  const admin = await verifyAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("api_keys")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ keys: data || [] });
}

export async function POST(req: Request) {
  const admin = await verifyAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { keys } = await req.json();
    if (!keys || !Array.isArray(keys) || keys.length === 0) {
      return NextResponse.json({ error: "An array of keys is required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: existingKeys, error: fetchError } = await supabase
      .from("api_keys")
      .select("key_name, key_value");

    if (fetchError) throw new Error(fetchError.message);

    const existingNames = new Set((existingKeys || []).map((k: any) => k.key_name));
    const existingValues = new Set((existingKeys || []).map((k: any) => k.key_value));

    let skippedNames = 0;
    let skippedValues = 0;
    const keysToInsert: any[] = [];

    for (const k of keys) {
      if (existingValues.has(k.key_value)) {
        skippedValues++;
      } else if (existingNames.has(k.key_name)) {
        skippedNames++;
      } else {
        keysToInsert.push({
          key_name: k.key_name || "Apify Key",
          key_value: k.key_value,
          provider: k.provider || "apify",
          status: "ACTIVE",
          health: 100,
          usage_usd: 0,
          limit_usd: 5.0
        });
        existingNames.add(k.key_name);
        existingValues.add(k.key_value);
      }
    }

    if (keysToInsert.length > 0) {
      const { error: insertError } = await supabase.from("api_keys").insert(keysToInsert);
      if (insertError) throw new Error(insertError.message);
    }

    return NextResponse.json({
      success: true,
      added: keysToInsert.length,
      skippedNames,
      skippedValues
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const admin = await verifyAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { keyIds } = await req.json();
    if (!keyIds || !Array.isArray(keyIds)) {
      return NextResponse.json({ error: "keyIds array required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { error } = await supabase.from("api_keys").delete().in("id", keyIds);
    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true, deleted: keyIds.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

