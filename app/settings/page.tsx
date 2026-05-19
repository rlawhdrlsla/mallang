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
import { useCycleSummary } from "@/lib/hooks";

function ProfileContent() {
  const { profile, cycle, setProfile, setCycle, setExpenses, setWishlistItems, getDailySummaries, isLoading } = useAppStore();
  const router = useRouter();

  const { totalSaved, elapsedDays, totalDays } = useCycleSummary();

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
      <div style={{ background: "var(--bg)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "var(--text3)", fontSize: 14 }}>불러오는 중...</span>
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

  const cycleProgress = totalDays > 0 ? Math.min(Math.round((elapsedDays / totalDays) * 100), 100) : 0;

  return (
    <div className="page-fade" style={{ background: "var(--bg)", minHeight: "100vh", paddingBottom: 100 }}>

      {/* 프로필 헤더 */}
      <div style={{ padding: "52px 20px 24px" }}>
        {/* 아바타 */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            background: "var(--burg-light)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 28,
            border: "2px solid var(--border)",
          }}>
            ☁️
          </div>
          <div>
            <p style={{ color: "var(--text)", fontWeight: 800, fontSize: 20 }}>
              {profile?.nickname ?? "말랑이"}
            </p>
            <button
              onClick={() => { setNickname(profile?.nickname ?? ""); setEditNickname(true); }}
              style={{ color: "var(--text2)", fontSize: 12, background: "none", border: "none", padding: 0, marginTop: 2 }}
            >
              닉네임 변경 →
            </button>
          </div>
        </div>

        {/* 봉지 진행 카드 */}
        {cycle && (
          <div style={{
            background: "var(--card)", borderRadius: 20, padding: "18px 20px",
            boxShadow: "0 2px 12px var(--shadow)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <div>
                <p style={{ color: "var(--text2)", fontSize: 11, marginBottom: 4 }}>이번 봉지 구운 마쉬멜로</p>
                <p style={{ color: "var(--burg)", fontWeight: 900, fontSize: 22 }}>{formatMarshmallow(totalSaved)}</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ color: "var(--text2)", fontSize: 11, marginBottom: 4 }}>진행</p>
                <p style={{ color: "var(--text)", fontWeight: 700, fontSize: 16 }}>{elapsedDays} / {totalDays}일</p>
              </div>
            </div>
            <div style={{ height: 6, borderRadius: 99, background: "var(--burg-light)" }}>
              <div style={{
                height: 6, borderRadius: 99,
                width: `${cycleProgress}%`,
                background: "var(--burg)",
                transition: "width 400ms ease",
              }} />
            </div>
            <p style={{ color: "var(--text3)", fontSize: 11, marginTop: 6, textAlign: "right" }}>
              마쉬멜로 받는 날: {cycle.next_payday}
            </p>
          </div>
        )}
      </div>

      <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: 8 }}>

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
                <span style={{ color: "var(--text2)", fontSize: 14 }}>지난 봉지 이월</span>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ color: "var(--green)", fontWeight: 700, fontSize: 14 }}>
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
                    style={{ fontSize: 12, fontWeight: 700, padding: "3px 8px", borderRadius: 8, background: "var(--pink-light)", color: "var(--pink)", border: "none" }}
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
          <p style={{ color: "var(--text)", fontSize: 14, fontWeight: 600, marginBottom: 4 }}>며칠 만에 켰을 때</p>
          <p style={{ color: "var(--text2)", fontSize: 12, marginBottom: 14 }}>안 켠 날의 마쉬멜로를 어떻게 처리할지 정해요</p>
          <div style={{ display: "flex", gap: 8 }}>
            {([["full", "다 먹은 걸로"], ["zero", "참은 걸로"]] as [MissingDayPolicy, string][]).map(([v, label]) => (
              <button
                key={v}
                onClick={() => savePolicy(v)}
                style={{
                  flex: 1, height: 40, borderRadius: 10, fontSize: 13, fontWeight: 600, border: "none",
                  background: profile?.missing_day_policy === v ? "var(--burg)" : "var(--burg-light)",
                  color: profile?.missing_day_policy === v ? "#FFFFFF" : "var(--text2)",
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
            style={{ width: "100%", textAlign: "left", fontSize: 14, fontWeight: 600, color: "var(--burg)", background: "none", border: "none", padding: "4px 0" }}
          >
            새 봉지 시작 →
          </button>
        </SettingCard>

        {/* 계정 */}
        <SectionLabel>계정</SectionLabel>
        <SettingCard>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "var(--text2)", fontSize: 14 }}>버전</span>
            <span style={{ color: "var(--text3)", fontSize: 14 }}>1.0.0</span>
          </div>
          <Divider />
          <button
            onClick={handleLogout}
            style={{ width: "100%", textAlign: "left", fontSize: 14, fontWeight: 600, color: "var(--text2)", background: "none", border: "none", padding: "4px 0" }}
          >
            로그아웃
          </button>
          <Divider />
          <button
            onClick={() => setShowReset(true)}
            style={{ width: "100%", textAlign: "left", fontSize: 14, fontWeight: 600, color: "var(--pink)", background: "none", border: "none", padding: "4px 0" }}
          >
            데이터 전체 초기화
          </button>
          <Divider />
          <button
            onClick={() => setShowDeleteAccount(true)}
            style={{ width: "100%", textAlign: "left", fontSize: 14, fontWeight: 600, color: "var(--pink)", background: "none", border: "none", padding: "4px 0" }}
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
            style={{ width: "100%", height: 44, padding: "0 14px", borderRadius: 12, fontSize: 14, background: "var(--burg-light)", border: "1px solid var(--border)", outline: "none", color: "var(--text)" }}
          />
          <button
            onClick={saveNickname}
            disabled={saving}
            style={{ width: "100%", height: 54, borderRadius: 14, fontSize: 15, fontWeight: 700, background: "var(--burg)", color: "#FFFFFF", border: "none" }}
          >
            저장
          </button>
        </div>
      </BottomSheet>

      {/* ──── 잔액 편집 ──── */}
      <BottomSheet open={editBalance} onClose={() => { setEditBalance(false); setBalance(""); }} title="봉지 속 마쉬멜로 수정">
        <div style={{ padding: "12px 20px 4px" }}>
          <div style={{ fontSize: 30, fontWeight: 900, textAlign: "right", color: balance ? "var(--burg)" : "var(--text3)" }}>
            {balance ? formatMarshmallow(parseInt(balance, 10)) : "0개"}
          </div>
        </div>
        <NumberPad value={balance} onChange={setBalance} />
        <div style={{ padding: "0 20px 32px" }}>
          <button
            onClick={saveBalance}
            disabled={!balance || saving}
            style={{ width: "100%", height: 54, borderRadius: 14, fontSize: 15, fontWeight: 700, background: balance ? "var(--burg)" : "var(--text3)", color: "#FFFFFF", border: "none" }}
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
            style={{ width: "100%", height: 44, padding: "0 14px", borderRadius: 12, fontSize: 14, background: "var(--burg-light)", border: "1px solid var(--border)", outline: "none", color: "var(--text)" }}
          />
          <button
            onClick={savePayday}
            disabled={saving}
            style={{ width: "100%", height: 54, borderRadius: 14, fontSize: 15, fontWeight: 700, background: "var(--burg)", color: "#FFFFFF", border: "none" }}
          >
            저장
          </button>
        </div>
      </BottomSheet>

      {/* ──── 초기화 확인 ──── */}
      <BottomSheet open={showReset} onClose={() => setShowReset(false)} title="데이터 초기화">
        <div style={{ padding: "12px 20px 32px", display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ color: "var(--text2)", fontSize: 14, textAlign: "center" }}>
            모든 데이터가 삭제됩니다.<br />이 작업은 되돌릴 수 없어요.
          </p>
          <button onClick={handleResetAll} style={{ width: "100%", height: 54, borderRadius: 14, fontSize: 15, fontWeight: 700, background: "var(--pink)", color: "#FFFFFF", border: "none" }}>
            전체 삭제
          </button>
          <button onClick={() => setShowReset(false)} style={{ width: "100%", height: 54, borderRadius: 14, fontSize: 15, fontWeight: 700, background: "var(--burg-light)", color: "var(--text)", border: "none" }}>
            취소
          </button>
        </div>
      </BottomSheet>

      {/* ──── 회원 탈퇴 확인 ──── */}
      <BottomSheet open={showDeleteAccount} onClose={() => setShowDeleteAccount(false)} title="회원 탈퇴">
        <div style={{ padding: "12px 20px 32px", display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ color: "var(--text2)", fontSize: 14, textAlign: "center" }}>
            계정과 모든 데이터가 영구 삭제됩니다.<br />이 작업은 되돌릴 수 없어요.
          </p>
          <button
            onClick={handleDeleteAccount}
            disabled={deletingAccount}
            style={{ width: "100%", height: 54, borderRadius: 14, fontSize: 15, fontWeight: 700, background: deletingAccount ? "var(--text3)" : "var(--pink)", color: "#FFFFFF", border: "none" }}
          >
            {deletingAccount ? "처리 중..." : "탈퇴하기"}
          </button>
          <button
            onClick={() => setShowDeleteAccount(false)}
            style={{ width: "100%", height: 54, borderRadius: 14, fontSize: 15, fontWeight: 700, background: "var(--burg-light)", color: "var(--text)", border: "none" }}
          >
            취소
          </button>
        </div>
      </BottomSheet>

      {/* ──── 새 봉지 이월 확인 ──── */}
      <BottomSheet open={showCarryoverConfirm} onClose={() => setShowCarryoverConfirm(false)} title="지난 봉지 이월">
        <div style={{ padding: "12px 20px 32px", display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ color: "var(--text)", fontSize: 15, fontWeight: 600, textAlign: "center", lineHeight: 1.6 }}>
            지난 봉지에서 구운<br />
            <span style={{ color: "var(--burg)", fontWeight: 900 }}>{formatMarshmallow(carryoverSaved)}</span>를<br />
            새 봉지에 추가할까요?
          </p>
          <button
            onClick={() => { setShowCarryoverConfirm(false); doNewCycle(true); }}
            style={{ width: "100%", height: 54, borderRadius: 14, fontSize: 15, fontWeight: 700, background: "var(--burg)", color: "#FFFFFF", border: "none" }}
          >
            추가하기
          </button>
          <button
            onClick={() => { setShowCarryoverConfirm(false); doNewCycle(false); }}
            style={{ width: "100%", height: 54, borderRadius: 14, fontSize: 15, fontWeight: 700, background: "var(--burg-light)", color: "var(--text2)", border: "none" }}
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
    <p style={{ color: "var(--text2)", fontSize: 12, fontWeight: 700, marginTop: 8, marginBottom: 4, paddingLeft: 2 }}>
      {children}
    </p>
  );
}

function Divider() {
  return <div style={{ borderTop: "1px solid var(--border)", margin: "12px 0" }} />;
}

function SettingCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--card)", borderRadius: 18, padding: "16px 18px", boxShadow: "0 2px 8px var(--shadow)" }}>
      {children}
    </div>
  );
}

function SettingRow({ label, value, onEdit }: { label: string; value?: string; onEdit?: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <span style={{ color: "var(--text2)", fontSize: 14 }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ color: "var(--text)", fontWeight: 600, fontSize: 14 }}>{value}</span>
        {onEdit && (
          <button onClick={onEdit} style={{ fontSize: 12, fontWeight: 700, color: "var(--burg)", background: "none", border: "none" }}>
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
      <ProfileContent />
    </DataLoader>
  );
}
