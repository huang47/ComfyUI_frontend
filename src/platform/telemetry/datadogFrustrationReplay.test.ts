import { describe, expect, it } from 'vitest'

import {
  createReplayTriggerState,
  evaluateReplayTrigger,
  hasFrustrationSignal,
  isCriticalResourceFailure,
  replayTriggerReasonForRumEvent,
  shouldTriggerReplayOnRumEvent
} from './datadogFrustrationReplay'

describe('datadogFrustrationReplay', () => {
  it('detects frustration signals on actions', () => {
    expect(
      hasFrustrationSignal({
        type: 'action',
        action: { frustration: { type: 'rage_click' } }
      })
    ).toBe(true)
    expect(
      hasFrustrationSignal({
        type: 'action',
        action: { frustration: { type: 'dead_click' } }
      })
    ).toBe(true)
    expect(hasFrustrationSignal({ type: 'action' })).toBe(false)
  })

  it('detects critical resource failures', () => {
    expect(
      isCriticalResourceFailure({
        type: 'resource',
        resource: { status_code: 404 }
      })
    ).toBe(true)
    expect(
      isCriticalResourceFailure({
        type: 'resource',
        resource: { status_code: 500 }
      })
    ).toBe(true)
    expect(
      isCriticalResourceFailure({
        type: 'resource',
        resource: { status_code: 200 }
      })
    ).toBe(false)
    expect(isCriticalResourceFailure({ type: 'view' })).toBe(false)
  })

  it('triggers replay on frustration, errors, and critical resources', () => {
    expect(
      shouldTriggerReplayOnRumEvent({
        type: 'action',
        action: { frustration: { type: 'error_click' } }
      })
    ).toBe(true)
    expect(shouldTriggerReplayOnRumEvent({ type: 'error' })).toBe(true)
    expect(
      shouldTriggerReplayOnRumEvent({
        type: 'resource',
        resource: { status_code: 503 }
      })
    ).toBe(true)
    expect(shouldTriggerReplayOnRumEvent({ type: 'view' })).toBe(false)
  })

  it('starts replay only once per session', () => {
    const frustrationEvent = {
      type: 'action' as const,
      action: { frustration: { type: 'rage_click' as const } }
    }
    const first = evaluateReplayTrigger(
      frustrationEvent,
      createReplayTriggerState()
    )
    expect(first.shouldStart).toBe(true)
    expect(first.state.started).toBe(true)

    const second = evaluateReplayTrigger(frustrationEvent, first.state)
    expect(second.shouldStart).toBe(false)
    expect(second.state.started).toBe(true)
  })

  it('maps trigger reasons for rum events', () => {
    expect(
      replayTriggerReasonForRumEvent({
        type: 'action',
        action: { frustration: { type: 'dead_click' } }
      })
    ).toBe('frustration')
    expect(replayTriggerReasonForRumEvent({ type: 'error' })).toBe('error')
    expect(
      replayTriggerReasonForRumEvent({
        type: 'resource',
        resource: { status_code: 401 }
      })
    ).toBe('critical_resource')
    expect(replayTriggerReasonForRumEvent({ type: 'view' })).toBe(null)
  })
})
