type FrustrationSignalType = 'rage_click' | 'dead_click' | 'error_click'

type RumBeforeSendEventType =
  | 'action'
  | 'error'
  | 'resource'
  | 'view'
  | 'long_task'
  | 'vital'

export interface RumBeforeSendEvent {
  type: RumBeforeSendEventType
  action?: {
    frustration?: {
      type?: FrustrationSignalType
    }
  }
  resource?: {
    status_code?: number
    url?: string
  }
}

export interface ReplayTriggerState {
  started: boolean
}

export function createReplayTriggerState(): ReplayTriggerState {
  return { started: false }
}

export function hasFrustrationSignal(event: RumBeforeSendEvent): boolean {
  return Boolean(event.action?.frustration?.type)
}

export function isCriticalResourceFailure(event: RumBeforeSendEvent): boolean {
  if (event.type !== 'resource') return false
  const statusCode = event.resource?.status_code
  if (statusCode === undefined) return false
  return statusCode >= 400
}

export function shouldTriggerReplayOnRumEvent(
  event: RumBeforeSendEvent
): boolean {
  if (event.type === 'error') return true
  if (hasFrustrationSignal(event)) return true
  if (isCriticalResourceFailure(event)) return true
  return false
}

export function evaluateReplayTrigger(
  event: RumBeforeSendEvent,
  state: ReplayTriggerState
): { shouldStart: boolean; state: ReplayTriggerState } {
  if (state.started) {
    return { shouldStart: false, state }
  }
  if (!shouldTriggerReplayOnRumEvent(event)) {
    return { shouldStart: false, state }
  }
  return { shouldStart: true, state: { started: true } }
}

export type ReplayTriggerReason =
  | 'frustration'
  | 'error'
  | 'critical_resource'
  | 'client_error'

export function replayTriggerReasonForRumEvent(
  event: RumBeforeSendEvent
): ReplayTriggerReason | null {
  if (hasFrustrationSignal(event)) return 'frustration'
  if (event.type === 'error') return 'error'
  if (isCriticalResourceFailure(event)) return 'critical_resource'
  return null
}
