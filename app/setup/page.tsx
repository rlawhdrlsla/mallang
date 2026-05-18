"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { NumberPad } from "@/components/ui/NumberPad";
import { formatMarshmallow, today, diffDays } from "@/lib/utils";
import { MissingDayPolicy } from "@/lib/types";
import { useAppStore } from "@/store/app-store";
import { Suspense } from "react";

const TOTAL_STEPS = 4;

function SetupForm() {
  const searchParams = useSearchParams();
  const carryoverAmount = parseInt(searchParams.get("carryover") ?? "0", 10);
  const isNewCycle = searchParams.get("newcycle") === "1";

  const [step, setStep] = useState(isNewCycle ? 2 : 1);
  const [nickname, setNickname] = useState("");
  const [balance, setBalance] = useState("");
  const [payday, setPayday] = useState("");
  const [hasFixed, setHasFixed] = useState<boolean | null>(null);
  const [fixedExp, setFixedExp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  const router = useRouter();
  const { setProfile, setCycle } = useAppStore();

  const todayStr = today();
  const daysLeft = payday ? diffDays(todayStr, payday) : null;

  async function handleComplete() {
    if (submitting) return;
    setSubmitting(true);
    setSetupError(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSubmitting(false); return; }

    const fixed = hasFixed && fixedExp ? parseInt(fixedExp, 10) : 0;

    let profile = null;
    if (isNewCycle) {
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      profile = data;
    } else {
      const { data, error } = await supabase
        .from("profiles")
        .upsert({ id: user.id, nickname, gender: "male", missing_day_policy: "full" as MissingDayPolicy })
        .select()
        .single();
      if (error) {
        setSetupError("프로필 저장 실패: " + error.message);
        setSubmitting(false);
        return;
      }
      profile = data;
    }

    if (!profile) {
      setSetupError("프로필을 불러오지 못했어요. 다시 시도해주세요.");
      setSubmitting(false);
      return;
    }

    const { data: cycle, error: cycleError } = await supabase
      .from("cycles")
      .insert({
        user_id: user.id,
        total_balance: parseInt(balance, 10),
        fixed_expenses: fixed,
        start_date: todayStr,
        next_payday: payday,
        carried_over_amount: carryoverAmount,
        last_active_date: todayStr,
      })
      .select()
      .single();

    if (cycleError) {
      setSetupError("예산 저장 실패: " + cycleError.message);
      setSubmitting(false);
      return;
    }

    setProfile(profile);
    if (cycle) setCycle(cycle);
    router.push("/");
  }

  function next() { if (step < TOTAL_STEPS) setStep(step + 1); else handleComplete(); }
  function prev() { if (step > 1) setStep(step - 1); }

  const canNext = (
    (step === 1 && nickname.trim()) ||
    (step === 2 && balance && parseInt(balance) > 0) ||
    (step === 3 && payday && daysLeft !== null && daysLeft > 0) ||
    (step === 4 && (hasFixed === false || (hasFixed === true && fixedExp)))
  );

  return (
    <div className="min-h-screen flex flex-col px-5 pt-12 pb-8 page-fade">
      <div className="flex gap-2 mb-10">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full transition-colors duration-300"
            style={{ background: i < step ? "#111111" : "#E8E6DF" }}
          />
        ))}
      </div>

      <div className="flex-1">
        {step === 1 && <Step1 nickname={nickname} setNickname={setNickname} />}
        {step === 2 && <Step2 balance={balance} setBalance={setBalance} />}
        {step === 3 && <Step3 payday={payday} setPayday={setPayday} daysLeft={daysLeft} />}
        {step === 4 && (
          <Step4
            hasFixed={hasFixed} setHasFixed={setHasFixed}
            fixedExp={fixedExp} setFixedExp={setFixedExp}
          />
        )}
      </div>

      {setupError && (
        <p className="text-xs text-center mb-3" style={{ color: "#DC2626" }}>{setupError}</p>
      )}

      <div className="flex gap-3 mt-8">
        {step > 1 && (
          <button
            onClick={prev}
            className="h-[54px] px-6 rounded-xl text-base font-bold btn-press"
            style={{ background: "#F0EEE8", color: "#111111" }}
          >
            이전
          </button>
        )}
        <button
          onClick={next}
          disabled={!canNext || submitting}
          className="flex-1 h-[54px] rounded-xl text-base font-bold text-white btn-press"
          style={{ background: canNext && !submitting ? "#111111" : "#BBBBBB" }}
        >
          {step === TOTAL_STEPS ? (submitting ? "설정 중..." : "시작하기") : "다음"}
        </button>
      </div>
    </div>
  );
}

function Step1({ nickname, setNickname }: {
  nickname: string; setNickname: (v: string) => void;
}) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold" style={{ color: "#111111" }}>반가워요!</h2>
        <p className="text-sm mt-1" style={{ color: "#6B6B6B" }}>어떻게 불러드릴까요?</p>
      </div>
      <input
        type="text"
        placeholder="닉네임을 입력하세요"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        maxLength={10}
        className="w-full h-14 px-4 rounded-xl text-base outline-none border"
        style={{ borderColor: "#E8E6DF", background: "#FFFFFF" }}
      />
    </div>
  );
}

function Step2({ balance, setBalance }: { balance: string; setBalance: (v: string) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold" style={{ color: "#111111" }}>받은 마쉬멜로</h2>
        <p className="text-sm mt-1" style={{ color: "#6B6B6B" }}>
          마쉬멜로 받는 날까지 쓸 수 있는 금액이에요
        </p>
      </div>
      <div
        className="text-[36px] font-extrabold text-right py-4"
        style={{ color: balance ? "#111111" : "#BBBBBB" }}
      >
        {balance ? formatMarshmallow(parseInt(balance, 10)) : "0개"}
      </div>
      <NumberPad value={balance} onChange={setBalance} />
    </div>
  );
}

function Step3({ payday, setPayday, daysLeft }: {
  payday: string; setPayday: (v: string) => void; daysLeft: number | null;
}) {
  const minDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold" style={{ color: "#111111" }}>마쉬멜로 받는 날</h2>
        <p className="text-sm mt-1" style={{ color: "#6B6B6B" }}>언제 다음 마쉬멜로를 받아요?</p>
      </div>
      <input
        type="date"
        value={payday}
        min={minDate}
        onChange={(e) => setPayday(e.target.value)}
        className="w-full h-14 px-4 rounded-xl text-base outline-none border"
        style={{ borderColor: "#E8E6DF", background: "#FFFFFF", color: "#111111" }}
      />
      {daysLeft !== null && daysLeft > 0 && (
        <div className="rounded-xl px-4 py-3 text-center" style={{ background: "#F0EEE8" }}>
          <span className="text-sm font-bold" style={{ color: "#111111" }}>
            D-{daysLeft} · {daysLeft}일 동안 관리해요
          </span>
        </div>
      )}
    </div>
  );
}

function Step4({ hasFixed, setHasFixed, fixedExp, setFixedExp }: {
  hasFixed: boolean | null; setHasFixed: (v: boolean) => void;
  fixedExp: string; setFixedExp: (v: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold" style={{ color: "#111111" }}>고정 지출</h2>
        <p className="text-sm mt-1" style={{ color: "#6B6B6B" }}>매달 자동이체되는 금액이 있나요?</p>
      </div>
      <p className="text-xs" style={{ color: "#6B6B6B" }}>이 금액은 봉지에서 미리 빠져요</p>
      <div className="flex gap-3">
        {[false, true].map((v) => (
          <button
            key={String(v)}
            onClick={() => setHasFixed(v)}
            className="flex-1 h-14 rounded-xl text-base font-bold btn-press border"
            style={{
              background: hasFixed === v ? "#111111" : "#FFFFFF",
              color: hasFixed === v ? "#FFFFFF" : "#6B6B6B",
              borderColor: hasFixed === v ? "#111111" : "#E8E6DF",
            }}
          >
            {v ? "있어요" : "없어요"}
          </button>
        ))}
      </div>
      {hasFixed && (
        <>
          <div
            className="text-[36px] font-extrabold text-right py-4"
            style={{ color: fixedExp ? "#111111" : "#BBBBBB" }}
          >
            {fixedExp ? formatMarshmallow(parseInt(fixedExp, 10)) : "0개"}
          </div>
          <NumberPad value={fixedExp} onChange={setFixedExp} />
        </>
      )}
    </div>
  );
}

export default function SetupPage() {
  return (
    <Suspense>
      <SetupForm />
    </Suspense>
  );
}
