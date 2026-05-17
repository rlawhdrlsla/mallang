import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function DELETE() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 사용자 데이터 모두 삭제
  await supabase.from("expenses").delete().eq("user_id", user.id);
  await supabase.from("wishlist_items").delete().eq("user_id", user.id);
  await supabase.from("cycles").delete().eq("user_id", user.id);
  await supabase.from("profiles").delete().eq("id", user.id);

  // Auth 계정 삭제 (service role key 필요)
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceRoleKey) {
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    await admin.auth.admin.deleteUser(user.id);
  }

  return NextResponse.json({ ok: true });
}
