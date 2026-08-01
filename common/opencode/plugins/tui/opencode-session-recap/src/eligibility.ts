/** Automatic recap cadence: one recap every 5 minutes while new user turns
 *  have arrived since the previous recap. The RECAP_INTERVAL_MS env var
 *  overrides it (milliseconds) for testing. */
export const AUTO_RECAP_INTERVAL_MS = 5 * 60 * 1_000
export const AUTO_RECAP_MIN_USER_TURNS = 3

/** Per-attempt cap for a recap generation; a timeout counts as a failed
 *  round, which cools down until the next interval. */
export const RECAP_TIMEOUT_MS = 20 * 1_000

/** The model recaps are pinned to (RECAP_MODEL_ID env override), served via
 *  the stateless generate.text route so recaps stay cheap even when the
 *  session itself runs a costlier model. */
export const RECAP_MODEL_ID_DEFAULT = "deepseek-v4-flash"

export type ModelRef = { providerID: string; id: string; variant?: string }

export function recapIntervalMs(env: NodeJS.ProcessEnv = process.env): number {
  const raw = Number(env.RECAP_INTERVAL_MS)
  return Number.isFinite(raw) && raw > 0 ? raw : AUTO_RECAP_INTERVAL_MS
}

export function recapTimeoutMs(env: NodeJS.ProcessEnv = process.env): number {
  const raw = Number(env.RECAP_TIMEOUT_MS)
  return Number.isFinite(raw) && raw > 0 ? raw : RECAP_TIMEOUT_MS
}

export function recapModelId(env: NodeJS.ProcessEnv = process.env): string {
  const id = env.RECAP_MODEL_ID?.trim()
  return id ? id : RECAP_MODEL_ID_DEFAULT
}

/** Resolve the pinned model to one provider: the session's own provider when
 *  it already serves the model (proven working), else the first location
 *  provider that serves it. No fallback chain: an unavailable model is a
 *  failed round that cools down. */
export function resolveRecapModel(input: {
  sessionModel?: ModelRef
  models: readonly ModelRef[]
  id: string
}): ModelRef | undefined {
  if (input.sessionModel?.id === input.id) {
    return { providerID: input.sessionModel.providerID, id: input.sessionModel.id }
  }
  const match = input.models.find((model) => model.id === input.id)
  return match ? { providerID: match.providerID, id: match.id } : undefined
}

/** A session qualifies for an automatic recap when it has enough user turns
 *  and the latest turn postdates the previous automatic recap. */
export function automaticRecapEligible(input: {
  userIDs: readonly string[]
  lastAutomaticUserID?: string
}): boolean {
  const latest = input.userIDs.at(-1)
  return (
    input.userIDs.length >= AUTO_RECAP_MIN_USER_TURNS &&
    latest !== undefined &&
    latest !== input.lastAutomaticUserID
  )
}
