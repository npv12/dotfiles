import { test } from "node:test"
import assert from "node:assert/strict"
import {
  extractTimestamps,
  parseContentByTimestamp,
} from "./timestampParser.ts"
import {
  checkLineLimit,
  validateAction,
  validateContent,
  validateTarget,
  validateTimestamp,
} from "./validation.ts"

test("extractTimestamps finds date and datetime markers", () => {
  const content = [
    "<!-- 2026-07-31 -->",
    "First entry",
    "",
    "<!-- 2026-07-31 14:05:09 -->",
    "Second entry",
  ].join("\n")
  assert.deepEqual(extractTimestamps(content), [
    "2026-07-31",
    "2026-07-31 14:05:09",
  ])
})

test("extractTimestamps returns empty for plain content", () => {
  assert.deepEqual(extractTimestamps("no markers here"), [])
})

test("parseContentByTimestamp splits entries by marker", () => {
  const content = [
    "<!-- 2026-07-31 -->",
    "First entry",
    "",
    "<!-- 2026-08-01 09:00:00 -->",
    "Second entry",
  ].join("\n")
  const entries = parseContentByTimestamp(content)
  assert.equal(entries.length, 2)
  assert.equal(entries[0].timestamp, "2026-07-31")
  assert.equal(entries[0].content, "First entry")
  assert.equal(entries[1].timestamp, "2026-08-01 09:00:00")
  assert.equal(entries[1].content, "Second entry")
})

test("validateTarget and validateAction reject unknown values", () => {
  assert.doesNotThrow(() => validateTarget("daily"))
  assert.doesNotThrow(() => validateAction("search"))
  assert.throws(() => validateTarget("bogus"), /Invalid target/)
  assert.throws(() => validateAction("bogus"), /Invalid action/)
})

test("validateContent enforces non-empty and size limits", () => {
  assert.doesNotThrow(() => validateContent("some content"))
  assert.throws(() => validateContent(""), /non-empty/)
  assert.throws(
    () => validateContent("x".repeat(100 * 1024 + 1)),
    /exceeds/
  )
})

test("validateTimestamp accepts date and datetime, rejects others", () => {
  assert.doesNotThrow(() => validateTimestamp("2026-07-31"))
  assert.doesNotThrow(() => validateTimestamp("2026-07-31 14:05:09"))
  assert.throws(() => validateTimestamp("07/31/2026"), /Invalid timestamp/)
  assert.throws(() => validateTimestamp("2026-7-31"), /Invalid timestamp/)
})

test("checkLineLimit only applies to MEMORY.md", () => {
  const manyLines = Array.from({ length: 2000 }, () => "line").join("\n")
  assert.throws(
    () => checkLineLimit("/mem/MEMORY.md", manyLines),
    /line limit/
  )
  assert.doesNotThrow(() =>
    checkLineLimit("/mem/daily/2026-08-01.md", manyLines)
  )
  assert.doesNotThrow(() => checkLineLimit("/mem/IDENTITY.md", manyLines))
})
