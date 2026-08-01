import { expect } from "vitest";

import type { QuotaProviderResult } from "../../src/lib/entries.js";

export function expectNotAttempted(out: QuotaProviderResult): void {
  expect(out.attempted).toBe(false);
  expect(out.entries).toEqual([]);
  expect(out.errors).toEqual([]);
}

export function expectAttemptedWithNoErrors(out: QuotaProviderResult): void {
  expect(out.attempted).toBe(true);
  expect(out.errors).toEqual([]);
}

export function expectAttemptedWithErrorLabel(out: QuotaProviderResult, label: string): void {
  expect(out.attempted).toBe(true);
  expect(out.entries).toEqual([]);
  expect(out.errors[0]?.label).toBe(label);
}
