import { describe, expect, it } from "vitest";

import {
  getCompactStatusText,
  getSidebarPanelLines,
  shouldRenderCompactStatus,
  shouldRenderSidebarPanel,
  type CompactStatusState,
  type SidebarPanelState,
} from "../src/lib/tui-panel-state.js";

describe("tui panel state helpers", () => {
  it("shows a loading placeholder before the first sidebar load resolves", () => {
    const panel: SidebarPanelState = {
      status: "loading",
      lines: [],
    };

    expect(shouldRenderSidebarPanel(panel)).toBe(true);
    expect(getSidebarPanelLines(panel)).toEqual(["Loading…"]);
  });

  it("shows an unavailable placeholder after a ready load with no rows", () => {
    const panel: SidebarPanelState = {
      status: "ready",
      lines: [],
    };

    expect(shouldRenderSidebarPanel(panel)).toBe(true);
    expect(getSidebarPanelLines(panel)).toEqual(["Unavailable"]);
  });

  it("hides the sidebar panel completely when quota is disabled", () => {
    const panel: SidebarPanelState = {
      status: "disabled",
      lines: [],
    };

    expect(shouldRenderSidebarPanel(panel)).toBe(false);
    expect(getSidebarPanelLines(panel)).toEqual([]);
  });

  it("shows a quota loading compact placeholder before compact status resolves", () => {
    const panel: CompactStatusState = {
      status: "loading",
    };

    expect(shouldRenderCompactStatus(panel)).toBe(true);
    expect(getCompactStatusText(panel)).toBe("Quota loading…");
  });

  it("uses a non-empty loading compact text override", () => {
    const panel: CompactStatusState = {
      status: "loading",
      text: "Waiting for current model",
    };

    expect(shouldRenderCompactStatus(panel)).toBe(true);
    expect(getCompactStatusText(panel)).toBe("Waiting for current model");
  });

  it("renders nothing for ready compact status with empty text", () => {
    const panel: CompactStatusState = {
      status: "ready",
      text: "",
    };

    expect(shouldRenderCompactStatus(panel)).toBe(true);
    expect(getCompactStatusText(panel)).toBe("");
  });

  it("returns compact status text as one sanitized line", () => {
    const panel: CompactStatusState = {
      status: "ready",
      text: "Copilot\u001b[31m\n  82%",
    };

    expect(shouldRenderCompactStatus(panel)).toBe(true);
    expect(getCompactStatusText(panel)).toBe("Copilot 82%");
  });

  it("hides compact status completely when quota is disabled", () => {
    const panel: CompactStatusState = {
      status: "disabled",
      text: "Copilot 82%",
    };

    expect(shouldRenderCompactStatus(panel)).toBe(false);
    expect(getCompactStatusText(panel)).toBe("");
  });
});
