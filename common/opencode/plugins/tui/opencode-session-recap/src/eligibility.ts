/** Automatic recap cadence: one recap every 5 minutes while the session is
 *  idle and new user turns have arrived since the previous recap. The
 *  RECAP_INTERVAL_MS env var overrides it (milliseconds) for testing. */
export const AUTO_RECAP_INTERVAL_MS = 60 * 1_000
export const AUTO_RECAP_MIN_USER_TURNS = 3

export function recapIntervalMs(env: NodeJS.ProcessEnv = process.env): number {
  const raw = Number(env.RECAP_INTERVAL_MS)
  return Number.isFinite(raw) && raw > 0 ? raw : AUTO_RECAP_INTERVAL_MS
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
