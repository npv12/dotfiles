/**
 * OpenCode Quota — server plugin entry (opencode2 Promise-plugin API).
 *
 * Module shape { id, setup }: the next-16664 runtime loads external plugins
 * with this shape and rejects the v1 { id, server } format.
 */

import type { PluginContext } from "./context.js";
import { QuotaToastPlugin } from "./plugin.js";

const pluginModule = {
  id: "npv12.opencode-quota",
  setup: async (ctx: PluginContext): Promise<void> => {
    await QuotaToastPlugin(ctx);
  },
};

export default pluginModule;

export { QuotaToastPlugin, createQuotaClientAdapter, createQuotaStatusTool } from "./plugin.js";
export type { QuotaToastConfig } from "./lib/types.js";
