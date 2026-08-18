import type { Rating } from "./session";

/**
 * 键盘数字键 → 评分映射。
 * 产品约定：1 = 认识(good)、2 = 模糊(hard)、3 = 忘记(again)。
 * 数据层语义保持 again/hard/good 不变，这里只负责键盘映射。
 */
export const RATING_KEY_MAP: Record<string, Rating> = {
  "1": "good",
  "2": "hard",
  "3": "again",
};

export function ratingFromKey(key: string): Rating | undefined {
  return RATING_KEY_MAP[key];
}
