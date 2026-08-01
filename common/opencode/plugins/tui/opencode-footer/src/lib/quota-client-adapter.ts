import type { QuotaToastConfig } from "./types.js";
import { loadConfiguredProviderIds } from "./opencode-config-providers.js";

/**
 * Client adapter for the quota engine. The engine only needs two client
 * calls: config.get (SDK fallback for experimental.quotaToast — file-backed
 * config is primary) and config.providers (provider availability). opencode2
 * exposes no config client to plugins, so both are answered from the
 * on-disk opencode config, which the engine already reads natively.
 */
export function createQuotaClientAdapter(roots: {
  configRoot: string;
}): {
  config: {
    get: () => Promise<{ data?: { experimental?: { quotaToast?: Partial<QuotaToastConfig> } } }>;
    providers: () => Promise<{ data?: { providers: Array<{ id: string }> } }>;
  };
} {
  return {
    config: {
      // File-backed config is the primary source; the SDK fallback path in
      // loadConfig only triggers when no file config exists, and opencode2
      // plugins get no config client — so report "no SDK config".
      get: async () => ({ data: {} }),
      providers: async () => {
        const ids = await loadConfiguredProviderIds({ configRootDir: roots.configRoot });
        return { data: { providers: ids.map((id) => ({ id })) } };
      },
    },
  };
}
