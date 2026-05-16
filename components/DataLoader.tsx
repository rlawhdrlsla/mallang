"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/store/app-store";
import { today } from "@/lib/utils";

export function DataLoader({ children }: { children: React.ReactNode }) {
  const { setProfile, setCycle, setExpenses, setWishlistItems, setLoading } = useAppStore();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!user) { router.push("/login"); return; }

        // 프로필
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (!profile) { router.push("/setup"); return; }
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

        if (!cycle) { router.push("/setup"); return; }

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
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[DataLoader] load failed:", msg);
        setError(msg);
        setLoading(false);
      }
    }

    load();
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 gap-4">
        <p className="text-sm font-semibold" style={{ color: "#191919" }}>
          데이터를 불러오지 못했습니다
        </p>
        <p className="text-xs text-center break-all" style={{ color: "#888888" }}>{error}</p>
        <button
          onClick={() => { setError(null); setLoading(true); window.location.reload(); }}
          className="mt-2 px-6 h-11 rounded-xl text-sm font-bold text-white"
          style={{ background: "#FF6B35" }}
        >
          다시 시도
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
