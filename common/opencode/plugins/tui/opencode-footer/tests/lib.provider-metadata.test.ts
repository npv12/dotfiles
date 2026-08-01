import { describe, expect, it } from "vitest";

import {
  QUOTA_PROVIDER_ID_SYNONYMS,
  QUOTA_PROVIDER_RUNTIME_IDS,
  QUOTA_PROVIDER_SHAPES,
  getQuotaProviderDisplayLabel,
  getQuotaProviderRuntimeIds,
  getQuotaProviderShape,
  normalizeQuotaProviderId,
} from "../src/lib/provider-metadata.js";

describe("provider-metadata", () => {
  it("defines the canonical provider setup catalog", () => {
    expect(QUOTA_PROVIDER_SHAPES).toEqual([
      {
        id: "openai",
        autoSetup: "yes",
        authentication: "opencode_auth_oauth_token",
        quota: "remote_api",
        notes: "Covers ChatGPT Plus/Pro and Codex quota via the chatgpt.com usage API",
      },
      {
        id: "opencode-go",
        autoSetup: "needs_quick_setup",
        authentication: "state_only",
        quota: "remote_api",
        quickSetupAnchor: "opencode-go-quick-setup",
        notes: "Scrapes the OpenCode Go dashboard; requires workspaceId and authCookie",
      },
      {
        id: "hyper",
        autoSetup: "manual_env_config",
        authentication: "external_api_key",
        authFallbacks: ["env_api_key", "global_opencode_config"],
        quota: "remote_api",
        notes: "Requires HYPER_API_KEY environment variable",
      },
    ]);
  });

  it("keeps canonical provider setup ids unique", () => {
    const ids = QUOTA_PROVIDER_SHAPES.map((shape) => shape.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("normalizes provider synonyms to canonical ids", () => {
    expect(normalizeQuotaProviderId("  openai  ")).toBe("openai");

    for (const [alias, canonicalId] of Object.entries(QUOTA_PROVIDER_ID_SYNONYMS)) {
      expect(normalizeQuotaProviderId(alias)).toBe(canonicalId);
    }
  });

  it("defines conservative runtime ids for provider matching", () => {
    expect(QUOTA_PROVIDER_RUNTIME_IDS.openai).toEqual(["openai", "chatgpt", "codex"]);
    expect(QUOTA_PROVIDER_RUNTIME_IDS["opencode-go"]).toEqual(["opencode-go"]);
    expect(QUOTA_PROVIDER_RUNTIME_IDS.hyper).toEqual(["hyper"]);
  });

  it("keeps runtime ids distinct from broad normalization aliases", () => {
    expect(getQuotaProviderRuntimeIds("openai")).toEqual(["openai", "chatgpt", "codex"]);
    expect(getQuotaProviderRuntimeIds("codex")).toEqual(["openai", "chatgpt", "codex"]);
    expect(getQuotaProviderRuntimeIds("opencode-go")).toEqual(["opencode-go"]);
    expect(getQuotaProviderRuntimeIds("hyper")).toEqual(["hyper"]);
    expect(getQuotaProviderRuntimeIds("not-a-provider")).toEqual([]);
  });

  it("returns provider setup metadata for canonical ids and aliases", () => {
    expect(getQuotaProviderShape("openai")).toEqual({
      id: "openai",
      autoSetup: "yes",
      authentication: "opencode_auth_oauth_token",
      quota: "remote_api",
      notes: "Covers ChatGPT Plus/Pro and Codex quota via the chatgpt.com usage API",
    });
    expect(getQuotaProviderShape("codex")).toEqual(getQuotaProviderShape("openai"));
    expect(getQuotaProviderShape("opencode-go")).toEqual({
      id: "opencode-go",
      autoSetup: "needs_quick_setup",
      authentication: "state_only",
      quota: "remote_api",
      quickSetupAnchor: "opencode-go-quick-setup",
      notes: "Scrapes the OpenCode Go dashboard; requires workspaceId and authCookie",
    });
    expect(getQuotaProviderShape("hyper")).toEqual({
      id: "hyper",
      autoSetup: "manual_env_config",
      authentication: "external_api_key",
      authFallbacks: ["env_api_key", "global_opencode_config"],
      quota: "remote_api",
      notes: "Requires HYPER_API_KEY environment variable",
    });
    expect(getQuotaProviderShape("copilot")).toBeUndefined();
  });

  it("returns display labels for known providers", () => {
    expect(getQuotaProviderDisplayLabel("openai")).toBe("OpenAI");
    expect(getQuotaProviderDisplayLabel("codex")).toBe("OpenAI");
    expect(getQuotaProviderDisplayLabel("opencode-go")).toBe("OpenCode Go");
    expect(getQuotaProviderDisplayLabel("hyper")).toBe("Charm Hyper");
    expect(getQuotaProviderDisplayLabel("unknown")).toBe("unknown");
  });
});
