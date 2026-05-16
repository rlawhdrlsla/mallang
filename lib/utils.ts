export function today(): string {
  return new Date().toISOString().slice(0, 10);
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
    dates.push(cur.toISOString().slice(0, 10));
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
