import { createProviderApiKeyResolver } from "./api-key-resolver.js";

export interface HyperApiKeyResult {
  key: string;
  source: HyperKeySource;
}

const ALLOWED_HYPER_ENV_VARS = ["HYPER_API_KEY"] as const;

export type HyperKeySource =
  | "env:HYPER_API_KEY"
  | "opencode.json"
  | "opencode.jsonc"
  | "auth.json";

const hyperApiKeyResolver = createProviderApiKeyResolver<HyperKeySource>({
  envVars: [{ name: "HYPER_API_KEY", source: "env:HYPER_API_KEY" }],
  providerKeys: ["hyper"],
  allowedEnvVars: ALLOWED_HYPER_ENV_VARS,
  configJsonSource: "opencode.json",
  configJsoncSource: "opencode.jsonc",
  auth: {
    readAuth: async () => null,
    authSource: "auth.json",
  },
});

export async function resolveHyperApiKey(): Promise<HyperApiKeyResult | null> {
  return hyperApiKeyResolver.resolve();
}

export async function hasHyperApiKey(): Promise<boolean> {
  return hyperApiKeyResolver.has();
}

export async function getHyperKeyDiagnostics(): Promise<{
  configured: boolean;
  source: HyperKeySource | null;
  checkedPaths: string[];
}> {
  return hyperApiKeyResolver.diagnostics();
}
