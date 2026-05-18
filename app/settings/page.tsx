"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/app-store";
import { DataLoader } from "@/components/DataLoader";
import { BottomNav } from "@/components/BottomNav";
import { NumberPad } from "@/components/ui/NumberPad";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { createClient } from "@/lib/supabase/client";
import { formatMarshmallow, today } from "@/lib/utils";
import { MissingDayPolicy } from "@/lib/types";
import { getPreviousCycleSavings } from "@/lib/budget";

const CREAM = "#F8F7F4";
const PINK = "#E06090";

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

  const [showCarryoverConfirm, setShowCarryoverConfirm] = useState(false);
  const [carryoverSaved, setCarryoverSaved] = useState(0);

  if (isLoading) {
    return (
      <div style={{ background: CREAM, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "#BBBBBB", fontSize: 14 }}>불러오는 중...</span>
      </div>
    );
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
    <div className="page-fade" style={{ background: CREAM, minHeight: "100vh", paddingBottom: 100 }}>

      {/* 헤더 */}
      <div style={{ padding: "52px 20px 28px" }}>
        <p style={{ color: "#111111", fontWeight: 900, fontSize: 26 }}>Settings</p>
        {profile?.nickname && (
          <p style={{ color: "#888888", fontSize: 13, marginTop: 2 }}>{profile.nickname}님의 말랑이</p>
        )}
      </div>

      <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: 8 }}>

        {/* 내 정보 */}
        <SectionLabel>내 정보</SectionLabel>
        <SettingCard>
          <SettingRow
            label="닉네임"
            value={profile?.nickname}
            onEdit={() => { setNickname(profile?.nickname ?? ""); setEditNickname(true); }}
          />
        </SettingCard>

        {/* 봉지 설정 */}
        <SectionLabel>봉지 설정</SectionLabel>
        <SettingCard>
          <SettingRow
            label="봉지 속 마쉬멜로"
            value={cycle ? formatMarshmallow(cycle.total_balance) : "-"}
            onEdit={() => setEditBalance(true)}
          />
          <Divider />
          <SettingRow
            label="마쉬멜로 받는 날"
            value={cycle?.next_payday ?? "-"}
            onEdit={() => { setPayday(cycle?.next_payday ?? ""); setEditPayday(true); }}
          />
          {cycle && cycle.carried_over_amount > 0 && (
            <>
              <Divider />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ color: "#6B6B6B", fontSize: 14 }}>지난 봉지 이월</span>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ color: "#059669", fontWeight: 700, fontSize: 14 }}>
                    +{formatMarshmallow(cycle.carried_over_amount)}
                  </span>
                  <button
                    onClick={async () => {
                      const supabase = createClient();
                      const { data } = await supabase
                        .from("cycles")
                        .update({ carried_over_amount: 0 })
                        .eq("id", cycle.id)
                        .select().single();
                      if (data) setCycle(data);
                    }}
                    style={{ fontSize: 12, fontWeight: 700, padding: "3px 8px", borderRadius: 8, background: "#FEF2F2", color: "#DC2626", border: "none" }}
                  >
                    해제
                  </button>
                </div>
              </div>
            </>
          )}
        </SettingCard>

        {/* 기록 설정 */}
        <SectionLabel>기록 설정</SectionLabel>
        <SettingCard>
          <p style={{ color: "#111111", fontSize: 14, fontWeight: 600, marginBottom: 4 }}>며칠 만에 켰을 때</p>
          <p style={{ color: "#888888", fontSize: 12, marginBottom: 14 }}>안 켠 날의 마쉬멜로를 어떻게 처리할지 정해요</p>
          <div style={{ display: "flex", gap: 8 }}>
            {([["full", "다 먹은 걸로"], ["zero", "참은 걸로"]] as [MissingDayPolicy, string][]).map(([v, label]) => (
              <button
                key={v}
                onClick={() => savePolicy(v)}
                style={{
                  flex: 1, height: 40, borderRadius: 10, fontSize: 13, fontWeight: 600, border: "none",
                  background: profile?.missing_day_policy === v ? "#111111" : "#F0EEE8",
                  color: profile?.missing_day_policy === v ? "#FFFFFF" : "#6B6B6B",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </SettingCard>

        {/* 봉지 관리 */}
        <SectionLabel>봉지 관리</SectionLabel>
        <SettingCard>
          <button
            onClick={handleNewCycleClick}
            style={{ width: "100%", textAlign: "left", fontSize: 14, fontWeight: 600, color: "#111111", background: "none", border: "none", padding: "4px 0" }}
          >
            새 봉지 시작 →
          </button>
        </SettingCard>

        {/* 계정 */}
        <SectionLabel>계정</SectionLabel>
        <SettingCard>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#6B6B6B", fontSize: 14 }}>버전</span>
            <span style={{ color: "#BBBBBB", fontSize: 14 }}>1.0.0</span>
          </div>
          <Divider />
          <button
            onClick={handleLogout}
            style={{ width: "100%", textAlign: "left", fontSize: 14, fontWeight: 600, color: "#6B6B6B", background: "none", border: "none", padding: "4px 0" }}
          >
            로그아웃
          </button>
          <Divider />
          <button
            onClick={() => setShowReset(true)}
            style={{ width: "100%", textAlign: "left", fontSize: 14, fontWeight: 600, color: "#DC2626", background: "none", border: "none", padding: "4px 0" }}
          >
            데이터 전체 초기화
          </button>
          <Divider />
          <button
            onClick={() => setShowDeleteAccount(true)}
            style={{ width: "100%", textAlign: "left", fontSize: 14, fontWeight: 600, color: "#DC2626", background: "none", border: "none", padding: "4px 0" }}
          >
            회원 탈퇴
          </button>
        </SettingCard>
      </div>

      {/* ──── 닉네임 편집 ──── */}
      <BottomSheet open={editNickname} onClose={() => setEditNickname(false)} title="닉네임 변경">
        <div style={{ padding: "12px 20px 32px", display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={10}
            style={{ width: "100%", height: 44, padding: "0 14px", borderRadius: 12, fontSize: 14, background: "#F0EEE8", border: "none", outline: "none", color: "#111111" }}
          />
          <button
            onClick={saveNickname}
            disabled={saving}
            style={{ width: "100%", height: 54, borderRadius: 14, fontSize: 15, fontWeight: 700, background: "#111111", color: "#FFFFFF", border: "none" }}
          >
            저장
          </button>
        </div>
      </BottomSheet>

      {/* ──── 잔액 편집 ──── */}
      <BottomSheet open={editBalance} onClose={() => { setEditBalance(false); setBalance(""); }} title="봉지 속 마쉬멜로 수정">
        <div style={{ padding: "12px 20px 4px" }}>
          <div style={{ fontSize: 30, fontWeight: 900, textAlign: "right", color: balance ? "#111111" : "#BBBBBB" }}>
            {balance ? formatMarshmallow(parseInt(balance, 10)) : "0개"}
          </div>
        </div>
        <NumberPad value={balance} onChange={setBalance} />
        <div style={{ padding: "0 20px 32px" }}>
          <button
            onClick={saveBalance}
            disabled={!balance || saving}
            style={{ width: "100%", height: 54, borderRadius: 14, fontSize: 15, fontWeight: 700, background: balance ? "#111111" : "#BBBBBB", color: "#FFFFFF", border: "none" }}
          >
            저장
          </button>
        </div>
      </BottomSheet>

      {/* ──── 월급일 편집 ──── */}
      <BottomSheet open={editPayday} onClose={() => setEditPayday(false)} title="마쉬멜로 받는 날 변경">
        <div style={{ padding: "12px 20px 32px", display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            type="date"
            value={payday}
            onChange={(e) => setPayday(e.target.value)}
            style={{ width: "100%", height: 44, padding: "0 14px", borderRadius: 12, fontSize: 14, background: "#F0EEE8", border: "none", outline: "none", color: "#111111" }}
          />
          <button
            onClick={savePayday}
            disabled={saving}
            style={{ width: "100%", height: 54, borderRadius: 14, fontSize: 15, fontWeight: 700, background: "#111111", color: "#FFFFFF", border: "none" }}
          >
            저장
          </button>
        </div>
      </BottomSheet>

      {/* ──── 초기화 확인 ──── */}
      <BottomSheet open={showReset} onClose={() => setShowReset(false)} title="데이터 초기화">
        <div style={{ padding: "12px 20px 32px", display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ color: "#6B6B6B", fontSize: 14, textAlign: "center" }}>
            모든 데이터가 삭제됩니다.<br />이 작업은 되돌릴 수 없어요.
          </p>
          <button onClick={handleResetAll} style={{ width: "100%", height: 54, borderRadius: 14, fontSize: 15, fontWeight: 700, background: "#DC2626", color: "#FFFFFF", border: "none" }}>
            전체 삭제
          </button>
          <button onClick={() => setShowReset(false)} style={{ width: "100%", height: 54, borderRadius: 14, fontSize: 15, fontWeight: 700, background: "#F0EEE8", color: "#111111", border: "none" }}>
            취소
          </button>
        </div>
      </BottomSheet>

      {/* ──── 회원 탈퇴 확인 ──── */}
      <BottomSheet open={showDeleteAccount} onClose={() => setShowDeleteAccount(false)} title="회원 탈퇴">
        <div style={{ padding: "12px 20px 32px", display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ color: "#6B6B6B", fontSize: 14, textAlign: "center" }}>
            계정과 모든 데이터가 영구 삭제됩니다.<br />이 작업은 되돌릴 수 없어요.
          </p>
          <button
            onClick={handleDeleteAccount}
            disabled={deletingAccount}
            style={{ width: "100%", height: 54, borderRadius: 14, fontSize: 15, fontWeight: 700, background: deletingAccount ? "#BBBBBB" : "#DC2626", color: "#FFFFFF", border: "none" }}
          >
            {deletingAccount ? "처리 중..." : "탈퇴하기"}
          </button>
          <button
            onClick={() => setShowDeleteAccount(false)}
            style={{ width: "100%", height: 54, borderRadius: 14, fontSize: 15, fontWeight: 700, background: "#F0EEE8", color: "#111111", border: "none" }}
          >
            취소
          </button>
        </div>
      </BottomSheet>

      {/* ──── 새 봉지 이월 확인 ──── */}
      <BottomSheet open={showCarryoverConfirm} onClose={() => setShowCarryoverConfirm(false)} title="지난 봉지 이월">
        <div style={{ padding: "12px 20px 32px", display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ color: "#111111", fontSize: 15, fontWeight: 600, textAlign: "center", lineHeight: 1.6 }}>
            지난 봉지에서 구운<br />
            <span style={{ color: PINK, fontWeight: 900 }}>{formatMarshmallow(carryoverSaved)}</span>를<br />
            새 봉지에 추가할까요?
          </p>
          <button
            onClick={() => { setShowCarryoverConfirm(false); doNewCycle(true); }}
            style={{ width: "100%", height: 54, borderRadius: 14, fontSize: 15, fontWeight: 700, background: "#111111", color: "#FFFFFF", border: "none" }}
          >
            추가하기
          </button>
          <button
            onClick={() => { setShowCarryoverConfirm(false); doNewCycle(false); }}
            style={{ width: "100%", height: 54, borderRadius: 14, fontSize: 15, fontWeight: 700, background: "#F0EEE8", color: "#6B6B6B", border: "none" }}
          >
            건너뛰기
          </button>
        </div>
      </BottomSheet>

      <BottomNav />
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ color: "#888888", fontSize: 12, fontWeight: 700, marginTop: 8, marginBottom: 4, paddingLeft: 2 }}>
      {children}
    </p>
  );
}

function Divider() {
  return <div style={{ borderTop: "1px solid #F0EEE8", margin: "12px 0" }} />;
}

function SettingCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "#FFFFFF", borderRadius: 18, padding: "16px 18px" }}>
      {children}
    </div>
  );
}

function SettingRow({ label, value, onEdit }: { label: string; value?: string; onEdit?: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <span style={{ color: "#6B6B6B", fontSize: 14 }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ color: "#111111", fontWeight: 600, fontSize: 14 }}>{value}</span>
        {onEdit && (
          <button onClick={onEdit} style={{ fontSize: 12, fontWeight: 700, color: "#888888", background: "none", border: "none" }}>
            수정
          </button>
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
