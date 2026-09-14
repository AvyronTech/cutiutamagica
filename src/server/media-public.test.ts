import { describe, expect, it } from "vitest";
import { parseMediaRangeHeader } from "./media-public";

describe("parseMediaRangeHeader", () => {
  it("normalizes a bounded range", () => {
    expect(parseMediaRangeHeader("bytes=10-29", 100)).toEqual({
      start: 10,
      end: 29,
      length: 20,
    });
  });

  it("normalizes suffix ranges", () => {
    expect(parseMediaRangeHeader("bytes=-25", 100)).toEqual({
      start: 75,
      end: 99,
      length: 25,
    });
  });

  it("normalizes open-ended and oversized ranges", () => {
    expect(parseMediaRangeHeader("bytes=90-", 100)).toEqual({
      start: 90,
      end: 99,
      length: 10,
    });
    expect(parseMediaRangeHeader("bytes=90-999", 100)).toEqual({
      start: 90,
      end: 99,
      length: 10,
    });
  });

  it("rejects malformed, multiple and unsatisfiable ranges", () => {
    expect(parseMediaRangeHeader(null, 100)).toBeNull();
    expect(parseMediaRangeHeader("bytes=0-1,4-5", 100)).toBeNull();
    expect(parseMediaRangeHeader("bytes=100-101", 100)).toBeNull();
    expect(parseMediaRangeHeader("bytes=-0", 100)).toBeNull();
  });
});
