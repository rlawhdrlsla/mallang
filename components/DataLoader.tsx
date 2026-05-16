"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/store/app-store";
import { today } from "@/lib/utils";

export function DataLoader({ children }: { children: React.ReactNode }) {
  const { setProfile, setCycle, setExpenses, setWishlistItems, setLoading } = useAppStore();
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      // 프로필
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (!profile) { router.push("/setup"); setLoading(false); return; }
      setProfile(profile);

      // 현재 사이클 (ended_at 없는 가장 최근)
      const { data: cycle } = await supabase
        .from("cycles")
        .select("*")
        .eq("user_id", user.id)
        .is("ended_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!cycle) { router.push("/setup"); setLoading(false); return; }

      // last_active_date 업데이트
      const todayStr = today();
      if (cycle.last_active_date !== todayStr) {
        await supabase
          .from("cycles")
          .update({ last_active_date: todayStr })
          .eq("id", cycle.id);
        cycle.last_active_date = todayStr;
      }
      setCycle(cycle);

      // 지출 내역
      const { data: expenses } = await supabase
        .from("expenses")
        .select("*")
        .eq("cycle_id", cycle.id)
        .order("created_at", { ascending: false });

      setExpenses(expenses ?? []);

      // 위시리스트
      const { data: wishlist } = await supabase
        .from("wishlist_items")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setWishlistItems(wishlist ?? []);
      setLoading(false);
    }

    load();
  }, []);

  return <>{children}</>;
}
