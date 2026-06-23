import { datadogRum } from '@datadog/browser-rum'

import {
  createReplayTriggerState,
  evaluateReplayTrigger
} from './datadogFrustrationReplay'
import type {
  ReplayTriggerReason,
  RumBeforeSendEvent
} from './datadogFrustrationReplay'
import { registerClientErrorReplayTrigger } from './sessionReplayTrigger'

const IS_CLOUD_BUILD = __DISTRIBUTION__ === 'cloud'
const IS_REPLAY_TEST_MODE = import.meta.env.VITE_DD_RUM_REPLAY_TEST === '1'
const DEFAULT_REPLAY_BASELINE_SAMPLE_RATE = 10

let replayTriggerState = createReplayTriggerState()
let replayConfigured = false

function getRumCredentials(): {
  applicationId: string
  clientToken: string
  site: string
} | null {
  const applicationId = import.meta.env.VITE_DATADOG_RUM_APPLICATION_ID
  const clientToken = import.meta.env.VITE_DATADOG_RUM_CLIENT_TOKEN
  if (!applicationId || !clientToken) return null
  return {
    applicationId,
    clientToken,
    site: import.meta.env.VITE_DATADOG_RUM_SITE ?? 'us5.datadoghq.com'
  }
}

function handleBeforeSendEvent(event: RumBeforeSendEvent): void {
  const result = evaluateReplayTrigger(event, replayTriggerState)
  replayTriggerState = result.state
  if (!result.shouldStart) return

  const reason =
    event.type === 'error'
      ? 'error'
      : event.action?.frustration?.type
        ? 'frustration'
        : 'critical_resource'
  if (!replayConfigured) return
  datadogRum.startSessionReplayRecording({ force: true })
  datadogRum.addAction('session_replay_triggered', { reason })
}

function triggerSessionReplayForClientError(
  reason: Extract<ReplayTriggerReason, 'client_error'>
): void {
  if (!replayConfigured || replayTriggerState.started) return
  replayTriggerState = { started: true }
  datadogRum.startSessionReplayRecording({ force: true })
  datadogRum.addAction('session_replay_triggered', { reason })
}

function hasExistingInitConfiguration(): boolean {
  try {
    return Boolean(datadogRum.getInitConfiguration())
  } catch {
    return false
  }
}

export async function initDatadogRum(): Promise<void> {
  if (!IS_CLOUD_BUILD) return
  if (replayConfigured) return

  if (hasExistingInitConfiguration()) {
    replayConfigured = true
    registerClientErrorReplayTrigger(() => {
      triggerSessionReplayForClientError('client_error')
    })
    return
  }

  const credentials = getRumCredentials()
  if (!credentials) return

  const sessionReplaySampleRate = IS_REPLAY_TEST_MODE
    ? 100
    : DEFAULT_REPLAY_BASELINE_SAMPLE_RATE

  datadogRum.init({
    applicationId: credentials.applicationId,
    clientToken: credentials.clientToken,
    site: credentials.site,
    service: 'comfy-cloud-frontend',
    env: import.meta.env.MODE,
    version: __COMFYUI_FRONTEND_VERSION__,
    sessionSampleRate: 100,
    sessionReplaySampleRate,
    startSessionReplayRecordingManually: true,
    trackUserInteractions: true,
    trackResources: true,
    trackLongTasks: true,
    defaultPrivacyLevel: 'mask-user-input',
    silentMultipleInit: true,
    beforeSend: (event) => {
      handleBeforeSendEvent(event as RumBeforeSendEvent)
      return true
    }
  })

  replayConfigured = true
  registerClientErrorReplayTrigger(() => {
    triggerSessionReplayForClientError('client_error')
  })

  if (IS_REPLAY_TEST_MODE) {
    datadogRum.startSessionReplayRecording()
  }
}
