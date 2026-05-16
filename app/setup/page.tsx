"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { NumberPad } from "@/components/ui/NumberPad";
import { formatKRW, today, diffDays } from "@/lib/utils";
import { Gender, MissingDayPolicy } from "@/lib/types";
import { useAppStore } from "@/store/app-store";
import { Suspense } from "react";

const TOTAL_STEPS = 4;

function SetupForm() {
  const searchParams = useSearchParams();
  const carryoverAmount = parseInt(searchParams.get("carryover") ?? "0", 10);
  const isNewCycle = carryoverAmount > 0;

  const [step, setStep] = useState(isNewCycle ? 2 : 1); // 새 사이클이면 잔액부터
  const [nickname, setNickname] = useState("");
  const [gender, setGender] = useState<Gender | null>(null);
  const [balance, setBalance] = useState("");
  const [payday, setPayday] = useState("");
  const [hasFixed, setHasFixed] = useState<boolean | null>(null);
  const [fixedExp, setFixedExp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const { setProfile, setCycle } = useAppStore();

  const todayStr = today();
  const daysLeft = payday ? diffDays(todayStr, payday) : null;

  async function handleComplete() {
    if (submitting) return;
    setSubmitting(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSubmitting(false); return; }

    const fixed = hasFixed && fixedExp ? parseInt(fixedExp, 10) : 0;

    // 이전 사이클 절약액 이월 여부 체크
    const { data: prevCycle } = await supabase
      .from("cycles")
      .select("id")
      .eq("user_id", user.id)
      .not("ended_at", "is", null)
      .order("ended_at", { ascending: false })
      .limit(1)
      .single();

    // 프로필 upsert
    const { data: profile } = await supabase
      .from("profiles")
      .upsert({ id: user.id, nickname, gender, missing_day_policy: "full" as MissingDayPolicy })
      .select()
      .single();

    // 새 사이클
    const { data: cycle } = await supabase
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

    if (profile) setProfile(profile);
    if (cycle) setCycle(cycle);
    router.push("/");
  }

  function next() { if (step < TOTAL_STEPS) setStep(step + 1); else handleComplete(); }
  function prev() { if (step > 1) setStep(step - 1); }

  const canNext = (
    (step === 1 && nickname.trim() && gender) ||
    (step === 2 && balance && parseInt(balance) > 0) ||
    (step === 3 && payday && daysLeft !== null && daysLeft > 0) ||
    (step === 4 && (hasFixed === false || (hasFixed === true && fixedExp)))
  );

  return (
    <div className="min-h-screen flex flex-col px-5 pt-12 pb-8 page-fade">
      {/* 스텝 인디케이터 */}
      <div className="flex gap-2 mb-10">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full transition-colors duration-300"
            style={{ background: i < step ? "#FF6B35" : "#EEEEEE" }}
          />
        ))}
      </div>

      <div className="flex-1">
        {step === 1 && (
          <Step1
            nickname={nickname} setNickname={setNickname}
            gender={gender} setGender={setGender}
          />
        )}
        {step === 2 && (
          <Step2 balance={balance} setBalance={setBalance} />
        )}
        {step === 3 && (
          <Step3 payday={payday} setPayday={setPayday} daysLeft={daysLeft} />
        )}
        {step === 4 && (
          <Step4
            hasFixed={hasFixed} setHasFixed={setHasFixed}
            fixedExp={fixedExp} setFixedExp={setFixedExp}
          />
        )}
      </div>

      <div className="flex gap-3 mt-8">
        {step > 1 && (
          <button
            onClick={prev}
            className="h-[54px] px-6 rounded-xl text-base font-bold btn-press"
            style={{ background: "#F7F7F8", color: "#191919" }}
          >
            이전
          </button>
        )}
        <button
          onClick={next}
          disabled={!canNext}
          className="flex-1 h-[54px] rounded-xl text-base font-bold text-white btn-press"
          style={{ background: canNext ? "#FF6B35" : "#BBBBBB" }}
        >
          {step === TOTAL_STEPS ? (submitting ? "설정 중..." : "시작하기") : "다음"}
        </button>
      </div>
    </div>
  );
}

function Step1({ nickname, setNickname, gender, setGender }: {
  nickname: string; setNickname: (v: string) => void;
  gender: Gender | null; setGender: (g: Gender) => void;
}) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold" style={{ color: "#191919" }}>반가워요!</h2>
        <p className="text-sm mt-1" style={{ color: "#888888" }}>이름이 뭐예요?</p>
      </div>
      <input
        type="text"
        placeholder="닉네임을 입력하세요"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        maxLength={10}
        className="w-full h-14 px-4 rounded-xl text-base outline-none border"
        style={{ borderColor: "#EEEEEE", background: "#FFFFFF" }}
      />
      <div>
        <p className="text-sm font-semibold mb-3" style={{ color: "#191919" }}>성별</p>
        <div className="flex gap-3">
          {(["male", "female"] as Gender[]).map((g) => (
            <button
              key={g}
              onClick={() => setGender(g)}
              className="flex-1 h-14 rounded-xl text-base font-bold btn-press border"
              style={{
                background: gender === g ? "#191919" : "#FFFFFF",
                color: gender === g ? "#FFFFFF" : "#888888",
                borderColor: gender === g ? "#191919" : "#EEEEEE",
              }}
            >
              {g === "male" ? "남성" : "여성"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Step2({ balance, setBalance }: { balance: string; setBalance: (v: string) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold" style={{ color: "#191919" }}>현재 잔액</h2>
        <p className="text-sm mt-1" style={{ color: "#888888" }}>
          다음 월급까지 쓸 수 있는 돈을 입력하세요
        </p>
      </div>
      <div
        className="text-[36px] font-extrabold tabular-nums text-right py-4"
        style={{ color: balance ? "#191919" : "#BBBBBB" }}
      >
        ₩ {balance ? formatKRW(parseInt(balance, 10)) : "0"}
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
    return d.toISOString().slice(0, 10);
  })();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold" style={{ color: "#191919" }}>다음 월급일</h2>
        <p className="text-sm mt-1" style={{ color: "#888888" }}>
          언제 월급이 들어오나요?
        </p>
      </div>
      <input
        type="date"
        value={payday}
        min={minDate}
        onChange={(e) => setPayday(e.target.value)}
        className="w-full h-14 px-4 rounded-xl text-base outline-none border"
        style={{ borderColor: "#EEEEEE", background: "#FFFFFF", color: "#191919" }}
      />
      {daysLeft !== null && daysLeft > 0 && (
        <div
          className="rounded-xl px-4 py-3 text-center"
          style={{ background: "#FFF0EB" }}
        >
          <span className="text-sm font-bold" style={{ color: "#FF6B35" }}>
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
        <h2 className="text-2xl font-bold" style={{ color: "#191919" }}>고정 지출</h2>
        <p className="text-sm mt-1" style={{ color: "#888888" }}>
          매달 자동이체되는 금액이 있나요?
        </p>
      </div>
      <p className="text-xs" style={{ color: "#888888" }}>
        해당 금액은 예산에서 먼저 제외됩니다
      </p>
      <div className="flex gap-3">
        {[false, true].map((v) => (
          <button
            key={String(v)}
            onClick={() => setHasFixed(v)}
            className="flex-1 h-14 rounded-xl text-base font-bold btn-press border"
            style={{
              background: hasFixed === v ? "#191919" : "#FFFFFF",
              color: hasFixed === v ? "#FFFFFF" : "#888888",
              borderColor: hasFixed === v ? "#191919" : "#EEEEEE",
            }}
          >
            {v ? "있어요" : "없어요"}
          </button>
        ))}
      </div>
      {hasFixed && (
        <>
          <div
            className="text-[36px] font-extrabold tabular-nums text-right py-4"
            style={{ color: fixedExp ? "#191919" : "#BBBBBB" }}
          >
            ₩ {fixedExp ? formatKRW(parseInt(fixedExp, 10)) : "0"}
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
