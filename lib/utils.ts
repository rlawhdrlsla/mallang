function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function today(): string {
  return localDateStr(new Date());
}

export function yesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return localDateStr(d);
}

export function formatDate(date: string): string {
  const d = new Date(date + "T00:00:00");
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export function formatDateShort(date: string): string {
  const d = new Date(date + "T00:00:00");
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export function formatKRW(amount: number): string {
  return amount.toLocaleString("ko-KR");
}

export function formatMarshmallow(amount: number): string {
  if (amount <= 0) return "0개";
  const abs = Math.abs(amount);

  if (abs >= 100000000) {
    const eok = Math.floor(abs / 100000000);
    const man = Math.floor((abs % 100000000) / 10000);
    return man > 0 ? `${eok}억 ${man}만개` : `${eok}억개`;
  }
  if (abs >= 10000) {
    const man = Math.floor(abs / 10000);
    const rem = abs % 10000;
    if (rem === 0) return `${man}만개`;
    const cheon = Math.floor(rem / 1000);
    if (cheon > 0 && rem % 1000 === 0) return `${man}만 ${cheon}천개`;
    return `${man}만 ${rem.toLocaleString("ko-KR")}개`;
  }
  if (abs >= 1000) {
    const cheon = Math.floor(abs / 1000);
    const rem = abs % 1000;
    if (rem === 0) return `${cheon}천개`;
    return `${abs.toLocaleString("ko-KR")}개`;
  }
  return `${abs}개`;
}

export function diffDays(from: string, to: string): number {
  const a = new Date(from + "T00:00:00").getTime();
  const b = new Date(to + "T00:00:00").getTime();
  return Math.round((b - a) / 86400000);
}

/** from 이상 to 미만 날짜 배열 (to 포함) */
export function dateRange(from: string, to: string): string[] {
  const dates: string[] = [];
  const cur = new Date(from + "T00:00:00");
  const end = new Date(to + "T00:00:00");
  while (cur <= end) {
    dates.push(localDateStr(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

export function getDayOfWeek(date: string): string {
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return days[new Date(date + "T00:00:00").getDay()];
}

export function getYearMonth(date: string): string {
  const d = new Date(date + "T00:00:00");
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
}

export function generateId(): string {
  return crypto.randomUUID();
}

export const CATEGORY_LABELS: Record<string, string> = {
  food: "식비",
  transport: "교통",
  shopping: "쇼핑",
  etc: "기타",
};

export const CATEGORY_COLORS: Record<string, string> = {
  food: "#FF6B35",
  transport: "#00B493",
  shopping: "#6366f1",
  etc: "#888888",
};
