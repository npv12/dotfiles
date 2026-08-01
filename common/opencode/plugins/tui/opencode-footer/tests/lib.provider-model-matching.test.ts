import { describe, expect, it } from "vitest";

import {
  modelIncludesAny,
  modelProviderIncludesAny,
  modelProviderMatchesRuntimeId,
  parseProviderModelRef,
  providerIdIncludesAny,
} from "../src/lib/provider-model-matching.js";

describe("provider model matching helpers", () => {
  it("parses and lowercases provider/model refs", () => {
    expect(parseProviderModelRef("OpenCode-Go/DeepSeek-V4")).toEqual({
      lower: "opencode-go/deepseek-v4",
      providerId: "opencode-go",
      modelId: "deepseek-v4",
    });
  });

  it("handles model ids without a slash", () => {
    expect(parseProviderModelRef("HYPER")).toEqual({
      lower: "hyper",
      providerId: "hyper",
      modelId: "",
    });
  });

  it("does not trim whitespace before parsing", () => {
    expect(parseProviderModelRef(" hyper/deepseek")).toEqual({
      lower: " hyper/deepseek",
      providerId: " hyper",
      modelId: "deepseek",
    });
    expect(modelProviderMatchesRuntimeId(" hyper/deepseek", "hyper")).toBe(false);
  });

  it("matches canonical runtime ids for provider prefixes", () => {
    expect(modelProviderMatchesRuntimeId("opencode-go/deepseek-v4", "opencode-go")).toBe(true);
    expect(modelProviderMatchesRuntimeId("hyper/deepseek-v4", "hyper")).toBe(true);
    expect(modelProviderMatchesRuntimeId("openai/gpt-4.1", "opencode-go")).toBe(false);
  });

  it("supports provider prefix fragment checks", () => {
    expect(providerIdIncludesAny("opencode-go", ["opencode-go", "hyper"])).
      toBe(true);
    expect(modelProviderIncludesAny("opencode-go/deepseek", ["opencode"]))
      .toBe(true);
    expect(modelProviderIncludesAny("openai/gpt-4.1", ["opencode"]))
      .toBe(false);
  });

  it("supports full-model substring checks", () => {
    expect(modelIncludesAny("opencode-go/deepseek-v4", ["deepseek", "hyper"]))
      .toBe(true);
    expect(modelIncludesAny("openai/gpt-4.1", ["deepseek", "claude"]))
      .toBe(false);
  });
});
