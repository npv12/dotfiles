import { describe, expect, it, vi } from "vitest";

vi.mock("../src/lib/status-report.js", () => ({
  buildQuotaStatusReportFromRuntime: vi.fn(async () => "QUOTA-REPORT-CONTENT"),
}));

import { QuotaToastPlugin, createQuotaStatusTool } from "../src/plugin.js";
import { buildQuotaStatusReportFromRuntime } from "../src/lib/status-report.js";
import type { PluginContext, ToolInfo } from "../src/context.js";

function makeToolContext(overrides: Record<string, unknown> = {}) {
  return {
    sessionID: "ses_test",
    agent: "build",
    messageID: "msg_1",
    callID: "call_1",
    progress: vi.fn(),
    ...overrides,
  };
}

function makePluginContext(overrides: Record<string, unknown> = {}) {
  return {
    options: {},
    app: { name: "opencode", version: "0.0.0-next-16664", channel: "next" },
    tool: { transform: vi.fn(async () => ({ dispose: vi.fn() })) },
    session: {
      get: vi.fn(async () => ({ id: "ses_test", model: { providerID: "opencode-go", id: "deepseek-v4-flash" } })),
      synthetic: vi.fn(async () => ({})),
    },
    event: { subscribe: vi.fn() },
    ...overrides,
  } as unknown as PluginContext;
}

describe("server plugin surface", () => {
  it("registers the quota_status tool on setup", async () => {
    const ctx = makePluginContext();
    await QuotaToastPlugin(ctx);

    expect(ctx.tool.transform).toHaveBeenCalledTimes(1);
    const draft = { add: vi.fn() };
    const transformCallback = (ctx.tool.transform as ReturnType<typeof vi.fn>).mock.calls[0][0] as (
      d: typeof draft,
    ) => void;
    transformCallback(draft);
    expect(draft.add).toHaveBeenCalledTimes(1);

    const tool = draft.add.mock.calls[0][0] as ToolInfo;
    expect(tool.name).toBe("quota_status");
    expect(tool.options?.codemode).toBe(false);
    expect(tool.input).toEqual({ type: "object", properties: {}, additionalProperties: false });
  });

  it("injects the report as a synthetic message and returns empty content", async () => {
    const synthetic = vi.fn(async () => ({}));
    const ctx = makePluginContext({ session: { ...makePluginContext().session, synthetic } });
    const { DEFAULT_CONFIG } = await import("../src/lib/types.js");
    const state = {
      config: { ...DEFAULT_CONFIG, enabled: true },
      configMeta: {},
      configLoaded: true,
      configInFlight: null,
    } as never;
    const tool = createQuotaStatusTool(ctx, state);

    const result = await tool.execute({}, makeToolContext());

    expect(buildQuotaStatusReportFromRuntime).toHaveBeenCalled();
    expect(synthetic).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionID: "ses_test",
        text: "QUOTA-REPORT-CONTENT",
        description: "quota_status",
      }),
    );
    expect(result).toEqual({ content: "" });
  });
});
