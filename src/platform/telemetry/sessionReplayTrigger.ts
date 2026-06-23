type ClientErrorReplayTrigger = () => void

let triggerClientErrorReplay: ClientErrorReplayTrigger | null = null

export function registerClientErrorReplayTrigger(
  trigger: ClientErrorReplayTrigger
): void {
  triggerClientErrorReplay = trigger
}

export function requestClientErrorReplay(): void {
  triggerClientErrorReplay?.()
}
