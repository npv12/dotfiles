import { test } from "node:test"
import assert from "node:assert/strict"
import {
  AUTO_RECAP_INTERVAL_MS,
  AUTO_RECAP_MIN_USER_TURNS,
  RECAP_MODEL_ID_DEFAULT,
  RECAP_TIMEOUT_MS,
  automaticRecapEligible,
  recapIntervalMs,
  recapModelId,
  recapTimeoutMs,
  resolveRecapModel,
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

test("default timeout is twenty seconds", () => {
  assert.equal(RECAP_TIMEOUT_MS, 20 * 1_000)
  assert.equal(recapTimeoutMs({}), RECAP_TIMEOUT_MS)
})

test("RECAP_TIMEOUT_MS env var overrides the timeout", () => {
  assert.equal(recapTimeoutMs({ RECAP_TIMEOUT_MS: "5000" }), 5_000)
  assert.equal(recapTimeoutMs({ RECAP_TIMEOUT_MS: "0" }), RECAP_TIMEOUT_MS)
  assert.equal(recapTimeoutMs({ RECAP_TIMEOUT_MS: "-5" }), RECAP_TIMEOUT_MS)
  assert.equal(recapTimeoutMs({ RECAP_TIMEOUT_MS: "abc" }), RECAP_TIMEOUT_MS)
})

test("recap model defaults to deepseek-v4-flash", () => {
  assert.equal(RECAP_MODEL_ID_DEFAULT, "deepseek-v4-flash")
  assert.equal(recapModelId({}), RECAP_MODEL_ID_DEFAULT)
})

test("RECAP_MODEL_ID env var overrides the model", () => {
  assert.equal(recapModelId({ RECAP_MODEL_ID: "deepseek-v4-pro" }), "deepseek-v4-pro")
  assert.equal(recapModelId({ RECAP_MODEL_ID: "  deepseek-v4-pro  " }), "deepseek-v4-pro")
  assert.equal(recapModelId({ RECAP_MODEL_ID: " " }), RECAP_MODEL_ID_DEFAULT)
  assert.equal(recapModelId({ RECAP_MODEL_ID: "" }), RECAP_MODEL_ID_DEFAULT)
})

test("resolves the pinned model to the session's own provider first", () => {
  const models = [
    { providerID: "hyper", id: "deepseek-v4-flash" },
    { providerID: "opencode-go", id: "deepseek-v4-flash" },
  ]
  assert.deepEqual(
    resolveRecapModel({
      sessionModel: { providerID: "opencode-go", id: "deepseek-v4-flash" },
      models,
      id: "deepseek-v4-flash",
    }),
    { providerID: "opencode-go", id: "deepseek-v4-flash" },
  )
})

test("falls back to the first location provider serving the model", () => {
  const models = [
    { providerID: "hyper", id: "deepseek-v4-flash" },
    { providerID: "opencode-go", id: "deepseek-v4-flash" },
  ]
  assert.deepEqual(
    resolveRecapModel({ sessionModel: undefined, models, id: "deepseek-v4-flash" }),
    { providerID: "hyper", id: "deepseek-v4-flash" },
  )
  assert.deepEqual(
    resolveRecapModel({
      sessionModel: { providerID: "opencode-go", id: "other-model" },
      models,
      id: "deepseek-v4-flash",
    }),
    { providerID: "hyper", id: "deepseek-v4-flash" },
  )
})

test("unknown model id resolves to undefined", () => {
  const models = [{ providerID: "hyper", id: "deepseek-v4-flash" }]
  assert.equal(resolveRecapModel({ sessionModel: undefined, models, id: "nope" }), undefined)
})
