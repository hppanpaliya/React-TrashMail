import { describe, it, expect } from "vitest";
import { extractOtp } from "./otp";

describe("extractOtp", () => {
  it("finds a code before sentence punctuation", () => {
    expect(extractOtp("Your Acme verification code is 482913. It expires in 10 minutes.")).toBe("482913");
  });

  it("finds a keyword-adjacent code across subject and body", () => {
    expect(extractOtp(["Your verification code", "Use 55012 to sign in"])).toBe("55012");
  });

  it("ignores decimal amounts and digit groups", () => {
    expect(extractOtp("Order total: $1234.56 for 2 items")).toBeNull();
    expect(extractOtp("Call 555-0142-9917 today")).toBeNull();
  });

  it("skips bare years without a keyword", () => {
    expect(extractOtp("See you at the 2026 summit")).toBeNull();
  });

  it("requireKeyword suppresses bare numbers", () => {
    expect(extractOtp("Receipt #10482 — thanks for your order", { requireKeyword: true })).toBeNull();
    expect(extractOtp("Receipt #10482 — thanks for your order")).toBe("10482");
    expect(extractOtp("Your code: 776301", { requireKeyword: true })).toBe("776301");
  });

  it("handles empty and non-string input", () => {
    expect(extractOtp("")).toBeNull();
    expect(extractOtp([null, undefined, 42])).toBeNull();
  });
});
