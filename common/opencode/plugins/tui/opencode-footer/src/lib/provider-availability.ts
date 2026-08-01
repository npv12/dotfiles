import type { QuotaProviderContext } from "./entries.js";
import {
  getQuotaProviderRuntimeIds,
  type CanonicalQuotaProviderId,
} from "./provider-metadata.js";

export async function isAnyProviderIdAvailable(params: {
  ctx: Pick<QuotaProviderContext, "client">;
  candidateIds: readonly string[];
  fallbackOnError: boolean;
}): Promise<boolean> {
  const { ctx, candidateIds, fallbackOnError } = params;

  try {
    const resp = await ctx.client.config.providers();
    const ids = new Set((resp.data?.providers ?? []).map((p) => p.id));
    return candidateIds.some((id) => ids.has(id));
  } catch {
    return fallbackOnError;
  }
}

export async function isCanonicalProviderAvailable(params: {
  ctx: Pick<QuotaProviderContext, "client">;
  providerId: CanonicalQuotaProviderId;
  fallbackOnError: boolean;
}): Promise<boolean> {
  const { ctx, providerId, fallbackOnError } = params;
  return isAnyProviderIdAvailable({
    ctx,
    candidateIds: getQuotaProviderRuntimeIds(providerId),
    fallbackOnError,
  });
}
