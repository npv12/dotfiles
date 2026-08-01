import { test } from "node:test"
import assert from "node:assert/strict"
import {
  AUTO_RECAP_INTERVAL_MS,
  AUTO_RECAP_MIN_USER_TURNS,
  automaticRecapEligible,
  recapIntervalMs,
} from "./eligibility.ts"

test("requires at least three user turns", () => {
  assert.equal(automaticRecapEligible({ userIDs: [] }), false)
  assert.equal(automaticRecapEligible({ userIDs: ["one"] }), false)
  assert.equal(automaticRecapEligible({ userIDs: ["one", "two"] }), false)
  assert.equal(
    automaticRecapEligible({ userIDs: ["one", "two", "three"] }),
    true,
  )
})

test("requires activity after the previous automatic recap", () => {
  assert.equal(
    automaticRecapEligible({
      userIDs: ["one", "two", "three"],
      lastAutomaticUserID: "three",
    }),
    false,
  )
  assert.equal(
    automaticRecapEligible({
      userIDs: ["one", "two", "three", "four"],
      lastAutomaticUserID: "three",
    }),
    true,
  )
})

test("default interval is five minutes", () => {
  assert.equal(AUTO_RECAP_INTERVAL_MS, 5 * 60 * 1_000)
  assert.equal(AUTO_RECAP_MIN_USER_TURNS, 3)
  assert.equal(recapIntervalMs({}), AUTO_RECAP_INTERVAL_MS)
})

test("RECAP_INTERVAL_MS env var overrides the interval", () => {
  assert.equal(recapIntervalMs({ RECAP_INTERVAL_MS: "20000" }), 20_000)
  assert.equal(recapIntervalMs({ RECAP_INTERVAL_MS: "0" }), AUTO_RECAP_INTERVAL_MS)
  assert.equal(recapIntervalMs({ RECAP_INTERVAL_MS: "-5" }), AUTO_RECAP_INTERVAL_MS)
  assert.equal(recapIntervalMs({ RECAP_INTERVAL_MS: "abc" }), AUTO_RECAP_INTERVAL_MS)
})
