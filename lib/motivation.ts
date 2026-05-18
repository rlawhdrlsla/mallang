import { formatMarshmallow } from "./utils";

export interface MotivationContext {
  todaySpent: number;
  todayBudget: number;
  remainingBalance: number;
  remainingDays: number;
  daysToPayday: number;
  hour: number;
}

export function getMotivationMessage(ctx: MotivationContext): string {
  const { todaySpent, todayBudget, daysToPayday, hour, remainingBalance, remainingDays } = ctx;
  const todaySaved = todayBudget - todaySpent;

  // 1: 오늘 아직 안 먹음 + 밤
  if (todaySpent === 0 && hour >= 22)
    return "오늘 하나도 안 먹었네요! 정말 잘했어요 🌙";

  // 2: 오늘 할당 초과
  if (todaySpent > todayBudget)
    return `오늘은 봉지가 좀 헤펐네요 😅 내일은 같이 참아봐요`;

  // 3: 오늘 아직 안 먹음 (낮)
  if (todaySpent === 0)
    return "오늘 아직 하나도 안 먹었어요 👏 이대로 가봐요!";

  // 4: 월급일 D-3 이내
  if (daysToPayday <= 3 && daysToPayday > 0)
    return `마쉬멜로 받는 날까지 ${daysToPayday}일! 마지막 스퍼트 🔥`;

  // 5: 충동 시간대 (점심/저녁) + 오늘 아직 여유 있음
  if (todaySaved > 0 && ((hour >= 11 && hour <= 13) || (hour >= 17 && hour <= 19)))
    return `오늘 ${formatMarshmallow(todaySaved)} 더 먹을 수 있어요`;

  // 6: 오늘 할당의 절반 이하 먹음
  if (todayBudget > 0 && todaySpent < todayBudget * 0.5)
    return "오늘 마쉬멜로 많이 아꼈네요! 🍥";

  // 7: 봉지 잔량 기준 응원
  if (remainingDays > 0 && remainingBalance > 0)
    return `봉지에 ${formatMarshmallow(remainingBalance)} 남았어요`;

  return "오늘도 말랑이와 함께해요 🍥";
}
