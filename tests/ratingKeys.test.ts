import { describe, expect, it } from "vitest";
import {
  RATING_KEY_MAP,
  ratingFromKey,
} from "../src/features/learning/ratingKeys";

describe("rating key mapping", () => {
  it("maps 1=认识(good), 2=模糊(hard), 3=忘记(again)", () => {
    expect(RATING_KEY_MAP).toEqual({
      "1": "good",
      "2": "hard",
      "3": "again",
    });
  });

  it("returns the product rating for the three digit keys", () => {
    expect(ratingFromKey("1")).toBe("good");
    expect(ratingFromKey("2")).toBe("hard");
    expect(ratingFromKey("3")).toBe("again");
  });

  it("returns undefined for any other key", () => {
    expect(ratingFromKey("4")).toBeUndefined();
    expect(ratingFromKey("0")).toBeUndefined();
    expect(ratingFromKey(" ")).toBeUndefined();
    expect(ratingFromKey("p")).toBeUndefined();
    expect(ratingFromKey("Enter")).toBeUndefined();
    expect(ratingFromKey("")).toBeUndefined();
  });
});
