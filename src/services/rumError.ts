import { isCloud } from '@/platform/distribution/types'
import { requestClientErrorReplay } from '@/platform/telemetry/sessionReplayTrigger'

/**
 * Reports an error to Datadog RUM via `globalThis.reportError`, which RUM
 * captures as an unhandled error. `name` becomes `@error.type` (the high-signal
 * group-by); the original error is preserved as `cause`. Cloud builds only.
 */
export function reportRumError(
  name: string,
  message: string,
  cause: unknown
): void {
  if (!isCloud) return
  const error = new Error(message, { cause })
  error.name = name
  requestClientErrorReplay()
  globalThis.reportError(error)
}
