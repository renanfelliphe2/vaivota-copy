import { describe, expect, it } from "vitest";
import { hashMock } from "./hash";

describe("hashMock", () => {
  it("é repetível e tem 64 hex", () => {
    const h = hashMock("K7M3QX9P");
    expect(h).toBe(hashMock("K7M3QX9P"));
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it("muda com a entrada", () => {
    expect(hashMock("K7M3QX9P")).not.toBe(hashMock("K7M3QX9Q"));
  });
});
