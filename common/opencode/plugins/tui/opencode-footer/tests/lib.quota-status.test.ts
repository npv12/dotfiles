import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildProviderStatusReport,
  buildQuotaStatusReportForTest,
  makeProviderAvailability,
} from "./helpers/quota-status-test-harness.js";

const fsPromiseMocks = vi.hoisted(() => ({
  stat: vi.fn(async () => {
    throw new Error("missing");
  }),
}));

const pricingMocks = vi.hoisted(() => ({
  getPricingSnapshotSource: vi.fn(() => "bundled"),
}));

const openaiMocks = vi.hoisted(() => ({
  resolveOpenAIOAuth: vi.fn(() => ({ state: "none" as const })),
}));

const openCodeGoMocks = vi.hoisted(() => ({
  getOpenCodeGoConfigDiagnostics: vi.fn(async () => ({
    state: "none" as const,
    source: null,
    missing: null,
    error: null,
    checkedPaths: [],
  })),
  resolveOpenCodeGoConfigCached: vi.fn(async () => ({ state: "none" as const })),
  queryOpenCodeGoQuota: vi.fn(async () => null),
}));

vi.mock("fs/promises", () => ({
  stat: fsPromiseMocks.stat,
}));

vi.mock("../src/lib/opencode-auth.js", () => ({
  getAuthPath: () => "/tmp/auth.json",
  getAuthPaths: () => ["/tmp/auth.json"],
  readAuthFileCached: vi.fn(async () => ({})),
}));

vi.mock("../src/lib/opencode-runtime-paths.js", () => ({
  getOpencodeRuntimeDirs: () => ({
    dataDir: "/tmp/data",
    configDir: "/tmp/config",
    cacheDir: "/tmp/cache",
    stateDir: "/tmp/state",
  }),
  getOpencodeRuntimeDirCandidates: () => ({
    configDirs: ["/tmp/config"],
  }),
}));

vi.mock("../src/lib/opencode-go-config.js", () => ({
  getOpenCodeGoConfigDiagnostics: openCodeGoMocks.getOpenCodeGoConfigDiagnostics,
  resolveOpenCodeGoConfigCached: openCodeGoMocks.resolveOpenCodeGoConfigCached,
  DEFAULT_OPENCODE_GO_CONFIG_CACHE_MAX_AGE_MS: 30_000,
}));

vi.mock("../src/lib/opencode-go.js", () => ({
  queryOpenCodeGoQuota: openCodeGoMocks.queryOpenCodeGoQuota,
}));

vi.mock("../src/lib/openai.js", () => ({
  resolveOpenAIOAuth: openaiMocks.resolveOpenAIOAuth,
}));

vi.mock("../src/lib/version.js", () => ({
  getPackageVersion: vi.fn(async () => "1.2.3"),
}));

vi.mock("../src/lib/opencode-storage.js", () => ({
  getOpenCodeDbPath: () => "/tmp/opencode.db",
  getOpenCodeDbPathCandidates: () => ["/tmp/opencode.db"],
  getOpenCodeDbStats: vi.fn(async () => ({
    sessionCount: 0,
    messageCount: 0,
    assistantMessageCount: 0,
  })),
}));

vi.mock("../src/lib/quota-stats.js", () => ({
  aggregateUsage: vi.fn(async () => ({
    byModel: [],
    unknown: [],
    unpriced: [],
    bySourceProvider: [],
    totals: {
      unpriced: { input: 0, output: 0, reasoning: 0, cache_read: 0, cache_write: 0 },
      unknown: { input: 0, output: 0, reasoning: 0, cache_read: 0, cache_write: 0 },
    },
  })),
}));

describe("buildQuotaStatusReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reports OpenCode Go rolling, weekly, and monthly live usage when configured", async () => {
    openCodeGoMocks.getOpenCodeGoConfigDiagnostics.mockResolvedValueOnce({
      state: "configured",
      source: "env",
      missing: null,
      error: null,
      checkedPaths: ["env:OPENCODE_GO_WORKSPACE_ID", "env:OPENCODE_GO_AUTH_COOKIE"],
    });
    openCodeGoMocks.resolveOpenCodeGoConfigCached.mockResolvedValueOnce({
      state: "configured",
      source: "env",
      config: { workspaceId: "ws-123", authCookie: "cookie-abc" },
    });
    openCodeGoMocks.queryOpenCodeGoQuota.mockResolvedValueOnce({
      success: true,
      rolling: {
        usagePercent: 7,
        percentRemaining: 93,
        resetInSec: 18000,
        resetTimeIso: "2026-03-12T17:45:00.000Z",
      },
      weekly: {
        usagePercent: 22,
        percentRemaining: 78,
        resetInSec: 540000,
        resetTimeIso: "2026-03-18T18:45:00.000Z",
      },
      monthly: {
        usagePercent: 64,
        percentRemaining: 36,
        resetInSec: 2480000,
        resetTimeIso: "2026-04-10T05:38:20.000Z",
      },
    });

    const report = await buildQuotaStatusReportForTest({
      enabledProviders: ["opencode-go"],
      providerAvailability: [makeProviderAvailability("opencode-go")],
    });

    expect(report).toContain("opencode_go:");
    expect(report).toContain("- config_state: configured");
    expect(report).toContain("- config_source: env");
    expect(report).toContain("- selected_windows: rolling,weekly,monthly");
    expect(report).toContain(
      "- rolling_usage: percent_used=7 percent_remaining=93 reset_in_sec=18000 reset_at=2026-03-12T17:45:00.000Z",
    );
    expect(report).toContain(
      "- weekly_usage: percent_used=22 percent_remaining=78 reset_in_sec=540000 reset_at=2026-03-18T18:45:00.000Z",
    );
    expect(report).toContain(
      "- monthly_usage: percent_used=64 percent_remaining=36 reset_in_sec=2480000 reset_at=2026-04-10T05:38:20.000Z",
    );
    expect(openCodeGoMocks.resolveOpenCodeGoConfigCached).toHaveBeenCalledWith({ maxAgeMs: 30_000 });
    expect(openCodeGoMocks.queryOpenCodeGoQuota).toHaveBeenCalledWith("ws-123", "cookie-abc");
  });

  it("reports available OpenCode Go live usage without failing when a default window is absent", async () => {
    openCodeGoMocks.getOpenCodeGoConfigDiagnostics.mockResolvedValueOnce({
      state: "configured",
      source: "env",
      missing: null,
      error: null,
      checkedPaths: ["env:OPENCODE_GO_WORKSPACE_ID", "env:OPENCODE_GO_AUTH_COOKIE"],
    });
    openCodeGoMocks.resolveOpenCodeGoConfigCached.mockResolvedValueOnce({
      state: "configured",
      source: "env",
      config: { workspaceId: "ws-123", authCookie: "cookie-abc" },
    });
    openCodeGoMocks.queryOpenCodeGoQuota.mockResolvedValueOnce({
      success: true,
      rolling: {
        usagePercent: 7,
        percentRemaining: 93,
        resetInSec: 18000,
        resetTimeIso: "2026-03-12T17:45:00.000Z",
      },
      weekly: {
        usagePercent: 22,
        percentRemaining: 78,
        resetInSec: 540000,
        resetTimeIso: "2026-03-18T18:45:00.000Z",
      },
    });

    const report = await buildQuotaStatusReportForTest({
      enabledProviders: ["opencode-go"],
      providerAvailability: [makeProviderAvailability("opencode-go")],
    });

    expect(report).toContain("- selected_windows: rolling,weekly,monthly");
    expect(report).toContain(
      "- rolling_usage: percent_used=7 percent_remaining=93 reset_in_sec=18000 reset_at=2026-03-12T17:45:00.000Z",
    );
    expect(report).toContain(
      "- weekly_usage: percent_used=22 percent_remaining=78 reset_in_sec=540000 reset_at=2026-03-18T18:45:00.000Z",
    );
    expect(report).not.toContain("- monthly_usage:");
    expect(report).not.toContain("- live_fetch_error:");
  });

  it("does not report an OpenCode Go status error when a reordered full selection is missing a window", async () => {
    openCodeGoMocks.getOpenCodeGoConfigDiagnostics.mockResolvedValueOnce({
      state: "configured",
      source: "env",
      missing: null,
      error: null,
      checkedPaths: ["env:OPENCODE_GO_WORKSPACE_ID", "env:OPENCODE_GO_AUTH_COOKIE"],
    });
    openCodeGoMocks.resolveOpenCodeGoConfigCached.mockResolvedValueOnce({
      state: "configured",
      source: "env",
      config: { workspaceId: "ws-123", authCookie: "cookie-abc" },
    });
    openCodeGoMocks.queryOpenCodeGoQuota.mockResolvedValueOnce({
      success: true,
      rolling: {
        usagePercent: 7,
        percentRemaining: 93,
        resetInSec: 18000,
        resetTimeIso: "2026-03-12T17:45:00.000Z",
      },
      monthly: {
        usagePercent: 64,
        percentRemaining: 36,
        resetInSec: 2480000,
        resetTimeIso: "2026-04-10T05:38:20.000Z",
      },
    });

    const report = await buildQuotaStatusReportForTest({
      enabledProviders: ["opencode-go"],
      providerAvailability: [makeProviderAvailability("opencode-go")],
      opencodeGoWindows: ["weekly", "monthly", "rolling"],
    });

    expect(report).toContain("- selected_windows: weekly,monthly,rolling");
    expect(report).toContain(
      "- rolling_usage: percent_used=7 percent_remaining=93 reset_in_sec=18000 reset_at=2026-03-12T17:45:00.000Z",
    );
    expect(report).toContain(
      "- monthly_usage: percent_used=64 percent_remaining=36 reset_in_sec=2480000 reset_at=2026-04-10T05:38:20.000Z",
    );
    expect(report).not.toContain("- live_fetch_error:");
  });

  it("reports a clear OpenCode Go status error when a selected window is absent", async () => {
    openCodeGoMocks.getOpenCodeGoConfigDiagnostics.mockResolvedValueOnce({
      state: "configured",
      source: "env",
      missing: null,
      error: null,
      checkedPaths: ["env:OPENCODE_GO_WORKSPACE_ID", "env:OPENCODE_GO_AUTH_COOKIE"],
    });
    openCodeGoMocks.resolveOpenCodeGoConfigCached.mockResolvedValueOnce({
      state: "configured",
      source: "env",
      config: { workspaceId: "ws-123", authCookie: "cookie-abc" },
    });
    openCodeGoMocks.queryOpenCodeGoQuota.mockResolvedValueOnce({
      success: true,
      rolling: {
        usagePercent: 7,
        percentRemaining: 93,
        resetInSec: 18000,
        resetTimeIso: "2026-03-12T17:45:00.000Z",
      },
      monthly: {
        usagePercent: 64,
        percentRemaining: 36,
        resetInSec: 2480000,
        resetTimeIso: "2026-04-10T05:38:20.000Z",
      },
    });

    const report = await buildQuotaStatusReportForTest({
      enabledProviders: ["opencode-go"],
      providerAvailability: [makeProviderAvailability("opencode-go")],
      opencodeGoWindows: ["weekly"],
    });

    expect(report).toContain("- selected_windows: weekly");
    expect(report).toContain(
      "- rolling_usage: percent_used=7 percent_remaining=93 reset_in_sec=18000 reset_at=2026-03-12T17:45:00.000Z",
    );
    expect(report).toContain("- live_fetch_error: Selected OpenCode Go dashboard window(s) missing: weekly (weeklyUsage)");
  });

  it("reports OpenCode Go invalid config details without attempting a live fetch", async () => {
    openCodeGoMocks.getOpenCodeGoConfigDiagnostics.mockResolvedValueOnce({
      state: "invalid",
      source: "/tmp/config/opencode-quota/opencode-go.json",
      missing: null,
      error: "Config file must contain a JSON object",
      checkedPaths: ["/tmp/config/opencode-quota/opencode-go.json"],
    });

    const report = await buildQuotaStatusReportForTest({
      enabledProviders: ["opencode-go"],
      providerAvailability: [makeProviderAvailability("opencode-go")],
    });

    expect(report).toContain("opencode_go:");
    expect(report).toContain("- config_state: invalid");
    expect(report).toContain("- config_source: /tmp/config/opencode-quota/opencode-go.json");
    expect(report).toContain("- config_error: Config file must contain a JSON object");
    expect(report).toContain("- config_checked_paths: /tmp/config/opencode-quota/opencode-go.json");
    expect(openCodeGoMocks.resolveOpenCodeGoConfigCached).not.toHaveBeenCalled();
    expect(openCodeGoMocks.queryOpenCodeGoQuota).not.toHaveBeenCalled();
  });

  it("renders OpenAI auth diagnostics from auth.json", async () => {
    openaiMocks.resolveOpenAIOAuth.mockReturnValueOnce({
      state: "configured",
      sourceKey: "chatgpt.com",
      expiresAt: Date.now() + 60_000,
      email: "alice@example.com",
      accountId: "acc_123",
    });

    const report = await buildProviderStatusReport("openai");

    expect(report).toContain("openai:");
    expect(report).toContain("- auth_configured: true");
    expect(report).toContain("- auth_source: chatgpt.com");
    expect(report).toContain("- token_status: valid");
    expect(report).toContain("- account_email: alice@example.com");
    expect(report).toContain("- account_id: acc_123");
  });

  it("locks the /quota_status section layout for the trimmed provider set", async () => {
    const report = await buildProviderStatusReport("opencode-go", { configSource: "defaults" });

    const [heading, blank, ...body] = report.split("\n");
    expect(heading).toMatch(
      /^# Quota Status \(opencode-quota v1\.2\.3\) \(\/quota_status\) \d{2}:\d{2} \d{2}\/\d{2}\/\d{4}$/,
    );
    expect(blank).toBe("");

    const excerpt = body.slice(0, 30).join("\n");
    expect(excerpt).toMatchInlineSnapshot(`
      "toast:
      - configSource: defaults
      - configPaths: (none)
      - precedence: built-in defaults only
      - global_config_paths: (none)
      - workspace_config_paths: (none)
      - setting_sources: (none)
      - enabledProviders: opencode-go
      - onlyCurrentModel: false
      - currentModel: (unknown)
      - providers:
        - opencode-go: enabled available

      paths:
      - opencode_dirs: data=/tmp/data config=/tmp/config cache=/tmp/cache state=/tmp/state
      - auth.json: preferred=/tmp/auth.json present=(none) candidates=/tmp/auth.json

      openai:
      - auth_configured: false
      - auth_source: (none)
      - token_status: (none)
      - token_expires_at: (none)
      - account_email: (none)
      - account_id: (none)

      opencode_go:
      - config_state: none
      - config_source: (none)
      - config_checked_paths: (none)
      - selected_windows: rolling,weekly,monthly"
    `);

    const titles = report
      .split("\n")
      .filter((line) => /^[a-z0-9_]+:$/u.test(line))
      .join("\n");
    expect(titles).toMatchInlineSnapshot(`
      "toast:
      paths:
      openai:
      opencode_go:
      storage:
      pricing_snapshot:
      supported_providers_pricing:
      unpriced_models:
      unknown_pricing:"
    `);
  });
});
