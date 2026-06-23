export function classifyExtensionLoadError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  if (message.includes('Failed to fetch dynamically imported module'))
    return 'module_fetch_failed'
  if (message.includes('Failed to load the script')) return 'script_load_failed'
  if (message.includes('already registered')) return 'already_registered'
  return 'unknown'
}
