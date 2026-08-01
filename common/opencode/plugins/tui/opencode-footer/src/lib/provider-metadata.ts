export type CanonicalQuotaProviderId = "openai" | "opencode-go" | "hyper";

export type QuotaProviderAutoSetup = "yes" | "usually" | "manual_env_config" | "needs_quick_setup";

export type QuotaProviderAuthentication =
  | "opencode_auth_oauth_token"
  | "opencode_auth_api_key"
  | "companion_auth_oauth_token"
  | "local_cli_auth"
  | "github_oauth_or_pat"
  | "external_api_key"
  | "state_only";

export type QuotaProviderAuthFallback = "env_api_key" | "global_opencode_config";

export type QuotaProviderQuotaSource =
  | "remote_api"
  | "local_estimation"
  | "local_runtime_accounting"
  | "local_cli_report";

export interface QuotaProviderShape {
  id: CanonicalQuotaProviderId;
  autoSetup: QuotaProviderAutoSetup;
  authentication: QuotaProviderAuthentication;
  authFallbacks?: QuotaProviderAuthFallback[];
  quota: QuotaProviderQuotaSource;
  quickSetupAnchor?: string;
  notes?: string;
}

export type QuotaProviderRuntimeIds = Readonly<Record<CanonicalQuotaProviderId, readonly string[]>>;

export const QUOTA_PROVIDER_LABELS: Readonly<Record<string, string>> = {
  openai: "OpenAI",
  "opencode-go": "OpenCode Go",
  hyper: "Charm Hyper",
};

export const QUOTA_PROVIDER_ID_SYNONYMS: Readonly<Record<string, string>> = {
  "opencode-go-subscription": "opencode-go",
  chatgpt: "openai",
  codex: "openai",
};

export const QUOTA_PROVIDER_RUNTIME_IDS: QuotaProviderRuntimeIds = {
  openai: ["openai", "chatgpt", "codex"],
  "opencode-go": ["opencode-go"],
  hyper: ["hyper"],
};

const LIVE_LOCAL_USAGE_PROVIDER_ID_SET = new Set<string>([]);

export const QUOTA_PROVIDER_SHAPES: readonly QuotaProviderShape[] = [
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
];

const QUOTA_PROVIDER_SHAPES_BY_ID: Readonly<
  Partial<Record<CanonicalQuotaProviderId, QuotaProviderShape>>
> = Object.fromEntries(QUOTA_PROVIDER_SHAPES.map((shape) => [shape.id, shape]));

export function normalizeQuotaProviderId(id: string): string {
  const normalized = id.trim().toLowerCase();
  return QUOTA_PROVIDER_ID_SYNONYMS[normalized] ?? normalized;
}

export function getQuotaProviderShape(id: string): QuotaProviderShape | undefined {
  const normalized = normalizeQuotaProviderId(id) as CanonicalQuotaProviderId;
  return QUOTA_PROVIDER_SHAPES_BY_ID[normalized];
}

export function getQuotaProviderDisplayLabel(id: string): string {
  const normalized = normalizeQuotaProviderId(id);
  return QUOTA_PROVIDER_LABELS[normalized] ?? id;
}

export function getQuotaProviderRuntimeIds(id: string): readonly string[] {
  const shape = getQuotaProviderShape(id);
  if (!shape) {
    return [];
  }

  return [...new Set(QUOTA_PROVIDER_RUNTIME_IDS[shape.id])];
}

export function isLiveLocalUsageProviderId(id: string): boolean {
  return LIVE_LOCAL_USAGE_PROVIDER_ID_SET.has(normalizeQuotaProviderId(id));
}
