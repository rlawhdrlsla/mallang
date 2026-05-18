"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/app-store";
import { DataLoader } from "@/components/DataLoader";
import { BottomNav } from "@/components/BottomNav";
import { Card } from "@/components/ui/Card";
import { NumberPad } from "@/components/ui/NumberPad";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { createClient } from "@/lib/supabase/client";
import { formatMarshmallow, today } from "@/lib/utils";
import { MissingDayPolicy } from "@/lib/types";
import { getPreviousCycleSavings } from "@/lib/budget";

function SettingsContent() {
  const { profile, cycle, setProfile, setCycle, setExpenses, setWishlistItems, getDailySummaries, isLoading } = useAppStore();
  const router = useRouter();

  const [editNickname, setEditNickname] = useState(false);
  const [nickname, setNickname] = useState(profile?.nickname ?? "");
  const [editBalance, setEditBalance] = useState(false);
  const [balance, setBalance] = useState("");
  const [editPayday, setEditPayday] = useState(false);
  const [payday, setPayday] = useState(cycle?.next_payday ?? "");
  const [showReset, setShowReset] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [saving, setSaving] = useState(false);

  // Carryover confirmation state
  const [showCarryoverConfirm, setShowCarryoverConfirm] = useState(false);
  const [carryoverSaved, setCarryoverSaved] = useState(0);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="text-sm" style={{ color: "#BBBBBB" }}>불러오는 중...</div></div>;
  }

  async function saveNickname() {
    if (!profile || !nickname.trim()) return;
    setSaving(true);
    const supabase = createClient();
    const { data } = await supabase.from("profiles").update({ nickname }).eq("id", profile.id).select().single();
    if (data) setProfile(data);
    setSaving(false);
    setEditNickname(false);
  }

  async function savePolicy(policy: MissingDayPolicy) {
    if (!profile) return;
    const supabase = createClient();
    const { data } = await supabase.from("profiles").update({ missing_day_policy: policy }).eq("id", profile.id).select().single();
    if (data) setProfile(data);
  }

  async function saveBalance() {
    if (!cycle || !balance) return;
    setSaving(true);
    const supabase = createClient();
    const { data } = await supabase.from("cycles").update({ total_balance: parseInt(balance, 10) }).eq("id", cycle.id).select().single();
    if (data) setCycle(data);
    setSaving(false);
    setEditBalance(false);
    setBalance("");
  }

  async function savePayday() {
    if (!cycle || !payday) return;
    setSaving(true);
    const supabase = createClient();
    const { data } = await supabase.from("cycles").update({ next_payday: payday }).eq("id", cycle.id).select().single();
    if (data) setCycle(data);
    setSaving(false);
    setEditPayday(false);
  }

  async function doNewCycle(withCarryover: boolean) {
    if (!cycle) return;
    const supabase = createClient();
    await supabase.from("cycles").update({ ended_at: today() }).eq("id", cycle.id);
    const amt = withCarryover ? carryoverSaved : 0;
    router.push(`/setup?newcycle=1&carryover=${amt}`);
  }

  function handleNewCycleClick() {
    if (!cycle) return;
    const summaries = getDailySummaries();
    const savedAmount = getPreviousCycleSavings(summaries);
    if (savedAmount <= 0) {
      doNewCycle(false);
    } else {
      setCarryoverSaved(savedAmount);
      setShowCarryoverConfirm(true);
    }
  }

  async function handleResetAll() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("expenses").delete().eq("user_id", user.id);
    await supabase.from("cycles").delete().eq("user_id", user.id);
    await supabase.from("wishlist_items").delete().eq("user_id", user.id);
    await supabase.from("profiles").delete().eq("id", user.id);
    setProfile(null); setCycle(null); setExpenses([]); setWishlistItems([]);
    router.push("/setup");
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  async function handleDeleteAccount() {
    setDeletingAccount(true);
    try {
      const res = await fetch("/api/delete-account", { method: "DELETE" });
      if (res.ok) {
        const supabase = createClient();
        await supabase.auth.signOut();
        setProfile(null); setCycle(null); setExpenses([]); setWishlistItems([]);
        router.push("/login");
      }
    } finally {
      setDeletingAccount(false);
      setShowDeleteAccount(false);
    }
  }

  return (
    <div className="page-fade pb-[80px]">
      <div className="px-5 pt-12 pb-4">
        <h1 className="text-xl font-bold" style={{ color: "#111111" }}>설정</h1>
      </div>

      <div className="px-5 space-y-3">
        {/* 내 정보 */}
        <SectionTitle>내 정보</SectionTitle>
        <Card>
          <SettingRow
            label="닉네임"
            value={profile?.nickname}
            onEdit={() => setEditNickname(true)}
          />
        </Card>

        {/* 미입력 날 처리 */}
        <SectionTitle>기록 설정</SectionTitle>
        <Card>
          <p className="text-sm mb-1" style={{ color: "#111111" }}>며칠 만에 켰을 때 처리 방식</p>
          <p className="text-xs mb-3" style={{ color: "#6B6B6B" }}>안 켠 날의 마쉬멜로를 어떻게 처리할지 정해요</p>
          <div className="flex gap-2">
            {([["full", "다 먹은 걸로"] , ["zero", "참은 걸로"]] as [MissingDayPolicy, string][]).map(([v, label]) => (
              <button
                key={v}
                onClick={() => savePolicy(v)}
                className="flex-1 h-9 rounded-lg text-sm font-semibold"
                style={{
                  background: profile?.missing_day_policy === v ? "#111111" : "#F0EEE8",
                  color: profile?.missing_day_policy === v ? "#FFFFFF" : "#6B6B6B",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </Card>

        {/* 봉지 설정 */}
        <SectionTitle>봉지 설정</SectionTitle>
        <Card>
          <SettingRow
            label="봉지 속 마쉬멜로"
            value={cycle ? formatMarshmallow(cycle.total_balance) : "-"}
            onEdit={() => setEditBalance(true)}
          />
          <Divider />
          <SettingRow
            label="마쉬멜로 받는 날"
            value={cycle?.next_payday ?? "-"}
            onEdit={() => setEditPayday(true)}
          />
          {cycle && cycle.carried_over_amount > 0 && (
            <>
              <Divider />
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: "#6B6B6B" }}>지난 봉지 이월 마쉬멜로</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold" style={{ color: "#059669" }}>
                    +{formatMarshmallow(cycle.carried_over_amount)}
                  </span>
                  <button
                    onClick={async () => {
                      const supabase = createClient();
                      const { data } = await supabase
                        .from("cycles")
                        .update({ carried_over_amount: 0 })
                        .eq("id", cycle.id)
                        .select()
                        .single();
                      if (data) setCycle(data);
                    }}
                    className="text-xs font-semibold px-2 py-1 rounded-lg"
                    style={{ background: "#FEF2F2", color: "#DC2626" }}
                  >
                    해제
                  </button>
                </div>
              </div>
            </>
          )}
        </Card>

        {/* 봉지 관리 */}
        <SectionTitle>봉지 관리</SectionTitle>
        <Card>
          <button
            onClick={handleNewCycleClick}
            className="w-full text-left text-sm font-semibold py-1"
            style={{ color: "#111111" }}
          >
            새 봉지 시작
          </button>
        </Card>

        {/* 앱 정보 */}
        <SectionTitle>앱 정보</SectionTitle>
        <Card>
          <SettingRow label="버전" value="1.0.0" />
          <Divider />
          <button
            onClick={handleLogout}
            className="w-full text-left text-sm font-semibold py-1 mt-1"
            style={{ color: "#6B6B6B" }}
          >
            로그아웃
          </button>
          <Divider />
          <button
            onClick={() => setShowReset(true)}
            className="w-full text-left text-sm font-semibold py-1 mt-1"
            style={{ color: "#DC2626" }}
          >
            데이터 전체 초기화
          </button>
          <Divider />
          <button
            onClick={() => setShowDeleteAccount(true)}
            className="w-full text-left text-sm font-semibold py-1 mt-1"
            style={{ color: "#DC2626" }}
          >
            회원 탈퇴
          </button>
        </Card>
      </div>

      {/* 닉네임 편집 */}
      <BottomSheet open={editNickname} onClose={() => setEditNickname(false)} title="닉네임 변경">
        <div className="px-4 py-4 space-y-4">
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={10}
            className="w-full h-11 px-4 rounded-xl text-sm outline-none"
            style={{ background: "#F0EEE8" }}
          />
          <button
            onClick={saveNickname}
            disabled={saving}
            className="w-full h-[54px] rounded-xl text-base font-bold text-white"
            style={{ background: "#111111" }}
          >
            저장
          </button>
        </div>
      </BottomSheet>

      {/* 잔액 편집 */}
      <BottomSheet open={editBalance} onClose={() => { setEditBalance(false); setBalance(""); }} title="봉지 속 마쉬멜로 수정">
        <div className="px-4 pt-4">
          <div className="text-[32px] font-extrabold text-right" style={{ color: balance ? "#111111" : "#BBBBBB" }}>
            {balance ? formatMarshmallow(parseInt(balance, 10)) : "0개"}
          </div>
        </div>
        <NumberPad value={balance} onChange={setBalance} />
        <div className="px-4 pb-6">
          <button onClick={saveBalance} disabled={!balance || saving} className="w-full h-[54px] rounded-xl text-base font-bold text-white" style={{ background: balance ? "#111111" : "#BBBBBB" }}>저장</button>
        </div>
      </BottomSheet>

      {/* 월급일 편집 */}
      <BottomSheet open={editPayday} onClose={() => setEditPayday(false)} title="마쉬멜로 받는 날 변경">
        <div className="px-4 py-4 space-y-4">
          <input type="date" value={payday} onChange={(e) => setPayday(e.target.value)} className="w-full h-11 px-4 rounded-xl text-sm outline-none" style={{ background: "#F0EEE8", color: "#111111" }} />
          <button onClick={savePayday} disabled={saving} className="w-full h-[54px] rounded-xl text-base font-bold text-white" style={{ background: "#111111" }}>저장</button>
        </div>
      </BottomSheet>

      {/* 초기화 확인 */}
      <BottomSheet open={showReset} onClose={() => setShowReset(false)} title="데이터 초기화">
        <div className="px-4 py-6 space-y-4">
          <p className="text-sm" style={{ color: "#6B6B6B" }}>모든 데이터가 삭제됩니다. 이 작업은 되돌릴 수 없어요.</p>
          <button onClick={handleResetAll} className="w-full h-[54px] rounded-xl text-base font-bold text-white" style={{ background: "#DC2626" }}>
            전체 삭제
          </button>
          <button onClick={() => setShowReset(false)} className="w-full h-[54px] rounded-xl text-base font-bold" style={{ background: "#F0EEE8", color: "#111111" }}>
            취소
          </button>
        </div>
      </BottomSheet>

      {/* 회원 탈퇴 확인 */}
      <BottomSheet open={showDeleteAccount} onClose={() => setShowDeleteAccount(false)} title="회원 탈퇴">
        <div className="px-4 py-6 space-y-4">
          <p className="text-sm" style={{ color: "#6B6B6B" }}>
            계정과 모든 데이터가 영구 삭제됩니다. 이 작업은 되돌릴 수 없어요.
          </p>
          <button
            onClick={handleDeleteAccount}
            disabled={deletingAccount}
            className="w-full h-[54px] rounded-xl text-base font-bold text-white"
            style={{ background: deletingAccount ? "#BBBBBB" : "#DC2626" }}
          >
            {deletingAccount ? "처리 중..." : "탈퇴하기"}
          </button>
          <button
            onClick={() => setShowDeleteAccount(false)}
            className="w-full h-[54px] rounded-xl text-base font-bold"
            style={{ background: "#F0EEE8", color: "#111111" }}
          >
            취소
          </button>
        </div>
      </BottomSheet>

      {/* 새 봉지 이월 확인 */}
      <BottomSheet open={showCarryoverConfirm} onClose={() => setShowCarryoverConfirm(false)} title="지난 봉지 이월">
        <div className="px-4 py-6 space-y-4">
          <p className="text-base font-semibold text-center" style={{ color: "#111111" }}>
            지난 봉지에서 구운 {formatMarshmallow(carryoverSaved)}를 새 봉지에 추가할까요?
          </p>
          <button
            onClick={() => { setShowCarryoverConfirm(false); doNewCycle(true); }}
            className="w-full h-[54px] rounded-xl text-base font-bold text-white"
            style={{ background: "#111111" }}
          >
            추가하기
          </button>
          <button
            onClick={() => { setShowCarryoverConfirm(false); doNewCycle(false); }}
            className="w-full h-[54px] rounded-xl text-base font-bold"
            style={{ background: "#F0EEE8", color: "#6B6B6B" }}
          >
            건너뛰기
          </button>
        </div>
      </BottomSheet>

      <BottomNav />
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold px-1 pt-2" style={{ color: "#6B6B6B" }}>{children}</p>;
}

function Divider() {
  return <div className="my-3" style={{ borderTop: "1px solid #E8E6DF" }} />;
}

function SettingRow({ label, value, onEdit }: { label: string; value?: string; onEdit?: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm" style={{ color: "#6B6B6B" }}>{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold" style={{ color: "#111111" }}>{value}</span>
        {onEdit && (
          <button onClick={onEdit} className="text-xs font-semibold" style={{ color: "#111111" }}>수정</button>
        )}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <DataLoader>
      <SettingsContent />
    </DataLoader>
  );
}
